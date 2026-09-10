import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db.js';
import { serializePaymentMethod } from '../lib/serialize.js';
import { requireDeviceId } from '../middleware/deviceAuth.js';

/**
 * DEMO odeme yontemleri (spec bolum 12).
 *
 * Kart numarasi kabul eden HICBIR alan yok ve olmayacak; bu router'a giren
 * her deger zaten sahte demo katalogdan geliyor (bkz. mobil src/store/payment.ts).
 * PCI saglayicisi secildiginde bu tablo saglayicinin token + maskelenmis
 * alanlarini tutacak sekilde genisleyecek, kart verisi yine buraya girmeyecek.
 */
export const paymentMethodsRouter = Router();
paymentMethodsRouter.use(requireDeviceId);

const createSchema = z.object({
  brand: z.string().trim().min(1),
  last4: z.string().length(4),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2024).max(2100),
});

paymentMethodsRouter.get('/', async (req, res) => {
  const methods = await prisma.paymentMethod.findMany({
    where: { ownerId: req.ownerId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(methods.map(serializePaymentMethod));
});

paymentMethodsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const existingCount = await prisma.paymentMethod.count({ where: { ownerId: req.ownerId } });

  const method = await prisma.paymentMethod.create({
    data: {
      ownerId: req.ownerId,
      brand: parsed.data.brand,
      last4: parsed.data.last4,
      expiryMonth: parsed.data.expiryMonth,
      expiryYear: parsed.data.expiryYear,
      isDefault: existingCount === 0,
    },
  });

  res.status(201).json(serializePaymentMethod(method));
});

paymentMethodsRouter.post('/:id/default', async (req, res) => {
  const method = await prisma.paymentMethod.findFirst({
    where: { id: req.params.id, ownerId: req.ownerId },
  });
  if (!method) {
    res.status(404).json({ error: 'not_found', message: 'Kart bulunamadı.' });
    return;
  }

  await prisma.$transaction([
    prisma.paymentMethod.updateMany({ where: { ownerId: req.ownerId }, data: { isDefault: false } }),
    prisma.paymentMethod.update({ where: { id: method.id }, data: { isDefault: true } }),
  ]);

  res.json(serializePaymentMethod({ ...method, isDefault: true }));
});

paymentMethodsRouter.delete('/:id', async (req, res) => {
  const method = await prisma.paymentMethod.findFirst({
    where: { id: req.params.id, ownerId: req.ownerId },
  });
  if (!method) {
    res.status(404).json({ error: 'not_found', message: 'Kart bulunamadı.' });
    return;
  }

  await prisma.paymentMethod.delete({ where: { id: method.id } });

  if (method.isDefault) {
    const next = await prisma.paymentMethod.findFirst({
      where: { ownerId: req.ownerId },
      orderBy: { createdAt: 'asc' },
    });
    if (next) {
      await prisma.paymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  res.status(204).send();
});
