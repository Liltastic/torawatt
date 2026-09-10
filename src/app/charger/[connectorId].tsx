import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ConnectorBadge, EmptyState, PowerBadge } from '@/components';
import { findMockStation } from '@/mocks/stations';
import { useSessionStore } from '@/store/session';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { currentTypeOf } from '@/types/domain';
import { formatPrice } from '@/utils/format';

/** Sarj baslatma ozeti (spec bolum 8, ekran 9): baslatmadan once fiyat gorunur olmali. */
export default function ChargeSummaryScreen() {
  const { connectorId, stationId } = useLocalSearchParams<{
    connectorId: string;
    stationId: string;
  }>();
  const router = useRouter();
  const startSession = useSessionStore((state) => state.start);

  const station = findMockStation(stationId);
  const connector = station?.connectors.find((c) => c.id === connectorId);

  if (!station || !connector) {
    return (
      <SafeAreaView style={styles.root}>
        <Header onClose={() => router.back()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Soket bulunamadı"
          description="Seçtiğin soket artık mevcut değil. İstasyona dönüp tekrar dene."
          action={<Button label="Geri dön" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const handleStart = () => {
    startSession(station, connector);
    router.dismissAll();
    router.replace('/charging');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <Header onClose={() => router.back()} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Şarj özeti</Text>
        <Text style={styles.subtitle}>Başlatmadan önce ücretleri kontrol et.</Text>

        <Card style={styles.card}>
          <Text style={styles.stationName}>{station.name}</Text>
          <Text style={styles.stationAddress} numberOfLines={2}>
            {station.address}
          </Text>

          <View style={styles.badges}>
            <ConnectorBadge type={connector.type} />
            <PowerBadge
              currentType={currentTypeOf(connector)}
              powerKw={connector.powerKw}
              style={styles.badgeGap}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <PriceRow
            label="Enerji"
            value={
              connector.pricePerKwh != null
                ? `${formatPrice(connector.pricePerKwh)} / kWh`
                : 'Belirtilmemiş'
            }
          />
          <PriceRow
            label="Bekleme ücreti"
            value={
              connector.idleFeePerMin != null ? `${formatPrice(connector.idleFeePerMin)} / dk` : 'Yok'
            }
          />
          <PriceRow label="Başlatma ücreti" value="Yok" />
          <PriceRow label="Ödeme yöntemi" value="Henüz tanımlı değil" last />
        </Card>

        <View style={styles.notice}>
          <Ionicons name="flask-outline" size={16} color={colors.warning} />
          <Text style={styles.noticeText}>
            Bu akış simülasyon çalışıyor. Gerçek şarj başlatma ve ödeme, backend bağlandığında
            devreye girecek.
          </Text>
        </View>

        <Text style={styles.legal}>
          Nihai tutar, aracına aktarılan enerji miktarı üzerinden hesaplanır. Şarj başladığı andaki
          tarife geçerlidir.
        </Text>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
        <Button label="Şarjı Başlat" onPress={handleStart} />
      </SafeAreaView>
    </View>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kapat"
        hitSlop={10}
        onPress={onClose}
        style={styles.headerButton}>
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function PriceRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.priceRow, !last && styles.priceRowDivider]}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  title: { ...typography.h1, color: colors.text, marginTop: spacing.lg },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },

  card: { marginTop: spacing.xl },
  stationName: { ...typography.h3, color: colors.text },
  stationAddress: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  badges: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  badgeGap: { marginLeft: spacing.sm },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  priceRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  priceLabel: { ...typography.body, color: colors.textSecondary },
  priceValue: { ...typography.bodyStrong, color: colors.text },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.badge,
    backgroundColor: colors.warningSoft,
  },
  noticeText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },

  legal: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.lg },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
