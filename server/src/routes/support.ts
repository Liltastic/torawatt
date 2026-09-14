import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Destek talepleri. Henuz bir destek ekibi arayuzu yok - talepler veritabaninda
 * saklanip su an icin veritabanindan elle takip ediliyor. Ileride bir admin
 * paneli/e-posta bildirimi eklenirse, bu route degismeden kalabilir.
 */
export const supportRouter = Router();
supportRouter.use(requireAuth);

const createSchema = z.object({
  message: z.string().trim().min(10, 'Mesaj en az 10 karakter olmalı.').max(2000),
});

supportRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }

  const request = await prisma.supportRequest.create({
    data: { ownerId: req.ownerId, message: parsed.data.message },
  });

  res.status(201).json({ id: request.id, createdAt: request.createdAt.toISOString() });
});
