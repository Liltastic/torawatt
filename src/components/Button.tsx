import {
  ActivityIndicator,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Metnin solunda gosterilecek ikon. */
  icon?: React.ReactNode;
  /** Metnin sagenda gosterilecek ikon (ornegin ileri oku). */
  trailingIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  icon,
  trailingIcon,
  style,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const styles = useStyles();
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      haptic={variant === 'danger' ? 'heavy' : 'press'}
      scaleTo={0.97}
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
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primaryText}
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, styles[`label_${variant}`], !!icon && styles.labelWithIcon]}>
            {label}
          </Text>
          {!!trailingIcon && <View style={styles.trailingIcon}>{trailingIcon}</View>}
        </View>
      )}
    </AnimatedPressable>
  );
}

const useStyles = createThemedStyles((colors) => ({
  base: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  size_md: { height: 44 },
  size_lg: { height: 54 },

  // Beyaz yazili dolgular *Strong tonunda: parlak turkuaz/kirmizi uzerinde
  // beyaz 2.6:1 / 3.2:1'de kalip AA'yi gecmiyordu.
  variant_primary: { backgroundColor: colors.primaryStrong },
  variant_secondary: { backgroundColor: colors.primarySoft },
  variant_ghost: { backgroundColor: 'transparent' },
  variant_danger: { backgroundColor: colors.dangerStrong },

  pressed_primary: { backgroundColor: colors.primaryStrongPressed },
  pressed_secondary: { backgroundColor: colors.primarySoftPressed },
  pressed_ghost: { backgroundColor: colors.surfaceMuted },
  pressed_danger: { backgroundColor: colors.dangerStrongPressed },

  disabled: { opacity: 0.45 },

  label: { ...typography.body, fontWeight: '600' },
  labelWithIcon: { marginLeft: spacing.sm },
  trailingIcon: { marginLeft: spacing.sm },
  label_primary: { color: colors.white },
  label_secondary: { color: colors.primaryText },
  label_ghost: { color: colors.primaryText },
  label_danger: { color: colors.white },
}));
