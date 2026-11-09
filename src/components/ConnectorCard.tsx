import { Text, View } from 'react-native';

import { createThemedStyles, radius, spacing, statusLabels, typography } from '@/theme';
import { connectorLabels, currentTypeOf, type Connector } from '@/types/domain';

import { AvailabilityBadge, PowerBadge } from './Badges';

interface ConnectorCardProps {
  connector: Connector;
  /** Istasyon icindeki sira numarasi; kullanici soketi fizikselde bununla bulur. */
  index: number;
}

/** Istasyon detayindaki soket karti: tip, guc ve anlik durum. */
export function ConnectorCard({ connector, index }: ConnectorCardProps) {
  const styles = useStyles();

  return (
    <View
      accessible
      accessibilityLabel={`${index}. soket, ${connectorLabels[connector.type]}, ${connector.powerKw} kilovat, ${statusLabels[connector.status]}`}
      style={styles.card}>
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.number}>{index}</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.type}>{connectorLabels[connector.type]}</Text>
          <Text style={styles.id} numberOfLines={1}>
            {(connector.label ?? connector.id).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.badges}>
        <PowerBadge currentType={currentTypeOf(connector)} powerKw={connector.powerKw} />
        <AvailabilityBadge status={connector.status} style={styles.badgeGap} />
      </View>
    </View>
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
  number: { ...typography.captionStrong, color: colors.textSecondary },

  headerText: { flex: 1, marginLeft: spacing.md },
  type: { ...typography.h3, color: colors.text },
  id: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },

  badges: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  badgeGap: { marginLeft: spacing.sm },
}));
