import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * EAS Update varsayilani ("ON_LOAD"): acilista yeni surumu arka planda indirir
 * ama BIR SONRAKI acilista devreye sokar - yani kullanici "kapat-ac yaptim,
 * hala eski surum" diyor. Bu fonksiyon guncellemeyi acilista indirip HEMEN
 * yukleyerek her acilista gercekten en guncel surumu getiriyor.
 * Metro'ya bagli gelistirme modunda ve web'de expo-updates islevsiz oldugu
 * icin sessizce atlanir.
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
    await Updates.reloadAsync();
  } catch {
    // Guncelleme kanali yoksa (ör. yerel tunnel/LAN ile acilmis Expo Go)
    // bu cagri hata verir; bu durumda zaten uygulanacak bir EAS guncellemesi
    // yoktur, sessizce yok sayiyoruz.
  }
}
