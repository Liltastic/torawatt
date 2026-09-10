import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db.js';
import { serializeReservation } from '../lib/serialize.js';
import { requireDeviceId } from '../middleware/deviceAuth.js';

export const reservationsRouter = Router();
reservationsRouter.use(requireDeviceId);

const createSchema = z.object({
  stationId: z.string().min(1),
  connectorId: z.string().min(1),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().max(24 * 60),
});

const patchSchema = z.object({
  // EXPIRED istemciden gonderilmez; saatten turetilir (bkz. lib/serialize.ts).
  status: z.enum(['CONFIRMED', 'ARRIVED', 'CANCELLED']),
});

reservationsRouter.get('/', async (req, res) => {
  const reservations = await prisma.reservation.findMany({
    where: { ownerId: req.ownerId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations.map(serializeReservation));
});

reservationsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const connector = await prisma.connector.findUnique({
    where: { id: parsed.data.connectorId },
    include: { station: true },
  });

  if (!connector || connector.stationId !== parsed.data.stationId) {
    res.status(404).json({ error: 'not_found', message: 'Soket bulunamadı.' });
    return;
  }

  // Gercek bir sistemde burada soketin baska bir rezervasyonla catisip
  // catismadigi kontrol edilir. Simdilik yalnizca soketin var oldugunu
  // dogruluyoruz; onay istemci tarafinda simule ediliyor.
  const reservation = await prisma.reservation.create({
    data: {
      ownerId: req.ownerId,
      stationId: connector.stationId,
      connectorId: connector.id,
      stationName: connector.station.name,
      connectorLabel: `${connector.type} · ${connector.powerKw} kW`,
      startsAt: new Date(parsed.data.startsAt),
      durationMinutes: parsed.data.durationMinutes,
      status: 'PENDING',
    },
  });

  res.status(201).json(serializeReservation(reservation));
});

reservationsRouter.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id: req.params.id, ownerId: req.ownerId },
  });
  if (!reservation) {
    res.status(404).json({ error: 'not_found', message: 'Rezervasyon bulunamadı.' });
    return;
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: parsed.data.status },
  });

  res.json(serializeReservation(updated));
});
