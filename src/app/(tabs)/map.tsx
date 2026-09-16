import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetScrollView,
  useBottomSheet,
  type BottomSheetBackgroundProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  AnimatedPressable,
  AvailabilityBadge,
  Button,
  ChargingMiniBar,
  ConnectorCard,
  EmptyState,
  FavoriteHeart,
  FilterChip,
  Logo,
  SearchBar,
  SegmentedControl,
  StationCard,
  StationCardSkeleton,
  useChargingMiniBarInset,
} from '@/components';
import { BASEMAPS, StationMap, type StationMapHandle } from '@/map';
import { useIsFavorite, useToggleFavorite } from '@/queries/favorites';
import { useActiveReservation } from '@/queries/reservations';
import { useStations } from '@/queries/stations';
import { useActiveVehicle } from '@/queries/vehicles';
import { haversineKm } from '@/services/routing';
import { useLocationStore } from '@/store/location';
import { useMapIntentStore } from '@/store/mapIntent';
import { useMapStyleStore } from '@/store/mapStyle';
import { createThemedStyles, radius, shadows, spacing, typography, useColors } from '@/theme';
import {
  effectiveReservationStatus,
  reservationStatusLabels,
  stationAvailability,
  type Station,
  type Vehicle,
} from '@/types/domain';
import { formatPrice, formatTime } from '@/utils/format';
import { GLASS_ENABLED } from '@/utils/glass';
import { haptics } from '@/utils/haptics';
import { useTabBarInset } from '@/utils/tabBar';

interface MapFilter {
  id: string;
  label: string;
  test: (station: Station) => boolean;
}

/**
 * Kapali (peek): haritanin cogu gorunur ve etkilesim orada olur.
 * Yari: liste + haritayi paylasir. Acik: liste veya istasyon detayi tum dikkati alir.
 * Oranlar, sekme cubugunun USTUNDE gorunen yuksekligin payidir (bkz. sheetSnapPoints).
 */
const SHEET_SNAP_FRACTIONS = [0.15, 0.46, 0.82] as const;
const SHEET_SNAP_POINTS = SHEET_SNAP_FRACTIONS.map((f) => `${Math.round(f * 100)}%`);

const DETAIL_TABS = [
  { value: 'station' as const, label: 'İstasyon' },
  { value: 'location' as const, label: 'Konum' },
];
type DetailTab = (typeof DETAIL_TABS)[number]['value'];

/**
 * Sheet yukari cekildikce arka planini kademeli opaklastirir: kapaliyken
 * altindaki harita hafifce sezilir, acikken liste/detay tek basina one cikar.
 */
function SheetBackground({ animatedIndex, style }: BottomSheetBackgroundProps) {
  const styles = useStyles();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [0, 1, 2], [0.88, 0.97, 1], Extrapolation.CLAMP),
  }));

  return <Animated.View pointerEvents="none" style={[style, styles.sheetBackground, animatedStyle]} />;
}

/** Bu indeksin altinda (peek'e yakin) footer gizlenir; sheet kucukken basligin ustune binmesin. */
const FOOTER_VISIBLE_FROM_INDEX = 0.6;

/** Harita uzerindeki yuvarlak butonlar (katman secici + konumuma git). */
const MAP_FAB_SIZE = 48;
const MAP_FAB_STACK_HEIGHT = MAP_FAB_SIZE * 2 + spacing.sm;
/**
 * Butonlar sheet bu indekse yaklasinca tamamen soluyor (mapFabsStyle). iOS'ta cam
 * zeminleri bu noktadan sonra kapatiliyor: opakligi 0'a inen bir ust gorunumun
 * icindeki cam, gorunur olunca bir daha cizilmiyor (bkz. utils/glass).
 */
const FAB_GLASS_OFF_FROM_INDEX = 1.45;

/**
 * Kutuphanenin footer'i sheet'in gorunur alaninin altina yapisir; sheet
 * peek konumundayken bu alan o kadar kucuk ki footer basligin ustune
 * cikiyordu. Sheet asagi indikce footer'i soluklastirip dokunmaya kapatiyoruz.
 */
