import type { NextFunction, Request, Response } from 'express';

import { verifyAuthToken } from '../lib/jwt.js';

/**
 * Gercek kimlik dogrulama: `Authorization: Bearer <jwt>`. Token, register/login
 * sirasinda verilen imzali bir JWT'dir ve `sub` alaninda User.id tasir.
 * Asagidaki route'lar hala `req.ownerId` okuyor, bu yuzden eski cihaz-kimligi
 * doneminden kalan kod degismedi.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ownerId: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'missing_token', message: 'Oturum gerekli.' });
    return;
  }

  try {
    req.ownerId = verifyAuthToken(token);
  } catch {
    res.status(401).json({ error: 'invalid_token', message: 'Oturum gecersiz veya suresi dolmus.' });
    return;
  }

  next();
}
