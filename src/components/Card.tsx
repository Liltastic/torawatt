import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

interface CardProps extends ViewProps {
  /** Golgesiz, yalnizca kenarlikli varyant. */
  flat?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ flat = false, padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, padded && styles.padded, !flat && shadows.card, style]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.xl },
});
