import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/theme';

/** Kompakt ust cubugun yuksekligi. */
const COMPACT_HEIGHT = 48;
/**
 * Buyuk baslik (h2, ustundeki 8 dp ile ~38 dp) bu kaydirma araliginda kompakt
 * cubugun altina giriyor; cubuk ve kucuk baslik ayni aralikta belirir.
 */
const FADE_FROM = 20;
const FADE_TO = 44;

/**
 * Kaydirma konumunu UI thread'de izler. `onScroll`, Animated.ScrollView /
 * Animated.FlatList'e verilir (scrollEventThrottle={16} ile).
 */
export function useCollapsingTitle() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  return { scrollY, onScroll };
}

/**
 * Buyuk baslik kaydirilip gozden cikarken ekranin ustunde beliren kompakt
 * baslik cubugu (iOS'un buyuk baslik davranisi). Ekranin kok gorunumune, kaydirilan
 * listeden SONRA konur. Buyuk baslik icerikte kaldigi icin ekran okuyucudan
 * gizli; yalnizca gorsel bir tekrar.
 *
 * Kok gorunum ust guvenli alani dolgu olarak uygulayan bir SafeAreaView;
 * mutlak konumlu cocuk o dolguyu saymadigi icin cubuk `top: insets.top` ile
 * durum cubugunun hemen altina yerlestiriliyor.
 */
export function CompactHeader({ title, scrollY }: { title: string; scrollY: SharedValue<number> }) {
  const insets = useSafeAreaInsets();

  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [FADE_FROM, FADE_TO], [0, 1], Extrapolation.CLAMP),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [FADE_FROM, FADE_TO], [6, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { top: insets.top }, barStyle]}>
      <Animated.Text numberOfLines={1} style={[styles.title, titleStyle]}>
        {title}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: COMPACT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { ...typography.bodyStrong, color: colors.text },
});
