import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Bos / hata / izin reddedildi durumlari icin ortak yerlesim (spec bolum 28). */
export function EmptyState({ icon = 'sparkles-outline', title, description, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
