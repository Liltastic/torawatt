import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { statusColors, statusLabels, statusSoftColors } from '@/theme/colors';
import { connectorLabels, type ChargerStatus, type ConnectorType, type CurrentType } from '@/types/domain';

/** Soket / istasyon musaitlik rozeti (spec bolum 7). */
export function AvailabilityBadge({
  status,
  label,
  style,
}: {
  status: ChargerStatus;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: statusSoftColors[status] }, style]}>
      <View style={[styles.dot, { backgroundColor: statusColors[status] }]} />
      <Text style={[styles.badgeText, { color: statusColors[status] }]}>
        {label ?? statusLabels[status]}
      </Text>
    </View>
  );
}

const currentTypeColors: Record<CurrentType, { bg: string; fg: string }> = {
  AC: { bg: colors.neutralSoft, fg: colors.textSecondary },
  DC: { bg: colors.primarySoft, fg: colors.primaryDark },
  HPC: { bg: colors.primary, fg: colors.white },
};

/** AC / DC / HPC + kW rozeti (spec bolum 5). */
export function PowerBadge({
  currentType,
  powerKw,
  style,
}: {
  currentType: CurrentType;
  powerKw?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = currentTypeColors[currentType];
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }, style]}>
      <Text style={[styles.badgeText, { color: tone.fg }]}>
        {currentType}
        {powerKw != null ? ` · ${powerKw} kW` : ''}
      </Text>
    </View>
  );
}

export function ConnectorBadge({
  type,
  style,
}: {
  type: ConnectorType;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, styles.connector, style]}>
      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
        {connectorLabels[type]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.badge,
  },
  connector: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: spacing.sm - 2,
  },
  badgeText: { ...typography.captionStrong },
});
