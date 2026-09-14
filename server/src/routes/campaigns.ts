import { Router } from 'express';

import { prisma } from '../db.js';

/** Kampanyalar herkese acik (istasyonlar gibi) - kimlik dogrulama gerekmez. */
export const campaignsRouter = Router();

campaignsRouter.get('/', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(
    campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      discountLabel: c.discountLabel,
      validUntil: c.validUntil?.toISOString() ?? null,
    })),
  );
});
