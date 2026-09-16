import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { colors, radius } from '@/theme';

/** Acilis ekraninin en az gorunecegi sure. */
export const BOOT_SCREEN_MS = 2000;
/** Cubuk hemen oncesinde dolsun ki ekran "tamamlanmis" hissiyle kapansin. */
const BAR_FILL_MS = 1800;
const BAR_W = 168;
const BAR_H = 4;

/**
 * Uygulama acilirken gorunen marka ekrani: ortada logo, altinda dolan bir
 * yukleme cubugu.
 *
 * Arka plan, app.json'daki yerel acilis ekraniyla AYNI turkuaz. Yerel ekran
 * kaybolup bu ekran devraldiginda renk atlamasi olmuyor, tek bir ekran gibi
 * gorunuyor.
 */
export function BootScreen() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.set(withTiming(1, { duration: BAR_FILL_MS, easing: Easing.inOut(Easing.cubic) }));
  }, [progress, reduceMotion]);

  // width yerine translateX: kirpilmis rayin icinde kayan saf donusum, her
  // karede yerlesim hesabi tetiklemiyor.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * BAR_W }],
  }));

  return (
    <View style={styles.root}>
      <View accessibilityRole="image" accessibilityLabel="TORA WATT">
        <Logo width={208} color={colors.white} accentColor={colors.white} />
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Yükleniyor"
        style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
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
    backgroundColor: colors.white,
  },
});
