import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailabilityBadge, Button, Card, ConnectorCard, EmptyState } from '@/components';
import { findMockStation } from '@/mocks/stations';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { stationAvailability } from '@/types/domain';
import { formatDistance, formatPrice } from '@/utils/format';

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>();

  const station = findMockStation(id);

  if (!station) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader onBack={() => router.back()} />
        <EmptyState
          icon="alert-circle-outline"
          title="İstasyon bulunamadı"
          description="Bu istasyon kaldırılmış veya bağlantı geçersiz olabilir."
          action={<Button label="Geri dön" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const availability = stationAvailability(station);
  const availableCount = station.connectors.filter((c) => c.status === 'AVAILABLE').length;
  const selectedConnector = station.connectors.find((c) => c.id === selectedConnectorId);

  const openDirections = () => {
    const { latitude: lat, longitude: lng, name } = station;
    const webFallback = `https://www.openstreetmap.org/directions?to=${lat},${lng}`;

    // Her iki platformda da cihazin varsayilan harita uygulamasini acar.
    const url = Platform.select({
      ios: `maps://?daddr=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`,
      default: webFallback,
    });

    // Harita uygulamasi kurulu degilse tarayiciya dus.
    Linking.openURL(url).catch(() => Linking.openURL(webFallback));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader onBack={() => router.back()} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.name}>{station.name}</Text>
        <Text style={styles.operator}>
          {station.operator}
          {station.distanceKm != null ? ` · ${formatDistance(station.distanceKm)}` : ''}
          {station.isOpen24h ? ' · 24 saat açık' : ''}
        </Text>

        <View style={styles.statusRow}>
          <AvailabilityBadge status={availability} />
          <Text style={styles.statusText}>
            {station.connectors.length} soketten {availableCount} tanesi müsait
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Soketler</Text>
        <Text style={styles.sectionHint}>Şarj başlatmak için bir soket seç.</Text>

        {station.connectors.map((connector, index) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            index={index + 1}
            selected={connector.id === selectedConnectorId}
            onPress={() => setSelectedConnectorId(connector.id)}
          />
        ))}

        <Text style={styles.sectionTitle}>Ücretlendirme</Text>
        <Card style={styles.infoCard}>
          <InfoRow
            label="Enerji"
            value={
              selectedConnector?.pricePerKwh != null
                ? `${formatPrice(selectedConnector.pricePerKwh)} / kWh`
                : 'Soket seçince görünür'
            }
          />
          <InfoRow
            label="Bekleme ücreti"
            value={
              selectedConnector?.idleFeePerMin != null
                ? `${formatPrice(selectedConnector.idleFeePerMin)} / dk`
                : 'Yok'
            }
          />
          <InfoRow label="Başlatma ücreti" value="Yok" last />
        </Card>

        <Text style={styles.sectionTitle}>Konum ve olanaklar</Text>
        <Card style={styles.infoCard}>
          <InfoRow label="Adres" value={station.address} />
          <InfoRow
            label="Olanaklar"
            value={station.amenities.length > 0 ? station.amenities.join(', ') : 'Belirtilmemiş'}
            last
          />
        </Card>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yol tarifi"
            onPress={openDirections}
            style={({ pressed }) => [styles.directionsButton, pressed && styles.directionsPressed]}>
            <Ionicons name="navigate" size={20} color={colors.primaryDark} />
          </Pressable>

          <Button
            label={selectedConnector ? 'Şarj Başlat' : 'Önce soket seç'}
            disabled={!selectedConnector}
            onPress={() => {
              // Non-null assertion kullanmiyoruz: React Compiler nesne literalini
              // render sirasinda degerlendirip henuz secim yokken patliyor.
              if (!selectedConnector) return;
              router.push({
                pathname: '/charger/[connectorId]',
                params: { connectorId: selectedConnector.id, stationId: station.id },
              });
            }}
            style={styles.primaryAction}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        hitSlop={10}
        onPress={onBack}
        style={styles.headerButton}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Favorilere ekle"
        hitSlop={10}
        style={styles.headerButton}>
        <Ionicons name="heart-outline" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
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
  name: { ...typography.h1, color: colors.text, marginTop: spacing.lg },
  operator: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },

  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  statusText: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.md },

  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xxl },
  sectionHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  infoCard: { marginTop: spacing.md, paddingVertical: spacing.xs },
  infoRow: { paddingVertical: spacing.md },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { ...typography.caption, color: colors.textSecondary },
  infoValue: { ...typography.body, color: colors.text, marginTop: 2 },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  directionsButton: {
    width: 54,
    height: 54,
    borderRadius: radius.button,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  directionsPressed: { backgroundColor: '#DCE6FF' },
  primaryAction: { flex: 1 },
});
