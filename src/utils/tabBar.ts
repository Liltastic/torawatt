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
/**
 * Klasik iOS sekme cubugunun yuksekligi. iOS 26'nin yuzen cam cubugu da bu
 * civarda; ustune bir de ekranin dibiyle arasindaki bosluk biniyor.
 */
const IOS_TAB_BAR_HEIGHT = 49;
const IOS_FLOATING_TAB_BAR_GAP = 8;

export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'ios') return 0;

  /**
   * Yukaridaki 49+34 hesabi yalnizca cubuk olcuye GIRDIGINDE geciyor. iOS 26'da
   * cubuk yuzuyor ve safeAreaInsets.bottom yalnizca home gostergesini veriyor;
   * o zaman pay cubugun yarisi kadar bile olmuyor ve icerigin sonu altinda
   * kaliyor (katalog istasyonunda alt buton cubugu hic cizilmedigi icin -
   * bkz. (tabs)/map.tsx renderFooter - acigi kapatacak baska pay da yok).
   *
   * Iki durumu ayirt etmek icin degerin kendisine bakiyoruz: cubuk iceride
   * olsaydi tek basina bir cubuk yuksekligini asardi. Asmiyorsa cubugu biz
   * ekliyoruz. Boylece iki davranista da dogru pay cikiyor.
   */
  if (insets.bottom >= IOS_TAB_BAR_HEIGHT) return insets.bottom;
  return insets.bottom + IOS_TAB_BAR_HEIGHT + IOS_FLOATING_TAB_BAR_GAP;
}
