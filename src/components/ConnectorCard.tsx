import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';
import { connectorLabels, currentTypeOf, type Connector } from '@/types/domain';
import { formatPrice } from '@/utils/format';

import { AvailabilityBadge, PowerBadge } from './Badges';

interface ConnectorCardProps {
  connector: Connector;
  /** Istasyon icindeki sira numarasi; kullanici soketi fizikselde bununla bulur. */
  index: number;
  selected?: boolean;
  onPress?: () => void;
}

/** Istasyon detayindaki soket karti (spec bolum 7). */
export function ConnectorCard({ connector, index, selected = false, onPress }: ConnectorCardProps) {
  const colors = useColors();
  const styles = useStyles();
  const selectable = connector.status === 'AVAILABLE';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !selectable }}
      accessibilityLabel={`${index}. soket, ${connectorLabels[connector.type]}, ${connector.powerKw} kilovat`}
      disabled={!selectable}
      haptic="selection"
      scaleTo={0.97}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        !selectable && styles.cardDisabled,
        pressed && selectable && styles.cardPressed,
      ]}>
      <View style={styles.header}>
        <View style={[styles.numberBadge, selected && styles.numberBadgeSelected]}>
          <Text style={[styles.number, selected && styles.numberSelected]}>{index}</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.type}>{connectorLabels[connector.type]}</Text>
          <Text style={styles.id} numberOfLines={1}>
            {connector.id.toUpperCase()}
          </Text>
        </View>

        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primaryStrong} />}
      </View>

      <View style={styles.badges}>
        <PowerBadge currentType={currentTypeOf(connector)} powerKw={connector.powerKw} />
        <AvailabilityBadge status={connector.status} style={styles.badgeGap} />
      </View>

      <View style={styles.footer}>
        {connector.pricePerKwh != null ? (
          <Text style={styles.price}>
            {formatPrice(connector.pricePerKwh)}
            <Text style={styles.priceUnit}> / kWh</Text>
          </Text>
        ) : (
          <Text style={styles.priceUnit}>Fiyat bilgisi yok</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const useStyles = createThemedStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardPressed: { backgroundColor: colors.surfaceMuted },
  // Kullanilamayan soket gorunur kalir ama secilemez; kullanici neden secemedigini gormeli.
  cardDisabled: { opacity: 0.55 },

  header: { flexDirection: 'row', alignItems: 'center' },
  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeSelected: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  number: { ...typography.captionStrong, color: colors.textSecondary },
  numberSelected: { color: colors.white },

  headerText: { flex: 1, marginLeft: spacing.md },
  type: { ...typography.h3, color: colors.text },
  id: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },

  badges: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  badgeGap: { marginLeft: spacing.sm },

  footer: { marginTop: spacing.md },
  price: { ...typography.bodyStrong, color: colors.text },
  priceUnit: { ...typography.caption, color: colors.textSecondary, fontWeight: '400' },
}));
