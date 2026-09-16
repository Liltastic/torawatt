import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { createThemedStyles, radius, shadows, spacing } from '@/theme';

interface CardProps extends ViewProps {
  /** Golgesiz, yalnizca kenarlikli varyant. */
  flat?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ flat = false, padded = true, style, children, ...rest }: CardProps) {
  const styles = useStyles();
  return (
    <View
      style={[styles.card, padded && styles.padded, !flat && shadows.card, style]}
      {...rest}>
      {children}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.xl },
}));
