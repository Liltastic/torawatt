import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import {
  AnimatedPressable,
  Card,
  ChargingMiniBar,
  CompactHeader,
  EmptyState,
  FilterChip,
  Refresher,
  StationCardSkeleton,
  useChargingMiniBarInset,
  useCollapsingTitle,
} from '@/components';
import { useTabBarInset } from '@/utils/tabBar';
import { useChargingHistory } from '@/queries/history';
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
  const tabBarInset = useTabBarInset();
  const miniBarInset = useChargingMiniBarInset();
  const { data: items, isLoading, isRefetching, refetch } = useChargingHistory();
  const [range, setRange] = useState<string>('all');
  const { scrollY, onScroll } = useCollapsingTitle();

  const filtered = useMemo(() => {
    const active = RANGES.find((r) => r.id === range) ?? RANGES[0];
    return (items ?? []).filter(active.test);
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

  const hasList = !isLoading && filtered.length > 0;

  // Liste her yeniden kuruldugunda (bos durumdan donus) en ustten basliyor;
  // eski kaydirma degeri kalirsa kompakt baslik buyuk basligin ustune binerdi.
  useEffect(() => {
    scrollY.set(0);
  }, [hasList, scrollY]);

  // Baslik ve aralik cipleri. Liste varken listenin basligi olarak icerikle
  // birlikte kayar ve gozden cikinca ustte kompakt baslik belirir (bkz.
  // CompactHeader); yukleniyor/bos durumlarinda sabit durur.
  const titleAndChips = (
    <>
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
    </>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      {!hasList && titleAndChips}

      {isLoading ? (
        <View style={styles.list}>
          <StationCardSkeleton />
          <StationCardSkeleton />
          <StationCardSkeleton />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="time-outline"
            title="Bu aralıkta kayıt yok"
            description="Farklı bir zaman aralığı seç veya yeni bir şarj oturumu başlat."
          />
        </View>
      ) : (
        // Kayit sayisi kullanildikca tek yonlu buyuyor ve ne istemcide ne
        // sunucuda ust sinir var; ScrollView tum satirlari ekran acilirken
        // birden kuruyordu.
        <Animated.FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Eleman olarak veriliyor: satir ici bir bilesen tipi her render'da
          // basligi unmount/remount eder ve giris animasyonunu tekrar oynatirdi.
          ListHeaderComponent={
            <>
              {/* Listenin yatay boslugunu geri alir: baslik ve cipler kendi boslugunu tasiyor. */}
              <View style={styles.bleed}>{titleAndChips}</View>
              <HistorySummary energy={totals.energy} cost={totals.cost} />
            </>
          }
          renderItem={({ item }) => <HistoryRow item={item} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: spacing.xxl + tabBarInset + miniBarInset },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<Refresher refreshing={isRefetching} onRefresh={refetch} />}
        />
      )}

      {hasList && <CompactHeader title="Geçmiş" scrollY={scrollY} />}
      <ChargingMiniBar />
    </SafeAreaView>
  );
}

function HistorySummary({ energy, cost }: { energy: number; cost: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Card style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Toplam enerji</Text>
          <Text style={styles.summaryValue}>{formatEnergy(energy)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Toplam tutar</Text>
          <Text style={styles.summaryValue}>{formatPrice(cost)}</Text>
        </View>
      </Card>
    </Animated.View>
  );
}

function HistoryRow({ item }: { item: ChargingHistoryDetail }) {
  // Basili zemin karti cizen ic gorunumde; dokunmayi Link disaridaki
  // basilabilir alana veriyor, o yuzden durum burada tutuluyor.
  const [pressed, setPressed] = useState(false);

  return (
    // layout kaliyor: filtre cipleri satirlari gercekten yer degistiriyor.
    // entering ise kaldirildi - geri donusturulen satirlarda kaydirirken her
    // geri girisde yeniden oynayip yanip sonme uretiyordu.
    <Animated.View layout={LinearTransition.duration(220)}>
      {/* iOS 18+: kart, dokununca detay ekranina buyuyerek donusuyor (Apple zoom
          gecisi, expo-router Link.AppleZoom). Yapi belgedeki gibi: Link asChild
          dokunmayi basilabilir alana veriyor, AppleZoom kartin kendisini kaynak
          isaretliyor. Diger platformlarda ve eski iOS'ta AppleZoom yalnizca
          cocugunu ciziyor, gecis normal. `push`: onceki router.push ile ayni. */}
      <Link href={{ pathname: '/history/[id]', params: { id: item.id } }} push asChild>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`${item.stationName}, ${formatDate(item.startedAt)}`}
          haptic="tap"
          scaleTo={0.98}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}>
          <Link.AppleZoom>
            {/* Duz nesne: AppleZoom cocugunu expo-router'in Slot'undan geciriyor
                ve Slot dizi stil kabul etmiyor (gelistirmede hata firlatiyor). */}
            <View style={StyleSheet.flatten([styles.row, pressed && styles.rowPressed])}>
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
            </View>
          </Link.AppleZoom>
        </AnimatedPressable>
      </Link>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  title: { ...typography.h2, color: colors.text },

  chips: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  chip: { marginRight: spacing.sm },

  emptyWrap: { flex: 1, justifyContent: 'center' },
  bleed: { marginHorizontal: -spacing.xl },
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
  energy: { ...typography.caption, color: colors.primaryText, marginTop: spacing.sm, fontWeight: '600' },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.md },
  cost: { ...typography.bodyStrong, color: colors.text, marginRight: spacing.xs },
});
