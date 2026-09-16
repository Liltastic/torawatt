import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { colors, radius, spacing, typography } from '@/theme';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Harita ustundeki birinci seviye filtreler (spec bolum 6). */
export function FilterChip({ label, selected = false, onPress, style }: FilterChipProps) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={8}
      haptic="selection"
      scaleTo={0.93}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
        style,
      ]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  chipPressed: { opacity: 0.7 },
  label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  labelSelected: { color: colors.white },
});
