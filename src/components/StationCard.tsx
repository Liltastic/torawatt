import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';
import { currentTypeOf, stationAvailability, type Station } from '@/types/domain';
import { formatDistance } from '@/utils/format';

import { AvailabilityBadge, PowerBadge } from './Badges';

/** Alt sheet ve arama sonuclarindaki istasyon satiri: mesafe, musait soket, maks. guc. */
export function StationCard({
  station,
  selected = false,
  onPress,
}: {
  station: Station;
  selected?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  const available = station.connectors.filter((c) => c.status === 'AVAILABLE').length;
  const total = station.connectors.length;

  // Soketi olmayan istasyon gelebilir; bos dizide reduce patlar.
  const strongest = station.connectors.length
    ? station.connectors.reduce((best, c) => (c.powerKw > best.powerKw ? c : best))
    : undefined;

  const availability = stationAvailability(station);
  // Durum bilinmiyorsa "0/2 musait" yazmak "hepsi dolu" demek olurdu.
  const socketSummary =
    availability === 'UNKNOWN' ? `${total} soket` : `${available}/${total} müsait`;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${station.name}, ${socketSummary}`}
      haptic="tap"
      scaleTo={0.98}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {station.name}
        </Text>

        <Text style={styles.meta}>
          {station.distanceKm != null ? formatDistance(station.distanceKm) : station.operator}
          {' · '}
          {socketSummary}
        </Text>

        <View style={styles.badges}>
          {strongest && (
            <PowerBadge currentType={currentTypeOf(strongest)} powerKw={strongest.powerKw} />
          )}
          <AvailabilityBadge status={availability} style={styles.badgeGap} />
        </View>
      </View>

      <View style={styles.trailing}>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </AnimatedPressable>
  );
}

const useStyles = createThemedStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  selected: { backgroundColor: colors.primarySoft },
  main: { flex: 1 },
  name: { ...typography.h3, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  badgeGap: { marginLeft: spacing.sm },
  trailing: { alignItems: 'flex-end', marginLeft: spacing.md },
}));
