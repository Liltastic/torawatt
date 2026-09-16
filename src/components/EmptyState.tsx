import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@/theme';

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Ikonun bir yukari-bir asagi suzulme suresi (tek yon). */
const FLOAT_MS = 1800;
/** Ikonun arkasindan disari yayilan yumusak halenin suresi. */
const HALO_MS = 2600;

/**
 * Bos / hata / izin reddedildi durumlari icin ortak yerlesim (spec bolum 28).
 *
 * Ikon cok yavas suzuluyor ve arkasindan soluk bir hale yayiliyor: ekran
 * donmus gibi degil, bekliyor gibi gorunsun. Yalnizca ekran odaktayken
 * doner (sekmeler arka planda mount kaliyor) ve "hareketi azalt" aciksa hic
 * donmez; hepsi transform ve opacity.
 */
export function EmptyState({ icon = 'sparkles-outline', title, description, action, style }: EmptyStateProps) {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const animate = isFocused && !reduceMotion;

  const float = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(float);
      cancelAnimation(halo);
      float.set(withTiming(0, { duration: 250 }));
      halo.set(0);
      return;
    }
    float.set(withRepeat(withTiming(1, { duration: FLOAT_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    halo.set(withRepeat(withTiming(1, { duration: HALO_MS, easing: Easing.out(Easing.quad) }), -1, false));
  }, [animate, float, halo]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * float.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - halo.value),
    transform: [{ scale: 1 + halo.value * 0.5 }],
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.iconArea, iconStyle]}>
        <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={26} color={colors.primary} />
        </View>
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const ICON_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  iconArea: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    marginBottom: spacing.lg,
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.primarySoft,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radius.card,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h3, color: colors.text, textAlign: 'center' },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
