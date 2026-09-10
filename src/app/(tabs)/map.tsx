import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, FilterChip, SearchBar, StationCard } from '@/components';
import { mockStations } from '@/mocks/stations';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import type { Station } from '@/types/domain';

/**
 * Yalnizca mevcut veriyle durustce uygulanabilen filtreler.
 * "Aracima uygun" ve "Favoriler" arac profili / favori listesi eklendiginde gelecek.
 */
const FILTERS = [
  { id: 'available', label: 'Müsait', test: (s: Station) => s.connectors.some((c) => c.status === 'AVAILABLE') },
  { id: 'fast', label: 'Hızlı', test: (s: Station) => s.connectors.some((c) => c.powerKw >= 50) },
  { id: 'open24h', label: '24 saat', test: (s: Station) => s.isOpen24h },
] as const;

export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (id: string) =>
    setActiveFilters((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const stations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr');
    return mockStations.filter((station) => {
      const matchesQuery =
        !normalized ||
        station.name.toLocaleLowerCase('tr').includes(normalized) ||
        station.address.toLocaleLowerCase('tr').includes(normalized);

      const matchesFilters = activeFilters.every(
        (id) => FILTERS.find((f) => f.id === id)?.test(station) ?? true,
      );

      return matchesQuery && matchesFilters;
    });
  }, [query, activeFilters]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
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

      {/* Harita saglayicisi secilmedi (spec bolum 24). MapProvider soyutlamasi gelince burasi doluyor. */}
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={28} color={colors.primary} />
        <Text style={styles.mapPlaceholderText}>Harita katmanı bekliyor</Text>
        <Text style={styles.mapPlaceholderHint}>Sağlayıcı seçimi yapılınca buraya gelecek</Text>
      </View>

      <View style={[styles.sheet, shadows.sheet]}>
        <View style={styles.grabber} />

        <Text style={styles.sheetTitle}>
          {stations.length > 0
            ? `Yakınında ${stations.length} istasyon`
            : 'Eşleşen istasyon yok'}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {FILTERS.map((filter) => (
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
            stations.map((station) => <StationCard key={station.id} station={station} />)
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
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

  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  mapPlaceholderText: { ...typography.bodyStrong, color: colors.text, marginTop: spacing.md },
  mapPlaceholderHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
    maxHeight: '58%',
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
