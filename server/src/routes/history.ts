import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db.js';
import { serializeHistoryEntry } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';

export const historyRouter = Router();
historyRouter.use(requireAuth);

const createSchema = z.object({
  stationId: z.string().optional(),
  stationName: z.string().min(1),
  connectorLabel: z.string().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
  energyKwh: z.number().nonnegative(),
  pricePerKwh: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

historyRouter.get('/', async (req, res) => {
  const items = await prisma.chargingHistoryEntry.findMany({
    where: { ownerId: req.ownerId },
    orderBy: { startedAt: 'desc' },
  });
  res.json(items.map(serializeHistoryEntry));
});

historyRouter.get('/:id', async (req, res) => {
  const item = await prisma.chargingHistoryEntry.findFirst({
    where: { id: req.params.id, ownerId: req.ownerId },
  });
  if (!item) {
    res.status(404).json({ error: 'not_found', message: 'Kayıt bulunamadı.' });
    return;
  }
  res.json(serializeHistoryEntry(item));
});

historyRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const entry = await prisma.chargingHistoryEntry.create({
    data: {
      ownerId: req.ownerId,
      stationId: parsed.data.stationId,
      stationName: parsed.data.stationName,
      connectorLabel: parsed.data.connectorLabel,
      startedAt: new Date(parsed.data.startedAt),
      endedAt: new Date(parsed.data.endedAt),
      durationMinutes: parsed.data.durationMinutes,
      energyKwh: parsed.data.energyKwh,
      pricePerKwh: parsed.data.pricePerKwh,
      cost: parsed.data.cost,
    },
  });

  res.status(201).json(serializeHistoryEntry(entry));
});
