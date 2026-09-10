import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { currentTypeOf, stationAvailability, type Station } from '@/types/domain';
import { formatDistance, formatPrice } from '@/utils/format';

import { AvailabilityBadge, PowerBadge } from './Badges';

/**
 * Alt sheet ve arama sonuclarindaki istasyon satiri (spec bolum 5):
 * mesafe, musait soket, maks. guc ve baslangic fiyati.
 */
export function StationCard({
  station,
  selected = false,
  onPress,
}: {
  station: Station;
  selected?: boolean;
  onPress?: () => void;
}) {
  const available = station.connectors.filter((c) => c.status === 'AVAILABLE').length;
  const total = station.connectors.length;

  // Soketi olmayan istasyon gelebilir; bos dizide reduce patlar.
  const strongest = station.connectors.length
    ? station.connectors.reduce((best, c) => (c.powerKw > best.powerKw ? c : best))
    : undefined;

  // Spec "baslangic fiyati" istiyor: en ucuz soketin kWh fiyati.
  const cheapest = station.connectors.reduce<number | undefined>(
    (min, c) => (c.pricePerKwh != null && (min == null || c.pricePerKwh < min) ? c.pricePerKwh : min),
    undefined,
  );

  const availability = stationAvailability(station);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${station.name}, ${total} soketten ${available} tanesi müsait`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {station.name}
        </Text>

        <Text style={styles.meta}>
          {station.distanceKm != null ? formatDistance(station.distanceKm) : station.operator}
          {' · '}
          {available}/{total} müsait
        </Text>

        <View style={styles.badges}>
          {strongest && (
            <PowerBadge currentType={currentTypeOf(strongest)} powerKw={strongest.powerKw} />
          )}
          <AvailabilityBadge status={availability} style={styles.badgeGap} />
        </View>
      </View>

      <View style={styles.trailing}>
        {cheapest != null && (
          <>
            <Text style={styles.price}>
              {formatPrice(cheapest)}
              <Text style={styles.priceUnit}>/kWh</Text>
            </Text>
            {/* Guc rozeti en hizli soketi, fiyat en ucuzunu gosteriyor. Etiket bu farki aciyor. */}
            <Text style={styles.priceCaption}>başlangıç</Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  price: { ...typography.bodyStrong, color: colors.text },
  priceUnit: { ...typography.caption, color: colors.textSecondary, fontWeight: '400' },
  priceCaption: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xs },
});
