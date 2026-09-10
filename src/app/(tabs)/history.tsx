import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, EmptyState, FilterChip } from '@/components';
import { useHistoryStore } from '@/store/history';
import { colors, radius, spacing, typography } from '@/theme';
import type { ChargingHistoryDetail } from '@/types/domain';
import { formatDate, formatEnergy, formatMinutes, formatPrice } from '@/utils/format';

/**
 * Spec bolum 13 ayrica "tarih araligi" ve "arac" filtreleri istiyor.
 * Tarih secici ve arac profili gelene kadar yalnizca uygulanabilir olanlar var.
 */
const RANGES = [
  { id: 'all', label: 'Tümü', test: () => true },
  {
    id: 'week',
    label: 'Son 7 gün',
    test: (item: ChargingHistoryDetail) =>
      Date.now() - new Date(item.startedAt).getTime() <= 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'month',
    label: 'Bu ay',
    test: (item: ChargingHistoryDetail) => {
      const started = new Date(item.startedAt);
      const now = new Date();
      return started.getMonth() === now.getMonth() && started.getFullYear() === now.getFullYear();
    },
  },
] as const;

export default function HistoryScreen() {
  const router = useRouter();
  const items = useHistoryStore((state) => state.items);
  const [range, setRange] = useState<string>('all');

  const filtered = useMemo(() => {
    const active = RANGES.find((r) => r.id === range) ?? RANGES[0];
    return items.filter(active.test);
  }, [items, range]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, item) => ({
          energy: acc.energy + item.energyKwh,
          cost: acc.cost + item.cost,
        }),
        { energy: 0, cost: 0 },
      ),
    [filtered],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Geçmiş</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {RANGES.map((r) => (
          <FilterChip
            key={r.id}
            label={r.label}
            selected={range === r.id}
            onPress={() => setRange(r.id)}
            style={styles.chip}
          />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="time-outline"
            title="Bu aralıkta kayıt yok"
            description="Farklı bir zaman aralığı seç veya yeni bir şarj oturumu başlat."
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Card style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Toplam enerji</Text>
              <Text style={styles.summaryValue}>{formatEnergy(totals.energy)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Toplam tutar</Text>
              <Text style={styles.summaryValue}>{formatPrice(totals.cost)}</Text>
            </View>
          </Card>

          {filtered.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.stationName}, ${formatDate(item.startedAt)}`}
              onPress={() =>
                router.push({ pathname: '/history/[id]', params: { id: item.id } })
              }
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowMain}>
                <Text style={styles.station} numberOfLines={1}>
                  {item.stationName}
                </Text>
                <Text style={styles.meta}>
                  {formatDate(item.startedAt)} · {formatMinutes(item.durationMinutes)}
                </Text>
                <Text style={styles.energy}>{formatEnergy(item.energyKwh)}</Text>
              </View>

              <View style={styles.rowTrailing}>
                <Text style={styles.cost}>{formatPrice(item.cost)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  title: { ...typography.h2, color: colors.text },

  chips: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  chip: { marginRight: spacing.sm },

  emptyWrap: { flex: 1, justifyContent: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },

  summary: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  summaryValue: { ...typography.h3, color: colors.text, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowMain: { flex: 1 },
  station: { ...typography.h3, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  energy: { ...typography.caption, color: colors.primaryDark, marginTop: spacing.sm, fontWeight: '600' },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.md },
  cost: { ...typography.bodyStrong, color: colors.text, marginRight: spacing.xs },
});
