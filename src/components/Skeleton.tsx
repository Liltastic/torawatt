import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Icerik yuklenirken yerini tutan, nefes alan gri blok. */
export function Skeleton({ width = '100%', height = 14, borderRadius = radius.badge, style }: SkeletonProps) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.neutralSoft }, animatedStyle, style]}
    />
  );
}

/** Istasyon satiri yuklenirken gosterilen iskelet; StationCard ile ayni olculerde. */
export function StationCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <Skeleton width="62%" height={18} />
        <Skeleton width="44%" height={12} style={styles.gap} />
        <View style={styles.badges}>
          <Skeleton width={92} height={24} borderRadius={radius.badge} />
          <Skeleton width={110} height={24} borderRadius={radius.badge} style={styles.badgeGap} />
        </View>
      </View>
      <Skeleton width={64} height={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  main: { flex: 1 },
  gap: { marginTop: spacing.sm },
  badges: { flexDirection: 'row', marginTop: spacing.md },
  badgeGap: { marginLeft: spacing.sm },
});
