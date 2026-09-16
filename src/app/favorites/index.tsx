import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import {
  AnimatedPressable,
  Button,
  EmptyState,
  ListCardSkeleton,
  Refresher,
  StationCard,
} from '@/components';
import { useFavoriteIds, useToggleFavorite } from '@/queries/favorites';
import { useStations } from '@/queries/stations';
import { haversineKm } from '@/services/routing';
import { useLocationStore } from '@/store/location';
import { useMapIntentStore } from '@/store/mapIntent';
import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';

/** Favori istasyonlar; secilen istasyon harita sekmesinde sheet icinde acilir. */
export default function FavoritesScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { data: stations, isLoading: stationsLoading, refetch: refetchStations } = useStations();
  const {
    data: favoriteIds,
    isLoading: favoritesLoading,
    isRefetching,
    refetch: refetchFavorites,
  } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const userLocation = useLocationStore((s) => s.coords);
  const requestStationOnMap = useMapIntentStore((s) => s.openStation);

  const favorites = useMemo(() => {
    if (!stations || !favoriteIds) return [];
    return favoriteIds
      .map((id) => stations.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => (userLocation ? { ...s, distanceKm: haversineKm(userLocation, s) } : s));
  }, [stations, favoriteIds, userLocation]);

  const isLoading = stationsLoading || favoritesLoading;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={10}
            haptic="tap"
            onPress={() => router.back()}
            style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Favoriler</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.list}>
          <ListCardSkeleton />
          <ListCardSkeleton />
          <ListCardSkeleton />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="heart-outline"
            title="Henüz favori istasyon yok"
            description="Sık kullandığın istasyonları kalp ikonuyla işaretle; buradan tek dokunuşla ulaş."
            action={<Button label="Haritaya git" onPress={() => router.navigate('/map')} />}
          />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <Refresher
              refreshing={isRefetching}
              // Liste iki sorgunun kesisimi: ikisi de tazelenmeli.
              onRefresh={() => void Promise.all([refetchStations(), refetchFavorites()])}
            />
          }>
          {favorites.map((station, index) => (
            <Animated.View
              key={station.id}
              entering={FadeInDown.delay(index * 50).duration(280)}
              exiting={FadeOutLeft.duration(200)}
              layout={LinearTransition.duration(220)}
              style={styles.row}>
              <View style={styles.rowMain}>
                <StationCard
                  station={station}
                  onPress={() => {
                    requestStationOnMap(station.id);
                    // Once bu ekrani kapat, sonra sekme degistir: sekme grubu yeniden
                    // kurulmaz, harita yuklu kalir.
                    router.back();
                    router.navigate('/map');
                  }}
                />
              </View>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={`${station.name} favorilerden çıkar`}
                hitSlop={10}
                haptic="tap"
                scaleTo={0.85}
                onPress={() => toggleFavorite.mutate({ stationId: station.id, favorite: false })}
                style={styles.heartButton}>
                <Ionicons name="heart" size={18} color={colors.danger} />
              </AnimatedPressable>
            </Animated.View>
          ))}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerTitle: { ...typography.h3, color: colors.text },
  headerSpacer: { width: 40, height: 40 },

  emptyWrap: { flex: 1, justifyContent: 'center' },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    paddingRight: spacing.md,
  },
  rowMain: { flex: 1 },
  heartButton: {
    width: 36,
    height: 36,
    borderRadius: radius.chip,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
