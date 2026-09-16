import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { lightColors, radius } from '@/theme';

/** Acilis ekraninin en az gorunecegi sure. */
export const BOOT_SCREEN_MS = 2000;
/** Cubuk hemen oncesinde dolsun ki ekran "tamamlanmis" hissiyle kapansin. */
const BAR_FILL_MS = 1800;
const BAR_W = 168;
const BAR_H = 4;
/** Uygulama hazir olunca perdenin solarak kalkma suresi. */
const EXIT_MS = 450;
/** Perde kalkarken logo bu kadar buyur: "iceri giriyoruz" hissi. */
const EXIT_LOGO_SCALE = 0.12;

interface BootScreenProps {
  /**
   * Uygulama hazir. Ekran uygulamanin USTUNDE bir perde olarak cizilir, logo
   * hafifce buyurken solarak kalkar ve bitince onExited cagrilir. Verilmezse
   * klasik tam ekran acilis ekrani.
   */
  exiting?: boolean;
  onExited?: () => void;
}

/**
 * Uygulama acilirken gorunen marka ekrani: ortada logo, altinda dolan bir
 * yukleme cubugu.
 *
 * Arka plan, app.json'daki yerel acilis ekraniyla AYNI turkuaz. Yerel ekran
 * kaybolup bu ekran devraldiginda renk atlamasi olmuyor, tek bir ekran gibi
 * gorunuyor. Bu yuzden koyu temada da acik paletin turkuazi: yerel ekranin
 * rengi temaya gore degismiyor.
 *
 * Cikis: onceden uygulama hazir oldugu karede bu ekran tek seferde yok olup
 * yerine harita/hos geldin ekrani geliyordu. Artik kok layout uygulamayi
 * kurarken bunu `exiting` ile ustune koyuyor; ilk ekran perdenin arkasinda
 * cizilip yerlesiyor ve perde solarak aciliyor.
 */
export function BootScreen({ exiting = false, onExited }: BootScreenProps) {
  const reduceMotion = useReducedMotion();
  // Perde olarak kuruldugunda cubuk zaten dolu: onceki kopya BAR_FILL_MS'te
  // dolmustu ve bu, ayni ekranin devami gibi gorunmeli.
  const progress = useSharedValue(reduceMotion || exiting ? 1 : 0);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || exiting) return;
    progress.set(withTiming(1, { duration: BAR_FILL_MS, easing: Easing.inOut(Easing.cubic) }));
  }, [progress, reduceMotion, exiting]);

  useEffect(() => {
    if (!exiting) return;
    // "Hareketi azalt" aciksa Reanimated sureyi atlayip geri cagirimi hemen
    // calistiriyor; perde bekletmeden kalkar.
    exit.set(
      withTiming(1, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && onExited) runOnJS(onExited)();
      }),
    );
  }, [exiting, exit, onExited]);

  // width yerine translateX: kirpilmis rayin icinde kayan saf donusum, her
  // karede yerlesim hesabi tetiklemiyor.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * BAR_W }],
  }));
  const curtainStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + exit.value * EXIT_LOGO_SCALE }],
  }));
  // Cubuk perdeden iki kat hizli soner: gecisin ortasinda arkadaki ekranin
  // logosunun ustunden ince bir cizgi gibi geciyordu.
  const trackStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, exit.value * 2) }));

  return (
    <Animated.View
      // Kalkan perde dokunmayi yutmasin: arkadaki ekran zaten kullanilabilir.
      pointerEvents={exiting ? 'none' : 'auto'}
      accessibilityElementsHidden={exiting}
      importantForAccessibility={exiting ? 'no-hide-descendants' : 'auto'}
      style={[styles.root, exiting && styles.curtain, curtainStyle]}>
      <Animated.View style={logoStyle} accessibilityRole="image" accessibilityLabel="TORA WATT">
        <Logo width={208} color={lightColors.white} accentColor={lightColors.white} />
      </Animated.View>

      <Animated.View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Yükleniyor"
        style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.primary,
  },
  curtain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Android'de cizim sirasini elevation belirliyor; perde her seyin ustunde kalsin.
    zIndex: 100,
    elevation: 100,
  },
  track: {
    marginTop: 36,
    width: BAR_W,
    height: BAR_H,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    overflow: 'hidden',
  },
  fill: {
    width: BAR_W,
    height: BAR_H,
    borderRadius: radius.chip,
    backgroundColor: lightColors.white,
  },
});
