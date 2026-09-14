import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Kalici, rastgele cihaz kimligi.
 *
 * Gercek auth eklenmeden once tum kayitlar bu kimlige gore sahiplenirdi.
 * Artik sadece register/login isteklerinde `x-device-id` olarak gonderiliyor
 * ki kullanici hesap acmadan once bu cihazda olusturdugu veriler (araclar,
 * favoriler, gecmis) yeni hesabina tasinabilsin (bkz. server/src/routes/auth.ts
 * claimDeviceData). SecureStore'da tutuluyor: uygulama silininceye kadar
 * kalici olmali ve duz metin storage'a (AsyncStorage) yazilmamali.
 */

let cached: string | undefined;
const STORAGE_KEY = 'tora-watt-device-id';

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const existing = await SecureStore.getItemAsync(STORAGE_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const created = randomUUID();
  await SecureStore.setItemAsync(STORAGE_KEY, created);
  cached = created;
  return created;
}
