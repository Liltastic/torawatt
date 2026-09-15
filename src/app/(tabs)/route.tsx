import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AnimatedPressable, Button, Card, EmptyState, TextField } from '@/components';
import { StationMap, type MapRoute } from '@/map';
import { useStations } from '@/queries/stations';
import { useActiveVehicle, useVehicles } from '@/queries/vehicles';
import { geocode, getRoute, type Place } from '@/services/routing';
import { planTrip, type TripPlan } from '@/services/tripPlanner';
import { colors, radius, spacing, typography } from '@/theme';
import { formatEnergy, formatMinutes, formatPrice } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useTabBarInset } from '@/utils/tabBar';

/** Varista bataryada birakilmasi istenen pay. */
const RESERVE_PERCENT = 10;

export default function RouteScreen() {
  const router = useRouter();
  // iOS sekme cubugu icerigin uzerine biniyor (bkz. utils/tabBar).
  const tabBarInset = useTabBarInset();
  const { isLoading: vehiclesLoading } = useVehicles();
  const vehicle = useActiveVehicle();
  const { data: stations } = useStations();

  const [from, setFrom] = useState<Place>();
  const [to, setTo] = useState<Place>();
  const [startPercent, setStartPercent] = useState('80');

  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string>();
  const [plan, setPlan] = useState<{
    trip: TripPlan;
    distanceKm: number;
    driveMinutes: number;
    route: MapRoute;
  }>();

  // Kayitli araclar yuklenmeden "arac yok" gostermek yaniltici olurdu.
  if (vehiclesLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Rota</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Rota</Text>
        </View>
        <View style={styles.centered}>
          <EmptyState
            icon="car-sport-outline"
            title="Önce araç ekle"
            description="Şarj molalarını hesaplayabilmek için aracının batarya kapasitesi ve tüketimi gerekiyor."
            action={<Button label="Araç ekle" onPress={() => router.push('/vehicles/add')} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handlePlan = async () => {
    if (!from || !to) return;

    setPlanning(true);
    setError(undefined);
    setPlan(undefined);

    try {
      const route = await getRoute(from, to);
      const percent = Number(startPercent.replace(',', '.'));
      const trip = planTrip({
        route,
        vehicle,
        startPercent: Number.isFinite(percent) ? Math.min(100, Math.max(1, percent)) : 80,
        reservePercent: RESERVE_PERCENT,
        stations: stations ?? [],
      });

      setPlan({
        trip,
        distanceKm: route.distanceKm,
        driveMinutes: route.durationMinutes,
        route: { geometry: route.geometry, start: from, end: to },
      });
      haptics.success();
    } catch (e) {
      haptics.error();
      setError(e instanceof Error ? e.message : 'Rota hesaplanamadı');
    } finally {
      setPlanning(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing.huge + tabBarInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Rota</Text>
          <Text style={styles.subtitle}>
            {vehicle.make} {vehicle.model} · {vehicle.batteryCapacityKwh} kWh
          </Text>

          <PlaceSearch label="Nereden" value={from} onSelect={setFrom} />
          <PlaceSearch label="Nereye" value={to} onSelect={setTo} />

          <TextField
            label="Mevcut batarya"
            suffix="%"
            value={startPercent}
            onChangeText={setStartPercent}
            keyboardType="number-pad"
          />

          <Button
            label="Rotayı planla"
            disabled={!from || !to}
            loading={planning}
            onPress={handlePlan}
          />

          {!!error && (
            <Animated.View entering={FadeInDown.duration(220)} style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {plan && (
            <Animated.View entering={FadeInDown.duration(320)}>
              <PlanResult {...plan} />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PlanResult({
  trip,
  distanceKm,
  driveMinutes,
  route,
}: {
  trip: TripPlan;
  distanceKm: number;
  driveMinutes: number;
  route: MapRoute;
}) {
  const stopStations = useMemo(() => trip.stops.map((stop) => stop.station), [trip]);

  // Expo Router ziyaret edilen sekmeyi mount edilmis birakiyor; onizleme de tam
  // bir WebView + GL baglami oldugu icin baska sekmedeyken ikinci bir harita
  // bellekte asili kaliyordu. Ekran odaktan cikinca sokuyoruz: onizleme
  // tamamen `plan` state'inden yeniden uretilebiliyor.
  const isFocused = useIsFocused();

  return (
    <View style={styles.result}>
      {/* Salt onizleme: kaydirma ScrollView'a kalsin, harita rotayi kendisi cerceveler. */}
      <Card padded={false} style={styles.mapCard}>
        {isFocused ? (
          <StationMap
            stations={stopStations}
            route={route}
            interactive={false}
            style={styles.mapPreview}
          />
        ) : (
          <View style={styles.mapPreview} />
        )}
      </Card>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryGrid}>
          <Summary label="Mesafe" value={`${Math.round(distanceKm)} km`} />
          <Summary label="Sürüş" value={formatMinutes(Math.round(driveMinutes))} />
          <Summary
            label="Şarj"
            value={
              trip.stops.length === 0
                ? 'Gerekmiyor'
                : formatMinutes(Math.round(trip.totalChargeMinutes))
            }
          />
          <Summary
            label="Varışta"
            value={trip.unreachable ? '—' : `%${Math.round(trip.arrivalPercent)}`}
          />
        </View>

        {trip.totalChargeCost > 0 && (
          <Text style={styles.summaryCost}>
            Tahmini şarj maliyeti {formatPrice(trip.totalChargeCost)}
          </Text>
        )}
      </Card>

      {trip.unreachable ? (
        <View style={styles.warnBox}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={styles.warnText}>
            Bu rotada menzilin yetmiyor ve ulaşabileceğin uygun istasyon bulunamadı. Daha yüksek
            batarya ile başlamayı dene.
          </Text>
        </View>
      ) : trip.stops.length === 0 ? (
        <View style={styles.okBox}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <Text style={styles.okText}>Şarj molası olmadan varabilirsin.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.stopsTitle}>Önerilen şarj molaları</Text>
          {trip.stops.map((stop, index) => (
            <Animated.View
              key={stop.station.id}
              entering={FadeInDown.delay(index * 70).duration(300)}>
              <Card style={styles.stopCard}>
                <View style={styles.stopHeader}>
                  <View style={styles.stopIndex}>
                    <Text style={styles.stopIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.stopName}>{stop.station.name}</Text>
                    <Text style={styles.stopMeta}>
                      {Math.round(stop.distanceFromStartKm)} km · {stop.station.operator}
                    </Text>
                  </View>
                </View>

                <View style={styles.stopStats}>
                  <Text style={styles.stopStat}>
                    %{Math.round(stop.arrivalPercent)} → %{Math.round(stop.departurePercent)}
                  </Text>
                  <Text style={styles.stopStat}>{formatEnergy(stop.addedKwh)}</Text>
                  <Text style={styles.stopStat}>
                    {formatMinutes(Math.round(stop.chargeMinutes))}
                  </Text>
                  <Text style={[styles.stopStat, styles.stopCost]}>{formatPrice(stop.cost)}</Text>
                </View>
              </Card>
            </Animated.View>
          ))}
        </>
      )}

      <Text style={styles.disclaimer}>
        Tahminler sabit tüketim varsayar. Hava, hız, yük ve rakım gerçek menzili değiştirir.
      </Text>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

/** Nominatim ile adres arama; secim yapilinca liste kapanir. */
function PlaceSearch({
  label,
  value,
  onSelect,
}: {
  label: string;
  value?: Place;
  onSelect: (place: Place) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController>(undefined);

  useEffect(() => {
    if (query.trim().length < 3 || query === value?.label) {
      setResults([]);
      return;
    }

    // Nominatim saniyede bir istek istiyor; her tusa basista sorgu atmiyoruz.
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      try {
        setResults(await geocode(query, controller.signal));
      } catch {
        // Iptal edilen veya basarisiz arama sessizce yok sayilir.
      } finally {
        setSearching(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, value?.label]);

  return (
    <View>
      <TextField
        label={label}
        placeholder="Şehir veya adres"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {searching && <ActivityIndicator style={styles.searching} color={colors.primary} />}

      {results.length > 0 && (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.results}>
          {results.map((place) => (
            <AnimatedPressable
              key={place.id}
              accessibilityRole="button"
              haptic="selection"
              onPress={() => {
                onSelect(place);
                setQuery(place.label);
                setResults([]);
              }}
              style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.resultText} numberOfLines={2}>
                {place.label}
              </Text>
            </AnimatedPressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  centered: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },

  title: { ...typography.h2, color: colors.text, paddingTop: spacing.sm },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xl },

  searching: { marginBottom: spacing.md },
  results: {
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultRowPressed: { backgroundColor: colors.surfaceMuted },
  resultText: { ...typography.caption, color: colors.text, flex: 1, marginLeft: spacing.sm },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1, marginLeft: spacing.sm },

  result: { marginTop: spacing.xxl },
  mapCard: { overflow: 'hidden', marginBottom: spacing.md },
  mapPreview: { height: 240 },
  summaryCard: { paddingBottom: spacing.lg },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryItem: { width: '50%', paddingVertical: spacing.sm },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  summaryValue: { ...typography.h3, color: colors.text, marginTop: 1 },
  summaryCost: {
    ...typography.caption,
    color: colors.primaryDark,
    marginTop: spacing.md,
    fontWeight: '600',
  },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.warningSoft,
  },
  warnText: { ...typography.caption, color: colors.text, flex: 1, marginLeft: spacing.sm },
  okBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.successSoft,
  },
  okText: { ...typography.caption, color: colors.text, flex: 1, marginLeft: spacing.sm },

  stopsTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xxl },
  stopCard: { marginTop: spacing.md, padding: spacing.lg },
  stopHeader: { flexDirection: 'row', alignItems: 'center' },
  stopIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stopIndexText: { ...typography.captionStrong, color: colors.white },
  stopName: { ...typography.bodyStrong, color: colors.text },
  stopMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  stopStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    justifyContent: 'space-between',
  },
  stopStat: { ...typography.caption, color: colors.textSecondary },
  stopCost: { color: colors.text, fontWeight: '700' },

  disclaimer: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xl },
});
