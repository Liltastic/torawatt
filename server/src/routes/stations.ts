import { Router } from 'express';

import { prisma } from '../db.js';
import { serializeStation } from '../lib/serialize.js';

export const stationsRouter = Router();

/** Istasyonlar herkese acik; kimlik dogrulama gerektirmiyor (spec bolum 22). */
stationsRouter.get('/', async (_req, res) => {
  const stations = await prisma.station.findMany({ include: { connectors: true } });
  res.json(stations.map(serializeStation));
});

stationsRouter.get('/:id', async (req, res) => {
  const station = await prisma.station.findUnique({
    where: { id: req.params.id },
    include: { connectors: true },
  });

  if (!station) {
    res.status(404).json({ error: 'not_found', message: 'İstasyon bulunamadı.' });
    return;
  }

  res.json(serializeStation(station));
});
