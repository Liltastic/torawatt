import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  type BadgeStatus,
  createThemedStyles,
  radius,
  spacing,
  statusLabels,
  typography,
  useColors,
  useTheme,
  type Palette,
} from '@/theme';
import { connectorLabels, type ConnectorType, type CurrentType } from '@/types/domain';

/** Soket / istasyon musaitlik rozeti (spec bolum 7). */
export function AvailabilityBadge({
  status,
  label,
  style,
}: {
  status: BadgeStatus;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { statusColors, statusSoftColors, statusTextColors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.badge, { backgroundColor: statusSoftColors[status] }, style]}>
      <View style={[styles.dot, { backgroundColor: statusColors[status] }]} />
      {/* Nokta parlak durum renginde, yazi ayni ailenin okunur koyu tonunda. */}
      <Text style={[styles.badgeText, { color: statusTextColors[status] }]}>
        {label ?? statusLabels[status]}
      </Text>
    </View>
  );
}

function currentTypeColorsFor(colors: Palette): Record<CurrentType, { bg: string; fg: string }> {
  return {
    AC: { bg: colors.neutralSoft, fg: colors.textSecondary },
    DC: { bg: colors.primarySoft, fg: colors.primaryText },
    HPC: { bg: colors.primaryStrong, fg: colors.white },
  };
}

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
  const colors = useColors();
  const styles = useStyles();
  const tone = currentTypeColorsFor(colors)[currentType];
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
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.badge, styles.connector, style]}>
      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
        {connectorLabels[type]}
      </Text>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
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
}));
