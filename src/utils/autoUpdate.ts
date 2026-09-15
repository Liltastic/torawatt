import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { useSessionStore } from '@/store/session';

/**
 * EAS Update varsayilani ("ON_LOAD"): acilista yeni surumu arka planda indirir
 * ama BIR SONRAKI acilista devreye sokar - yani kullanici "kapat-ac yaptim,
 * hala eski surum" diyor. Bu fonksiyon guncellemeyi acilista indirip HEMEN
 * yukleyerek her acilista gercekten en guncel surumu getiriyor.
 * Metro'ya bagli gelistirme modunda ve web'de expo-updates islevsiz oldugu
 * icin sessizce atlanir.
 *
 * TEK istisna aktif sarj oturumu: reloadAsync() calisan her seyi sifirlar,
 * oturum ise yalnizca bellekte duruyor (store/session.ts) ve gecmise ancak
 * COMPLETED olunca yaziliyor. Ortasinda yeniden yuklemek kullanicinin parasini
 * odedigi sarji kayitsiz yok eder. O durumda yukleme atlanir; paket zaten
 * indirilmis olur ve expo-updates bir sonraki soguk acilista devreye sokar.
 *
 * Bilerek sure siniri YOK: indirme suresine bakan bir pencere, mobil veride
 * birkac MB'lik paket icin sik sik asilir ve dosyanin var olma sebebi olan
 * "hala eski surum" semptomunu geri getirirdi.
 */
export async function checkForImmediateUpdate() {
  if (__DEV__ || Platform.OS === 'web') return;

  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;

    await Updates.fetchUpdateAsync();

    if (useSessionStore.getState().session) return;

    await Updates.reloadAsync();
  } catch {
    // Guncelleme kanali yoksa (ör. yerel tunnel/LAN ile acilmis Expo Go)
    // bu cagri hata verir; bu durumda zaten uygulanacak bir EAS guncellemesi
    // yoktur, sessizce yok sayiyoruz.
  }
}
