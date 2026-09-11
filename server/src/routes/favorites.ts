import { Router } from 'express';

import { prisma } from '../db.js';
import { requireDeviceId } from '../middleware/deviceAuth.js';

/**
 * Favori istasyonlar. Yanit yalnizca istasyon id listesi: istemci zaten
 * istasyonlarin tamamini tutuyor, ayni veriyi ikinci kez tasimak gereksiz.
 */
export const favoritesRouter = Router();
favoritesRouter.use(requireDeviceId);

favoritesRouter.get('/', async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { ownerId: req.ownerId },
    orderBy: { createdAt: 'desc' },
    select: { stationId: true },
  });
  res.json(favorites.map((f) => f.stationId));
});

// PUT idempotent: iki kez favorilemek hata degil, ayni sonuc.
favoritesRouter.put('/:stationId', async (req, res) => {
  const station = await prisma.station.findUnique({ where: { id: req.params.stationId } });
  if (!station) {
    res.status(404).json({ error: 'not_found', message: 'İstasyon bulunamadı.' });
    return;
  }

  await prisma.favorite.upsert({
    where: { ownerId_stationId: { ownerId: req.ownerId, stationId: station.id } },
    create: { ownerId: req.ownerId, stationId: station.id },
    update: {},
  });

  res.status(204).send();
});

favoritesRouter.delete('/:stationId', async (req, res) => {
  await prisma.favorite.deleteMany({
    where: { ownerId: req.ownerId, stationId: req.params.stationId },
  });
  res.status(204).send();
});
