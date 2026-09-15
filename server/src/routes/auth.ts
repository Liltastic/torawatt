import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db.js';
import { signAuthToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.'),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).optional(),
});

/**
 * Bu cihaz daha once auth'suz (x-device-id) kullanildiysa, o kimlige ait
 * kayitlari (araclar, rezervasyonlar, gecmis, favoriler, odeme yontemleri)
 * yeni User.id'ye tasir. Boylece kayit/giris kullanicinin var olan verisini
 * silmez. Eslesen kayit yoksa hicbir sey degismez.
 *
 * GUVENLIK: deviceId tamamen istemcinin soyledigi bir deger ve dogrulanamaz.
 * Bir User.id'ye esitse tasima YAPILMAZ - aksi halde saldirgan kendi
 * girisinde 'x-device-id: <kurban_user_id>' gondererek kurbanin butun
 * araclarini, rezervasyonlarini, gecmisini, favorilerini ve odeme
 * yontemlerini kendi hesabina tasiyabilirdi (updateMany oldugu icin kurban
 * ayni anda verisini de kaybederdi). Kullanici id'si bir sir degil:
 * /auth/register ve /auth/me yanitlarinda duz metin donuyor.
 */
async function claimDeviceData(deviceId: string | undefined, userId: string) {
  if (!deviceId || deviceId === userId) return;

  const impersonated = await prisma.user.findUnique({
    where: { id: deviceId },
    select: { id: true },
  });
  if (impersonated) return;

  await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { ownerId: deviceId }, data: { ownerId: userId } }),
    prisma.reservation.updateMany({ where: { ownerId: deviceId }, data: { ownerId: userId } }),
    prisma.chargingHistoryEntry.updateMany({ where: { ownerId: deviceId }, data: { ownerId: userId } }),
    prisma.favorite.updateMany({ where: { ownerId: deviceId }, data: { ownerId: userId } }),
    prisma.paymentMethod.updateMany({ where: { ownerId: deviceId }, data: { ownerId: userId } }),
  ]);
}

function serializeUser(user: { id: string; email: string; name: string | null }) {
  return { id: user.id, email: user.email, name: user.name };
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'email_taken', message: 'Bu e-posta zaten kayıtlı.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });

  await claimDeviceData(req.header('x-device-id'), user.id);

  res.status(201).json({ token: signAuthToken(user.id), user: serializeUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    res.status(401).json({ error: 'invalid_credentials', message: 'E-posta veya şifre hatalı.' });
    return;
  }

  await claimDeviceData(req.header('x-device-id'), user.id);

  res.json({ token: signAuthToken(user.id), user: serializeUser(user) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.ownerId } });
  if (!user) {
    res.status(401).json({ error: 'invalid_token', message: 'Oturum gecersiz.' });
    return;
  }
  res.json(serializeUser(user));
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const user = await prisma.user.update({ where: { id: req.ownerId }, data: parsed.data });
  res.json(serializeUser(user));
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalı.'),
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.ownerId } });
  const valid = user ? await bcrypt.compare(parsed.data.currentPassword, user.passwordHash) : false;
  if (!user || !valid) {
    // 401 degil: bu istek zaten gecerli bir oturumla yapildi (requireAuth gecti).
    // 401 kullanirsak client'taki global "oturum gecersiz -> cikis yap" mantigi
    // yanlislikla tetiklenir (bkz. src/services/api.ts setUnauthorizedHandler).
    res.status(403).json({ error: 'invalid_credentials', message: 'Mevcut şifre hatalı.' });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.status(204).send();
});

/**
 * Hesabi ve sahip oldugu her seyi (arac, rezervasyon, gecmis, favori, odeme
 * yontemi) kalici olarak siler. Geri alinamaz - client tarafinda ayri bir
 * onay adimi (Alert.alert) var.
 */
authRouter.delete('/me', requireAuth, async (req, res) => {
  const ownerId = req.ownerId;
  await prisma.$transaction([
    prisma.vehicle.deleteMany({ where: { ownerId } }),
    prisma.reservation.deleteMany({ where: { ownerId } }),
    prisma.chargingHistoryEntry.deleteMany({ where: { ownerId } }),
    prisma.favorite.deleteMany({ where: { ownerId } }),
    prisma.paymentMethod.deleteMany({ where: { ownerId } }),
    prisma.user.delete({ where: { id: ownerId } }),
  ]);
  res.status(204).send();
});