function DetailFooter({
  animatedFooterPosition,
  bottomInset,
  reservedBottom,
  children,
}: BottomSheetFooterProps & {
  bottomInset: number;
  /**
   * Butonlarin altinda bos birakilan alan: sarj surerken mini cubuk tam
   * buraya oturuyor. Footer'i yukari kaydirmak yerine kendi zeminini uzatiyoruz;
   * boylece butonlarla mini cubuk arasinda kayan liste gorunmuyor.
   */
  reservedBottom: number;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const { animatedIndex } = useBottomSheet();
  const [interactive, setInteractive] = useState(true);

  useAnimatedReaction(
    () => animatedIndex.value >= FOOTER_VISIBLE_FROM_INDEX,
    (visible, previous) => {
      if (visible !== previous) runOnJS(setInteractive)(visible);
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [0, FOOTER_VISIBLE_FROM_INDEX, 1],
      [0, 0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <BottomSheetFooter animatedFooterPosition={animatedFooterPosition} bottomInset={bottomInset}>
      <Animated.View
        pointerEvents={interactive ? 'auto' : 'none'}
        style={[
          styles.detailFooter,
          reservedBottom > 0 && { paddingBottom: spacing.md + reservedBottom },
          animatedStyle,
        ]}>
        {children}
      </Animated.View>
    </BottomSheetFooter>
  );
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
  const colors = useColors();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>();
  const [detailTab, setDetailTab] = useState<DetailTab>('station');
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<StationMapHandle>(null);
  // Sheet bu iki degeri kendisi yazar; "konumuma git" butonu sheet'in ustunde onunla birlikte kayar.
  const sheetIndex = useSharedValue(1);
  const sheetPosition = useSharedValue(windowHeight);

  const activeVehicle = useActiveVehicle();
  const activeReservation = useActiveReservation();
  const { data: allStations, isLoading, isError, error, refetch } = useStations();

  // iOS sekme cubugu yari saydam ve icerigin USTUNE biniyor; sheet'in govdesi
  // cubugun altindan kayar, listenin son ogesi ise bu kadar yukarida bitmeli
  // (bkz. utils/tabBar). Android'de 0.
  const tabBarInset = useTabBarInset();
  // Sarj surerken sekme cubugunun ustunde mini sarj cubugu duruyor; o da
  // sheet'in uzerine biniyor (bkz. components/ChargingMiniBar).
  const miniBarInset = useChargingMiniBarInset();
  const bottomChrome = tabBarInset + miniBarInset;
  const listContentStyle = { ...styles.list, paddingBottom: spacing.xl + bottomChrome };

  // Yuzdelik snap noktalari cubugun arkasinda kalan ~83pt'yi de sayiyordu;
  // peek konumunda cubugun ustunde neredeyse bir sey kalmiyordu. Oranlari
  // cubugun ustundeki kullanilabilir yukseklige uygulayip payi geri ekliyoruz:
  // gorunen kisim tasarimdaki oran, govde yine cubugun altina uzaniyor. Mini
  // sarj cubugu da ayni sekilde sayiliyor; yoksa peek'teki baslik onun altinda
  // kaliyordu. Kapsayici olculene kadar (ve Android'de, sarj yokken) yuzdeler
  // aynen kalir.
  const [sheetContainerHeight, setSheetContainerHeight] = useState(0);
  const sheetSnapPoints = useMemo<(string | number)[]>(() => {
    if (bottomChrome <= 0 || sheetContainerHeight <= 0) return SHEET_SNAP_POINTS;
    const usable = sheetContainerHeight - bottomChrome;
    return SHEET_SNAP_FRACTIONS.map((f) => Math.round(usable * f + bottomChrome));
  }, [bottomChrome, sheetContainerHeight]);

  const basemap = useMapStyleStore((s) => s.basemap);
  const toggleBasemap = useMapStyleStore((s) => s.toggle);

  // Baslik (logo + arama + varsa rezervasyon bandi) haritanin uzerine biniyor;
  // haritanin hata afisi onun arkasinda kalip okunamiyordu. Yuksekligi olcup
  // afisi altina gonderiyoruz - rezervasyon bandi acilip kapandikca da guncellenir.
  const [headerHeight, setHeaderHeight] = useState(0);

  const userLocation = useLocationStore((s) => s.coords);
  const locationStatus = useLocationStore((s) => s.status);
  const ensureLocation = useLocationStore((s) => s.ensure);
  const refreshLocation = useLocationStore((s) => s.refresh);
  const hasCenteredOnUser = useRef(false);

  useEffect(() => {
    ensureLocation();
  }, [ensureLocation]);

  // Ilk konum geldiginde kamerayi kullaniciya getir (yalnizca bir kez; kullanici
  // haritada bir yere bakiyorsa sonraki konum guncellemeleri onu surtuklemesin).
  useEffect(() => {
    if (!userLocation || hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;
    mapRef.current?.flyTo(userLocation, { zoom: 12.5, offsetY: windowHeight * 0.12 });
  }, [userLocation, windowHeight]);

  const toggleFilter = (id: string) =>
    setActiveFilters((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const filters = useMemo(() => buildFilters(activeVehicle), [activeVehicle]);

  const stations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr');
    const matching = (allStations ?? []).filter((station) => {
      const matchesQuery =
        !normalized ||
        station.name.toLocaleLowerCase('tr').includes(normalized) ||
        station.address.toLocaleLowerCase('tr').includes(normalized);

      const matchesFilters = activeFilters.every(
        (id) => filters.find((f) => f.id === id)?.test(station) ?? true,
      );

      return matchesQuery && matchesFilters;
    });

    if (!userLocation) return matching;

    // Mesafe istemcide hesaplanir (backend konum bilmiyor); en yakin en ustte.
    return matching
      .map((station) => ({ ...station, distanceKm: haversineKm(userLocation, station) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allStations, query, activeFilters, filters, userLocation]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedId),
    [stations, selectedId],
  );

  const openStation = useCallback(
    (station: Station) => {
      setSelectedId(station.id);
      setSelectedConnectorId(undefined);
      setDetailTab('station');
      // Yari acik: detay okunur, secili pin ustteki harita alaninda ortada kalir.
      sheetRef.current?.snapToIndex(1);
      mapRef.current?.flyTo(station, { zoom: 14, offsetY: windowHeight * 0.2 });
    },
    [windowHeight],
  );

  // Favoriler gibi baska ekranlardan gelen "haritada ac" istegi (bkz. store/mapIntent).
  const requestedStationId = useMapIntentStore((s) => s.stationId);
  const consumeMapIntent = useMapIntentStore((s) => s.consume);
  useEffect(() => {
    if (!requestedStationId) return;
    const station = allStations?.find((s) => s.id === requestedStationId);
    if (!station) return;
    // Sekme gecisi ilk karesini cizmeden sheet'i ve kamerayi oynatmak takilma yaratiyor.
    // Istek, acildiktan SONRA tuketilir: once tuketilseydi bagimlilik degisip
    // temizleme calisir ve bekleyen kare iptal olurdu.
    const frame = requestAnimationFrame(() => {
      openStation(station);
      consumeMapIntent();
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedStationId, allStations, openStation, consumeMapIntent]);

  const handleLocate = useCallback(async () => {
    if (locationStatus === 'denied') {
      Linking.openSettings();
      return;
    }
    const coords = await refreshLocation();
    if (!coords) return;
    haptics.tap();
    mapRef.current?.flyTo(coords, { zoom: 13.5, offsetY: windowHeight * 0.12 });
  }, [locationStatus, refreshLocation, windowHeight]);

  const mapFabsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetPosition.value - MAP_FAB_STACK_HEIGHT - spacing.lg }],
    opacity: interpolate(sheetIndex.value, [1, 1.5], [1, 0], Extrapolation.CLAMP),
  }));

  // Yalnizca iOS cam butonlar icin; Android'de hep false kalir ve hic render tetiklemez.
  const [fabGlassOff, setFabGlassOff] = useState(false);
  useAnimatedReaction(
    () => GLASS_ENABLED && sheetIndex.value >= FAB_GLASS_OFF_FROM_INDEX,
    (off, previous) => {
      if (off !== previous) runOnJS(setFabGlassOff)(off);
    },
  );

  const closeStationDetail = useCallback(() => {
    setSelectedId(undefined);
    setSelectedConnectorId(undefined);
    sheetRef.current?.snapToIndex(1);
  }, []);

  // Bos harita alanina dokunuldugunda niyet haritayla etkilesim kurmaktir;
  // sheet'i (ve varsa acik istasyon detayini) geri cekip haritaya yer aciyoruz.
  const handleMapPress = useCallback(() => {
    setSelectedId(undefined);
    setSelectedConnectorId(undefined);
    sheetRef.current?.snapToIndex(0);
  }, []);

  const openDirections = useCallback((station: Station) => {
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
  }, []);

  const renderFooter = useCallback(
    (footerProps: BottomSheetFooterProps) => {
      if (!selectedStation) return null;
      const connector = selectedStation.connectors.find((c) => c.id === selectedConnectorId);

      // Sheet ekranin dibine kadar iniyor; iOS'ta cam cubuk yer kaplamayip
      // icerigin ustune bindigi icin butonlari o kadar yukari aliyoruz.
      return (
        <DetailFooter {...footerProps} bottomInset={tabBarInset} reservedBottom={miniBarInset}>
          <Button
            label="Rezerve Et"
            variant="secondary"
            disabled={!connector}
            style={styles.secondaryAction}
            onPress={() =>
              connector &&
              router.push({
                pathname: '/booking/new',
                params: { stationId: selectedStation.id, connectorId: connector.id },
              })
            }
          />
          <Button
            label={connector ? 'Şarj Başlat' : 'Önce soket seç'}
            disabled={!connector}
            style={styles.primaryAction}
            onPress={() =>
              connector &&
              router.push({
                pathname: '/charger/[connectorId]',
                params: { connectorId: connector.id, stationId: selectedStation.id },
              })
            }
          />
        </DetailFooter>
      );
    },
    [selectedStation, selectedConnectorId, router, tabBarInset, miniBarInset, styles],
  );

  return (
    <View
      style={styles.root}
      onLayout={(e) => setSheetContainerHeight(e.nativeEvent.layout.height)}>
      {/* Harita en altta; arama ve alt sheet uzerine biniyor. */}
      <StationMap
        ref={mapRef}
        stations={stations}
        selectedId={selectedId}
        userLocation={userLocation}
        onSelectStation={(id) => {
          const station = stations.find((s) => s.id === id);
          if (station) openStation(station);
        }}
        onMapPress={handleMapPress}
        errorTopOffset={headerHeight ? headerHeight + spacing.md : undefined}
        style={styles.map}
      />

      {/* Sheet'in hemen ustunde durur, onunla birlikte kayar; sheet buyuyunce kaybolur. */}
      <Animated.View style={[styles.mapFabs, mapFabsStyle]} pointerEvents="box-none">
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Harita görünümü: ${BASEMAPS[basemap].label}. Değiştirmek için dokun.`}
          haptic="tap"
          onPress={toggleBasemap}
          style={[styles.mapFab, GLASS_ENABLED && styles.glassSurface, styles.basemapFab]}>
          {GLASS_ENABLED && (
            <GlassView
              pointerEvents="none"
              glassEffectStyle={fabGlassOff ? 'none' : 'regular'}
              style={styles.fabGlass}
            />
          )}
          <Ionicons
            name={basemap === 'studio' ? 'layers' : 'layers-outline'}
            size={20}
            color={basemap === 'studio' ? colors.primary : colors.textSecondary}
          />
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={
            locationStatus === 'denied' ? 'Konum izni ayarlarını aç' : 'Konumuma git'
          }
          haptic="none"
          onPress={handleLocate}
          style={[styles.mapFab, GLASS_ENABLED && styles.glassSurface]}>
          {GLASS_ENABLED && (
            <GlassView
              pointerEvents="none"
              glassEffectStyle={fabGlassOff ? 'none' : 'regular'}
              style={styles.fabGlass}
            />
          )}
          <Ionicons
            name={locationStatus === 'denied' ? 'navigate-outline' : 'navigate'}
            size={20}
            color={locationStatus === 'granted' ? colors.location : colors.textSecondary}
          />
        </AnimatedPressable>
      </Animated.View>

      <SafeAreaView
        edges={['top']}
        style={styles.header}
        pointerEvents="box-none"
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <View style={styles.headerRow}>
          <Logo width={104} />
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Bildirimler"
            hitSlop={10}
            haptic="tap"
            onPress={() => router.push('/notifications')}
            style={[styles.iconButton, GLASS_ENABLED && styles.glassSurface]}>
            {GLASS_ENABLED && (
              <GlassView pointerEvents="none" glassEffectStyle="regular" style={styles.iconButtonGlass} />
            )}
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </AnimatedPressable>
        </View>

        <SearchBar
          placeholder="Nereye gitmek istiyorsun?"
          value={query}
          onChangeText={setQuery}
          containerStyle={styles.search}
          glass
        />

        {activeReservation && (
          <Animated.View entering={FadeInDown} exiting={FadeOutUp.duration(150)}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Aktif rezervasyonu aç"
              haptic="tap"
              scaleTo={0.98}
              onPress={() =>
                router.push({ pathname: '/booking/[id]', params: { id: activeReservation.id } })
              }
              style={({ pressed }) => [styles.reservationBanner, pressed && styles.bannerPressed]}>
              <Ionicons name="calendar" size={18} color={colors.white} />
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  {activeReservation.stationName}
                </Text>
                <Text style={styles.bannerMeta}>
                  {formatTime(activeReservation.startsAt)} ·{' '}
                  {reservationStatusLabels[effectiveReservationStatus(activeReservation)]}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.white} />
            </AnimatedPressable>
          </Animated.View>
        )}
      </SafeAreaView>

      <BottomSheet
        ref={sheetRef}
        snapPoints={sheetSnapPoints}
        index={1}
        // bottomInset BILEREK verilmiyor: kutuphane onu kapsayici View'a
        // `bottom` + overflow:hidden olarak uyguluyor; sheet cubugun ustunde
        // keskin bir cizgiyle bitip arkasinda harita gorunuyordu. Sheet dibe
        // kadar iner, cam cubugun altindan gecer; icerigin ve footer'in cubugun
        // ustunde kalmasini paylar (listContentStyle, detailContentStyle,
        // DetailFooter bottomInset) saglar.
        animatedIndex={sheetIndex}
        animatedPosition={sheetPosition}
        enableDynamicSizing={false}
        backgroundComponent={SheetBackground}
        handleIndicatorStyle={styles.grabber}
        handleStyle={styles.handle}
        footerComponent={selectedStation ? renderFooter : undefined}
        style={shadows.sheet}>
        {selectedStation ? (
          <StationDetail
            station={selectedStation}
            tab={detailTab}
            onTabChange={setDetailTab}
            selectedConnectorId={selectedConnectorId}
            onSelectConnector={setSelectedConnectorId}
            onBack={closeStationDetail}
            onDirections={() => openDirections(selectedStation)}
          />
        ) : (
          <>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {isLoading
                  ? 'Yükleniyor…'
                  : isError
                    ? 'İstasyonlar yüklenemedi'
                    : stations.length === 0
                      ? 'Eşleşen istasyon yok'
                      : userLocation
                        ? `Sana en yakın ${stations.length} istasyon`
                        : `${stations.length} istasyon`}
              </Text>

              {!isLoading && !isError && (
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
              )}
            </View>

            {isLoading ? (
              <View style={styles.list}>
                <StationCardSkeleton />
                <StationCardSkeleton />
                <StationCardSkeleton />
              </View>
            ) : isError ? (
              <View style={styles.list}>
                <EmptyState
                  icon="cloud-offline-outline"
                  title="Sunucuya ulaşılamadı"
                  description={
                    error instanceof Error ? error.message : 'Bağlantını kontrol edip tekrar dene.'
                  }
                  action={
                    <AnimatedPressable
                      accessibilityRole="button"
                      haptic="press"
                      onPress={() => refetch()}
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed && styles.retryButtonPressed,
                      ]}>
                      <Text style={styles.retryText}>Tekrar dene</Text>
                    </AnimatedPressable>
                  }
                />
              </View>
            ) : stations.length === 0 ? (
              <View style={styles.list}>
                <EmptyState
                  icon="search-outline"
                  title="Sonuç bulunamadı"
                  description="Filtreleri gevşetmeyi veya farklı bir arama yapmayı dene."
                />
              </View>
            ) : (
              <BottomSheetScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={listContentStyle}>
                {stations.map((station, index) => (
                  <Animated.View
                    key={station.id}
                    entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(320)}
                    layout={LinearTransition.duration(220)}>
                    <StationCard station={station} onPress={() => openStation(station)} />
                  </Animated.View>
                ))}
              </BottomSheetScrollView>
            )}
          </>
        )}
      </BottomSheet>

      {/* Sheet'ten SONRA: ikisi de mutlak konumlu, cubuk ustte cizilmeli. */}
      <ChargingMiniBar />
    </View>
  );
}

/** Istasyon detayi - referans tasarimda oldugu gibi haritadan ayrilmadan sheet icinde acilir. */
function StationDetail({
  station,
  tab,
  onTabChange,
  selectedConnectorId,
  onSelectConnector,
  onBack,
  onDirections,
}: {
  station: Station;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  selectedConnectorId?: string;
  onSelectConnector: (id: string) => void;
  onBack: () => void;
  onDirections: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  // enableFooterMarginAdjustment yalnizca footer'in OLCULEN yuksekligini pay
  // olarak ekliyor; DetailFooter'a verdigimiz bottomInset footer'i yukari
  // kaydiriyor ama o olcuye girmiyor. Payi biz ekliyoruz; yoksa iOS'ta icerigin
  // son ~83pt'si (Ucretlendirme karti) butonlarin altinda kaliyor.
  //
  // DIKKAT: contentContainerStyle DUZ bir nesne olmali. Dizi verilirse
  // kutuphane (useBottomSheetContentContainerStyle) StyleSheet.compose ile yine
  // dizi uretiyor, icinden paddingBottom okuyamiyor ve kendi
  // `paddingBottom: 0 + footerHeight` degerini bizimkinin uzerine yaziyor.
  // "Pay ise yaramiyor" diye gorunen onceki denemelerin sebebi buydu.
  const tabBarInset = useTabBarInset();
  const detailContentStyle = { ...styles.detailContent, paddingBottom: spacing.xl + tabBarInset };
  const availability = stationAvailability(station);
  const availableCount = station.connectors.filter((c) => c.status === 'AVAILABLE').length;
  const selectedConnector = station.connectors.find((c) => c.id === selectedConnectorId);
  const isFavorite = useIsFavorite(station.id);
  const toggleFavorite = useToggleFavorite();

  return (
    <>
      <View style={styles.detailHeader}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Listeye dön"
          hitSlop={10}
          haptic="tap"
          onPress={onBack}
          style={styles.detailBackButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </AnimatedPressable>

        <View style={styles.detailHeaderText}>
          <Text style={styles.detailName} numberOfLines={1}>
            {station.name}
          </Text>
          <View style={styles.detailStatusRow}>
            <AvailabilityBadge status={availability} />
            <Text style={styles.detailStatusText}>
              {availableCount}/{station.connectors.length} müsait
            </Text>
          </View>
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          accessibilityState={{ selected: isFavorite }}
          hitSlop={10}
          haptic={isFavorite ? 'tap' : 'success'}
          scaleTo={0.85}
          onPress={() => toggleFavorite.mutate({ stationId: station.id, favorite: !isFavorite })}
          style={styles.favoriteIconButton}>
          <FavoriteHeart active={isFavorite} size={19} />
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Yol tarifi"
          hitSlop={10}
          haptic="tap"
          onPress={onDirections}
          style={styles.directionsIconButton}>
          <Ionicons name="navigate" size={17} color={colors.white} />
        </AnimatedPressable>
      </View>

      <SegmentedControl options={DETAIL_TABS} value={tab} onChange={onTabChange} style={styles.detailTabs} />

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        enableFooterMarginAdjustment
        contentContainerStyle={detailContentStyle}>
        {tab === 'station' ? (
          <>
            <Text style={styles.detailSectionHint}>Şarj başlatmak için bir soket seç.</Text>
            {station.connectors.map((connector, index) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                index={index + 1}
                selected={connector.id === selectedConnectorId}
                onPress={() => onSelectConnector(connector.id)}
              />
            ))}

            <Text style={styles.detailSectionTitle}>Ücretlendirme</Text>
            <View style={styles.detailInfoCard}>
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
                last
              />
            </View>
          </>
        ) : (
          <View style={styles.detailInfoCard}>
            <InfoRow label="İşletmeci" value={station.operator} />
            <InfoRow label="Adres" value={station.address} />
            <InfoRow label="Çalışma saatleri" value={station.isOpen24h ? '7/24 açık' : 'Belirtilmemiş'} />
            <InfoRow
              label="Olanaklar"
              value={station.amenities.length > 0 ? station.amenities.join(', ') : 'Belirtilmemiş'}
              last
            />
          </View>
        )}
      </BottomSheetScrollView>
    </>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  header: { paddingHorizontal: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
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

  mapFabs: { position: 'absolute', top: 0, right: spacing.xl },
  mapFab: {
    width: MAP_FAB_SIZE,
    height: MAP_FAB_SIZE,
    borderRadius: MAP_FAB_SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  basemapFab: { marginBottom: spacing.sm },
  // iOS 26+ cam zemin (bkz. utils/glass): dolgu, kenarlik ve golge camdan geliyor.
  // Android'de bu stiller hic uygulanmiyor.
  glassSurface: { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0 },
  fabGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: MAP_FAB_SIZE / 2,
  },
  iconButtonGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },

  reservationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: colors.primaryStrong,
  },
  bannerPressed: { backgroundColor: colors.primaryStrongPressed },
  bannerText: { flex: 1, marginHorizontal: spacing.md },
  bannerTitle: { ...typography.captionStrong, color: colors.white },
  bannerMeta: { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: { paddingTop: spacing.sm, paddingBottom: 0 },
  sheetHeader: { paddingTop: spacing.xs },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  chips: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  chip: { marginRight: spacing.sm },
  list: {
    paddingHorizontal: spacing.xs,
  },
  loadingWrap: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  retryButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.primarySoft,
  },
  retryButtonPressed: { backgroundColor: colors.primarySoftPressed },
  retryText: { ...typography.body, color: colors.primaryText, fontWeight: '600' },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  detailBackButton: {
    width: 36,
    height: 36,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderText: { flex: 1, marginHorizontal: spacing.md },
  detailName: { ...typography.h3, color: colors.text },
  detailStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  detailStatusText: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm },
  favoriteIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  directionsIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.chip,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailTabs: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  detailContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  detailSectionHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  detailSectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  detailInfoCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
  },
  infoRow: { paddingVertical: spacing.md },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { ...typography.caption, color: colors.textSecondary },
  infoValue: { ...typography.body, color: colors.text, marginTop: 2 },

  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  secondaryAction: { flex: 1, marginRight: spacing.md },
  primaryAction: { flex: 1 },
}));
