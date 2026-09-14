import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db.js';
import { serializeVehicle } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

const CONNECTOR_TYPES = ['TYPE_2', 'CCS2', 'CHADEMO', 'NACS'] as const;

const createSchema = z.object({
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  modelYear: z.number().int().min(1990).max(2100),
  batteryCapacityKwh: z.number().positive(),
  maxAcKw: z.number().nonnegative(),
  maxDcKw: z.number().nonnegative(),
  connectors: z.array(z.enum(CONNECTOR_TYPES)).min(1),
  averageConsumptionKwhPer100Km: z.number().positive(),
});

vehiclesRouter.get('/', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: req.ownerId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(vehicles.map(serializeVehicle));
});

vehiclesRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const existingCount = await prisma.vehicle.count({ where: { ownerId: req.ownerId } });

  const vehicle = await prisma.vehicle.create({
    data: {
      ownerId: req.ownerId,
      make: parsed.data.make,
      model: parsed.data.model,
      modelYear: parsed.data.modelYear,
      batteryCapacityKwh: parsed.data.batteryCapacityKwh,
      maxAcKw: parsed.data.maxAcKw,
      maxDcKw: parsed.data.maxDcKw,
      connectors: JSON.stringify(parsed.data.connectors),
      averageConsumptionKwhPer100Km: parsed.data.averageConsumptionKwhPer100Km,
      // Sahibin ilk araci otomatik aktif olur; ayrica secmek zorunda kalmasin.
      isActive: existingCount === 0,
    },
  });

  res.status(201).json(serializeVehicle(vehicle));
});

vehiclesRouter.post('/:id/activate', async (req, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: req.params.id, ownerId: req.ownerId },
  });
  if (!vehicle) {
    res.status(404).json({ error: 'not_found', message: 'Araç bulunamadı.' });
    return;
  }

  await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { ownerId: req.ownerId }, data: { isActive: false } }),
    prisma.vehicle.update({ where: { id: vehicle.id }, data: { isActive: true } }),
  ]);

  res.json(serializeVehicle({ ...vehicle, isActive: true }));
});

vehiclesRouter.delete('/:id', async (req, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: req.params.id, ownerId: req.ownerId },
  });
  if (!vehicle) {
    res.status(404).json({ error: 'not_found', message: 'Araç bulunamadı.' });
    return;
  }

  await prisma.vehicle.delete({ where: { id: vehicle.id } });

  // Aktif arac silindiyse, kalan en eski araci aktif yap.
  if (vehicle.isActive) {
    const next = await prisma.vehicle.findFirst({
      where: { ownerId: req.ownerId },
      orderBy: { createdAt: 'asc' },
    });
    if (next) {
      await prisma.vehicle.update({ where: { id: next.id }, data: { isActive: true } });
    }
  }

  res.status(204).send();
});
