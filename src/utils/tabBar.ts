import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Sekme cubugunun icerigin uzerine bindigi kadar alt pay.
 *
 * iOS'ta cubuk NativeTabs ile native ve yari saydam ciziliyor: layout'ta yer
 * KAPLAMIYOR, icerik altindan akiyor. expo-router her sekme ekranini kendi
 * SafeAreaProvider'ina sardigi ve react-native-screens o provider'a view'in
 * `self.safeAreaInsets` degerini verdigi icin (RNSTabsScreenComponentView.mm,
 * providerSafeAreaInsets) buradaki insets.bottom cubugu DA iceriyor: kabaca
 * 49pt cubuk + 34pt home gostergesi.
 *
 * Android'de cubuk klasik `Tabs` ile JS tarafinda ciziliyor ve gercekten yer
 * kapliyor (bkz. (tabs)/_layout.tsx); oraya ayrica pay eklemek cift bosluk
 * yaratirdi - bu yuzden 0.
 *
 * react-native-screens'in ScrollView'lere otomatik inset uygulamasina
 * guvenemiyoruz: bu override yalnizca index 0'daki cocuk MOUNT edilirken
 * calisiyor ve ilk alt-soy zincirinde bir ScrollView ariyor. Yukleniyor/bos
 * dali ScrollView icermeyen ekranlarda (gecmis, rota, sarj) hic tetiklenmiyor.
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? insets.bottom : 0;
}
