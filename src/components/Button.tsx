import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Metnin solunda gosterilecek ikon. */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        pressed && !isDisabled && styles[`pressed_${variant}`],
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, styles[`label_${variant}`], !!icon && styles.labelWithIcon]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  size_md: { height: 44 },
  size_lg: { height: 54 },

  variant_primary: { backgroundColor: colors.primary },
  variant_secondary: { backgroundColor: colors.primarySoft },
  variant_ghost: { backgroundColor: 'transparent' },
  variant_danger: { backgroundColor: colors.danger },

  pressed_primary: { backgroundColor: colors.primaryDark },
  pressed_secondary: { backgroundColor: '#DCE6FF' },
  pressed_ghost: { backgroundColor: colors.surfaceMuted },
  pressed_danger: { backgroundColor: '#C93B3F' },

  disabled: { opacity: 0.45 },

  label: { ...typography.body, fontWeight: '600' },
  labelWithIcon: { marginLeft: spacing.sm },
  label_primary: { color: colors.white },
  label_secondary: { color: colors.primaryDark },
  label_ghost: { color: colors.primaryDark },
  label_danger: { color: colors.white },
});
