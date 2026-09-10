import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Kalici, rastgele cihaz kimligi.
 *
 * Gercek bir login akisi (spec bolum 22) gelene kadar, backend kayitlari
 * bu kimlige gore sahiplendiriyor (bkz. server/src/middleware/deviceAuth.ts).
 * SecureStore'da tutuluyor cunku spec bolum 26 kimlik/oturum bilgisinin
 * Keychain/Keystore uzerinden saklanmasini istiyor - bu deger tam bir oturum
 * token'i degil ama ayni sekilde ele alinmasi dogru: uygulama silininceye
 * kadar kalici olmali ve düz metin storage'a (AsyncStorage) yazilmamali.
 *
 * Gercek auth eklendiginde bu deger yerini gercek kullanici id'sine birakacak;
 * o ana kadar bir cihazdaki veriler baska cihaza tasinmiyor.
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
