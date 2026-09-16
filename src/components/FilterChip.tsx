import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { radius, spacing, typography, useColors } from '@/theme';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Secime gecis: listenin yeniden siralanma gecisiyle (220 ms) ayni ritimde, biraz once biter. */
const SELECT = { duration: 180, easing: Easing.out(Easing.quad) } as const;

/**
 * Harita ustundeki birinci seviye filtreler (spec bolum 6).
 *
 * Secilince zemin, kenar ve yazi rengi bir kareden digerine atlamak yerine
 * yumusakca gecer. Renk gecisi yerlesim hesabi tetiklemiyor.
 */
export function FilterChip({ label, selected = false, onPress, style }: FilterChipProps) {
  const colors = useColors();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(selected ? 1 : 0, SELECT));
  }, [selected, progress]);

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surface, colors.primaryStrong]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.border, colors.primaryStrong]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textSecondary, colors.white]),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={8}
      haptic="selection"
      scaleTo={0.93}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.chipPressed, style]}>
      {/* Renkler ic katmanda: basma olcegi ve dis bosluklar (style) dis katmanda kalir. */}
      <Animated.View style={[styles.chip, chipStyle]}>
        <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  chipPressed: { opacity: 0.7 },
  label: { ...typography.caption, fontWeight: '600' },
});
