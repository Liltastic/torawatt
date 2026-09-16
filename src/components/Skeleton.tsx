import { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { createThemedStyles, radius, spacing, useColors } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Icerik yuklenirken yerini tutan, nefes alan gri blok. */
export function Skeleton({ width = '100%', height = 14, borderRadius = radius.badge, style }: SkeletonProps) {
  const colors = useColors();
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
  const styles = useStyles();
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

/**
 * Kart listeleri (favoriler, araclar, kampanyalar, odeme yontemleri) icin
 * yerini tutan kart. Kac tane basilacagini ekran belirler; uc tane ekranin
 * ust yarisini doldurmaya yetiyor.
 */
export function ListCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <View style={[styles.listCard, style]}>
      <Skeleton width="58%" height={17} />
      <Skeleton width="38%" height={12} style={styles.gap} />
      <View style={styles.badges}>
        <Skeleton width={86} height={26} borderRadius={radius.badge} />
        <Skeleton width={104} height={26} borderRadius={radius.badge} style={styles.badgeGap} />
      </View>
    </View>
  );
}

/**
 * Detay ekranlari (istasyon, soket, rezervasyon, gecmis kaydi) icin: baslik
 * blogu ve altinda kart yuksekliginde bloklar. Basligi ekranin kendisi zaten
 * cizdigi icin bu yalnizca govdeyi doldurur.
 */
export function DetailSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <View style={[styles.detail, style]}>
      <Skeleton width="66%" height={26} />
      <Skeleton width="46%" height={14} style={styles.gap} />
      <Skeleton height={132} borderRadius={radius.card} style={styles.block} />
      <Skeleton height={96} borderRadius={radius.card} style={styles.blockGap} />
      <Skeleton height={96} borderRadius={radius.card} style={styles.blockGap} />
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
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

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  detail: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  block: { marginTop: spacing.xxl },
  blockGap: { marginTop: spacing.md },
}));
