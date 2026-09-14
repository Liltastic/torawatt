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
 */
async function claimDeviceData(deviceId: string | undefined, userId: string) {
  if (!deviceId || deviceId === userId) return;

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
