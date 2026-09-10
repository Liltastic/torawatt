import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, TextField } from '@/components';
import { mockStations } from '@/mocks/stations';
import { geocode, getRoute, type Place } from '@/services/routing';
import { planTrip, type TripPlan } from '@/services/tripPlanner';
import { useVehicleStore } from '@/store/vehicles';
import { colors, radius, spacing, typography } from '@/theme';
import { formatEnergy, formatMinutes, formatPrice } from '@/utils/format';

/** Varista bataryada birakilmasi istenen pay. */
const RESERVE_PERCENT = 10;

export default function RouteScreen() {
  const router = useRouter();
  const vehicles = useVehicleStore((state) => state.vehicles);
  const activeVehicleId = useVehicleStore((state) => state.activeVehicleId);
  const hasHydrated = useVehicleStore((state) => state.hasHydrated);
  const vehicle = vehicles.find((v) => v.id === activeVehicleId);

  const [from, setFrom] = useState<Place>();
  const [to, setTo] = useState<Place>();
  const [startPercent, setStartPercent] = useState('80');

  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string>();
  const [plan, setPlan] = useState<{ trip: TripPlan; distanceKm: number; driveMinutes: number }>();

  // Kayitli araclar yuklenmeden "arac yok" gostermek yaniltici olurdu.
  if (!hasHydrated) {
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
        stations: mockStations,
      });

      setPlan({ trip, distanceKm: route.distanceKm, driveMinutes: route.durationMinutes });
    } catch (e) {
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
          contentContainerStyle={styles.content}
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
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {plan && <PlanResult {...plan} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PlanResult({
  trip,
  distanceKm,
  driveMinutes,
}: {
  trip: TripPlan;
  distanceKm: number;
  driveMinutes: number;
}) {
  return (
    <View style={styles.result}>
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
            <Card key={stop.station.id} style={styles.stopCard}>
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
        <View style={styles.results}>
          {results.map((place) => (
            <Pressable
              key={place.id}
              accessibilityRole="button"
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
            </Pressable>
          ))}
        </View>
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
