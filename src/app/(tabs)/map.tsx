import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, FilterChip, SearchBar, StationCard } from '@/components';
import { StationMap } from '@/map';
import { mockStations } from '@/mocks/stations';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useVehicleStore } from '@/store/vehicles';
import type { Station, Vehicle } from '@/types/domain';

interface MapFilter {
  id: string;
  label: string;
  test: (station: Station) => boolean;
}

/**
 * "Aracima uygun" yalnizca aktif arac varken listelenir; arac yokken
 * hicbir seyi filtrelemeyen bir cip gostermek yaniltici olurdu.
 */
function buildFilters(vehicle?: Vehicle): MapFilter[] {
  const filters: MapFilter[] = [
    {
      id: 'available',
      label: 'Müsait',
      test: (s) => s.connectors.some((c) => c.status === 'AVAILABLE'),
    },
    { id: 'fast', label: 'Hızlı', test: (s) => s.connectors.some((c) => c.powerKw >= 50) },
  ];

  if (vehicle) {
    filters.push({
      id: 'vehicle',
      label: 'Aracıma uygun',
      test: (s) => s.connectors.some((c) => vehicle.connectors.includes(c.type)),
    });
  }

  filters.push({ id: 'open24h', label: '24 saat', test: (s) => s.isOpen24h });
  return filters;
}

export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const router = useRouter();
  const vehicles = useVehicleStore((state) => state.vehicles);
  const activeVehicleId = useVehicleStore((state) => state.activeVehicleId);

  const toggleFilter = (id: string) =>
    setActiveFilters((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const filters = useMemo(
    () => buildFilters(vehicles.find((v) => v.id === activeVehicleId)),
    [vehicles, activeVehicleId],
  );

  const stations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr');
    return mockStations.filter((station) => {
      const matchesQuery =
        !normalized ||
        station.name.toLocaleLowerCase('tr').includes(normalized) ||
        station.address.toLocaleLowerCase('tr').includes(normalized);

      const matchesFilters = activeFilters.every(
        (id) => filters.find((f) => f.id === id)?.test(station) ?? true,
      );

      return matchesQuery && matchesFilters;
    });
  }, [query, activeFilters, filters]);

  return (
    <View style={styles.root}>
      {/* Harita en altta; arama ve alt sheet uzerine biniyor. */}
      <StationMap
        stations={stations}
        selectedId={selectedId}
        onSelectStation={setSelectedId}
        style={styles.map}
      />

      <SafeAreaView edges={['top']} style={styles.header} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <Text style={styles.brand}>TORA WATT</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Bildirimler" hitSlop={10} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <SearchBar
          placeholder="Nereye gitmek istiyorsun?"
          value={query}
          onChangeText={setQuery}
          containerStyle={styles.search}
        />
      </SafeAreaView>

      <View style={[styles.sheet, shadows.sheet]}>
        <View style={styles.grabber} />

        <Text style={styles.sheetTitle}>
          {stations.length > 0 ? `Yakınında ${stations.length} istasyon` : 'Eşleşen istasyon yok'}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {filters.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              selected={activeFilters.includes(filter.id)}
              onPress={() => toggleFilter(filter.id)}
              style={styles.chip}
            />
          ))}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {stations.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="Sonuç bulunamadı"
              description="Filtreleri gevşetmeyi veya farklı bir arama yapmayı dene."
            />
          ) : (
            stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                selected={station.id === selectedId}
                onPress={() => router.push({ pathname: '/station/[id]', params: { id: station.id } })}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  header: { paddingHorizontal: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  brand: { ...typography.h3, letterSpacing: 1, color: colors.text },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: { marginTop: spacing.lg },

  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
    maxHeight: '52%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  chips: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  chip: { marginRight: spacing.sm },
  list: { paddingBottom: spacing.xl, paddingHorizontal: spacing.xs },
});
