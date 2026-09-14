import jwt from 'jsonwebtoken';

const envSecret = process.env.JWT_SECRET;
if (!envSecret) {
  throw new Error('JWT_SECRET tanimli degil (.env dosyasina ekle).');
}
const secret: string = envSecret;

// Mobil oturumlar refresh akisi olmadan uzun sureli kalsin diye 90 gun;
// suresi dolunca kullanici sadece tekrar giris yapar.
const EXPIRES_IN = '90d';

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: EXPIRES_IN });
}

export function verifyAuthToken(token: string): string {
  const payload = jwt.verify(token, secret);
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Gecersiz token payload');
  }
  return payload.sub;
}
