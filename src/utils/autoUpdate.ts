import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * EAS Update varsayilani ("ON_LOAD"): acilista yeni surumu arka planda indirir
 * ama BIR SONRAKI acilista devreye sokar - yani kullanici "kapat-ac yaptim,
 * hala eski surum" hissi yasar, aslinda bir sonraki acilista gelecektir.
 * Burada indirilen guncellemeyi ayni oturumda hemen uygulayip yeniden
 * yukleyerek her acilista gercekten en guncel surumu garanti ediyoruz.
 * Metro'ya bagli gelistirme modunda ve web'de expo-updates islevsiz oldugu
 * icin sessizce atlanir.
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
