import type { NextFunction, Request, Response } from 'express';

/**
 * GECICI kimlik dogrulama.
 *
 * Uygulamada henuz gercek bir login akisi (spec bolum 22: /auth/register,
 * /auth/login) yok. Ta ki o gelene kadar, her mobil kurulum SecureStore'da
 * kalici rastgele bir "cihaz kimligi" tutuyor ve her istekte
 * `x-device-id` basligiyla gonderiyor. Kayitlar bu id'ye gore sahiplenilir.
 *
 * Bu GERCEK GUVENLIK DEGIL: baslik istemci tarafinda taklit edilebilir.
 * Gercek auth eklendiginde bu middleware, dogrulanmis bir JWT'den kullanici
 * id'si cikaracak sekilde degisecek; asagidaki route'lar ownerId'yi
 * req.ownerId uzerinden okudugu icin route kodlarinda degisiklik gerekmeyecek.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ownerId: string;
    }
  }
}

export function requireDeviceId(req: Request, res: Response, next: NextFunction) {
  const deviceId = req.header('x-device-id');

  if (!deviceId || deviceId.trim().length < 8) {
    res.status(401).json({
      error: 'missing_device_id',
      message: 'x-device-id başlığı gerekli (en az 8 karakter).',
    });
    return;
  }

  req.ownerId = deviceId.trim();
  next();
}
