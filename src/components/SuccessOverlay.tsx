import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/** Onay ekraninin toplam sure. Sonunda onDone cagrilir. */
const HOLD_MS = 950;
const CIRCLE = 96;

interface SuccessOverlayProps {
  /** "Şarj başlıyor", "Rezervasyon oluşturuldu" gibi tek satirlik onay. */
  label: string;
  /** Sure dolunca cagrilir; genellikle burada yonlendirme yapilir. */
  onDone: () => void;
}

/**
 * Geri donusu olmayan bir eylem (sarj baslatma, rezervasyon onayi) bittiginde
 * bir saniyeligine gosterilen onay. Eskiden bu anlarda ekran dogrudan
 * degisiyordu ve kullanici islemin gerceklesip gerceklesmedigini goremiyordu.
 *
 * Yalnizca opacity ve transform animasyonu var; kare basina yerlesim hesabi
 * cikmasin diye olculer sabit.
 */
export function SuccessOverlay({ label, onDone }: SuccessOverlayProps) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    haptics.success();
    if (!reduceMotion) {
      pop.set(withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.6)) }));
    }
    const timer = setTimeout(onDone, HOLD_MS);
    return () => clearTimeout(timer);
  }, [onDone, pop, reduceMotion]);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.6 + pop.value * 0.4 }],
  }));

  return (
    <Animated.View
      // Altindaki ekranla etkilesim kapansin: islem bitti, ikinci kez
      // basilabilmesi anlamsiz ve riskli.
      entering={FadeIn.duration(reduceMotion ? 0 : 180)}
      accessibilityRole="alert"
      accessibilityLabel={label}
      style={styles.root}>
      <Animated.View style={[styles.circle, circleStyle]}>
        <Ionicons name="checkmark" size={46} color={colors.white} />
      </Animated.View>
      <Animated.Text
        entering={FadeIn.delay(reduceMotion ? 0 : 180).duration(reduceMotion ? 0 : 240)}
        style={styles.label}>
        {label}
      </Animated.Text>
      <View style={styles.spacer} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 251, 246, 0.97)',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.h3, color: colors.text, marginTop: spacing.xl, textAlign: 'center' },
  // Optik denge: daire + yazi blogu ekranin tam ortasindan biraz yukarida dursun.
  spacer: { height: spacing.huge },
});
