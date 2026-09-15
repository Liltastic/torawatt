import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { ActivityIndicator, AppState, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useMapStyleStore } from '@/store/mapStyle';
import { colors, radius, spacing, typography } from '@/theme';
import { stationAvailability, type Coordinate, type Station } from '@/types/domain';

import { BASEMAPS, buildMapHtml } from './mapHtml';

/**
 * Harita, uzerine binen basligin arkasina kadar uzaniyor; hata afisi de bu
 * kadar asagida basliyor. Cagiran ekran kendi basliginin gercek yuksekligini
 * biliyorsa `errorTopOffset` ile bildirir - sabit bir deger, guvenli alani
 * buyuk olan telefonlarda (veya rezervasyon bandi acikken) afisi arama
 * kutusunun altinda birakip okunmaz hale getiriyordu.
 */
const ERROR_BANNER_TOP = 130;

/** Harita acildiktan sonra gelen gecici hatalarin afiste kalma suresi. */
const ERROR_BANNER_TIMEOUT_MS = 6000;

/** Istanbul merkezi; konum alinana kadar varsayilan kamera. */
const DEFAULT_CENTER = { centerLatitude: 41.055, centerLongitude: 29.0, zoom: 10.5 };

export interface FlyToOptions {
  zoom?: number;
  /**
   * Hedefi ekran merkezinden kac piksel (dp) yukari kaydirarak ortalayacagi.
   * Alt sheet haritanin yarisini kapatirken pin gorunur alanin ortasina gelsin diye.
   */
  offsetY?: number;
}

export interface StationMapHandle {
  flyTo: (target: Coordinate, options?: FlyToOptions) => void;
}

export interface MapRoute {
  /** [lng, lat] dizisi (OSRM cikisi ile ayni sira). */
  geometry: [number, number][];
  start: Coordinate;
  end: Coordinate;
}

interface StationMapProps {
  stations: Station[];
  selectedId?: string;
  /** Kullanicinin konumu; verilirse haritada mavi nokta olarak cizilir. */
  userLocation?: Coordinate;
  /** Cizilecek rota; verildiginde kamera rotayi cerceveler. */
  route?: MapRoute;
  /** false: salt onizleme, dokunma/kaydirma haritaya gitmez (ScrollView icinde kart olarak). */
  interactive?: boolean;
  onSelectStation?: (id: string) => void;
  /** Istasyon/cluster disindaki bos harita alanina dokunulunca tetiklenir. */
  onMapPress?: () => void;
  /** Hata afisinin ustten mesafesi; ekranin haritaya binen basliginin yuksekligi. */
  errorTopOffset?: number;
  style?: StyleProp<ViewStyle>;
}

type BridgeMessage =
  | { type: 'ready' }
  | { type: 'stationPress'; id: string }
  | { type: 'mapPress' }
  | { type: 'camera'; lng: number; lat: number; zoom: number }
  | { type: 'error'; message: string };

export const StationMap = forwardRef<StationMapHandle, StationMapProps>(function StationMap(
  {
    stations,
    selectedId,
    userLocation,
    route,
    interactive = true,
    onSelectStation,
    onMapPress,
    errorTopOffset,
    style,
  },
  ref,
) {
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  // showError icinde guncel deger lazim; state'i bagimlilik yapinca her
  // hazir/degil gecisinde yeni fonksiyon uretilirdi.
  const readyRef = useRef(false);
  readyRef.current = ready;
  const [error, setError] = useState<string | null>(null);

  // Taban harita degisince WebView bastan kuruluyor (iki farkli GL kutuphanesi).
  // Harita kendi kamerasini her hareket sonunda bildiriyor; yeni harita
  // Istanbul'a sicramak yerine kullanicinin baktigi yerden acilsin diye.
  const basemap = useMapStyleStore((s) => s.basemap);
  const cameraRef = useRef(DEFAULT_CENTER);

  const html = useMemo(() => buildMapHtml({ ...cameraRef.current, basemap }), [basemap]);

  // Karo/glif hatalari geciciydi ama afis bir daha hic temizlenmiyordu: tek bir
  // 404 kirmizi kutuyu kalici olarak ekranda birakiyordu. Harita ZATEN acildiysa
  // afisi birkac saniye sonra kendiliginden kapatiyoruz; hic acilamadiysa
  // kapatmiyoruz, yoksa kullanici bos bir ekranla aciklamasiz kalir.
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearErrorTimer = useCallback(() => {
    if (errorTimer.current) {
      clearTimeout(errorTimer.current);
      errorTimer.current = null;
    }
  }, []);

  const showError = useCallback(
    (message: string) => {
      setError(message);
      clearErrorTimer();
      if (readyRef.current) {
        errorTimer.current = setTimeout(() => setError(null), ERROR_BANNER_TIMEOUT_MS);
      }
    },
    [clearErrorTimer],
  );

  useEffect(() => clearErrorTimer, [clearErrorTimer]);

  useEffect(() => {
    setReady(false);
    setError(null);
    clearErrorTimer();
  }, [basemap, clearErrorTimer]);


  const inject = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(`window.__tw && (${script}); true;`);
  }, []);

  // Nabiz animasyonu her karede haritanin tamamini yeniden cizdiriyor. Ekran
  // odakta degilken (baska sekme) veya uygulama arka plandayken donmesin.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!ready) return;
    const sync = (active: boolean) => inject(`window.__tw.setPulse(${active})`);
    sync(isFocused && AppState.currentState === 'active');
    const sub = AppState.addEventListener('change', (state) =>
      sync(isFocused && state === 'active'),
    );
    return () => {
      sub.remove();
      sync(false);
    };
  }, [ready, isFocused, inject]);

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: stations.map((station) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [station.longitude, station.latitude],
        },
        properties: {
          id: station.id,
          status: stationAvailability(station),
          available: station.connectors.filter((c) => c.status === 'AVAILABLE').length,
          selected: station.id === selectedId,
        },
      })),
    }),
    [stations, selectedId],
  );

  const pushStations = useCallback(() => {
    inject(`window.__tw.setStations(${JSON.stringify(geojson)})`);
  }, [geojson, inject]);

  const pushUserLocation = useCallback(() => {
    if (!userLocation) return;
    inject(`window.__tw.setUserLocation(${userLocation.longitude}, ${userLocation.latitude})`);
  }, [userLocation, inject]);

  // Istasyon listesi veya secim degistiginde haritayi tazele.
  useEffect(() => {
    if (ready) pushStations();
  }, [ready, pushStations]);

  useEffect(() => {
    if (ready) pushUserLocation();
  }, [ready, pushUserLocation]);

  const pushRoute = useCallback(() => {
    if (!route) {
      inject('window.__tw.setRoute(null, [])');
      return;
    }
    const endpoints = [
      { lng: route.start.longitude, lat: route.start.latitude, kind: 'start' },
      { lng: route.end.longitude, lat: route.end.latitude, kind: 'end' },
    ];
    inject(`window.__tw.setRoute(${JSON.stringify(route.geometry)}, ${JSON.stringify(endpoints)})`);
  }, [route, inject]);

  useEffect(() => {
    if (ready) pushRoute();
  }, [ready, pushRoute]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (target, options) => {
        inject(
          `window.__tw.flyTo(${target.longitude}, ${target.latitude}, ${options?.zoom ?? 'null'}, ${options?.offsetY ?? 0})`,
        );
      },
    }),
    [inject],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: BridgeMessage;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (message.type === 'ready') {
        setReady(true);
        pushStations();
        pushUserLocation();
        pushRoute();
      } else if (message.type === 'stationPress') {
        onSelectStation?.(message.id);
      } else if (message.type === 'mapPress') {
        onMapPress?.();
      } else if (message.type === 'camera') {
        // Acilamamis bir harita kamerasini NaN olarak bildirebiliyor; onu
        // saklarsak bir sonraki taban harita "Invalid LngLat object: (NaN, NaN)"
        // ile aciliyor, yani bozuk harita saglam olani da zehirliyor.
        const valid =
          Number.isFinite(message.lat) &&
          Number.isFinite(message.lng) &&
          Number.isFinite(message.zoom);
        if (valid) {
          cameraRef.current = {
            centerLatitude: message.lat,
            centerLongitude: message.lng,
            zoom: message.zoom,
          };
        }
      } else if (message.type === 'error') {
        showError(message.message);
      }
    },
    [onSelectStation, onMapPress, pushStations, pushUserLocation, pushRoute, showError],
  );

  return (
    <View style={[styles.container, style]} pointerEvents={interactive ? 'auto' : 'none'}>
      <WebView
        // Katman degisiminde eski GL kutuphanesi bellekte kalmasin diye tam remount.
        key={basemap}
        ref={webViewRef}
        // baseUrl olmadan Android WebView'in origin'i null kalir ve uzak
        // kaynaklara yapilan istekler CORS'a takilir.
        source={{ html, baseUrl: BASEMAPS[basemap].tileOrigin }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={(e) => showError(e.nativeEvent.description || 'WebView yüklenemedi')}
        onHttpError={(e) => showError(`HTTP ${e.nativeEvent.statusCode}`)}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        scrollEnabled={false}
        overScrollMode="never"
      />

      {!ready && (
        <View style={styles.overlay} pointerEvents="none">
          {error ? (
            // Acilmadan gelen hata buraya yaziliyor: asagidaki afis harita
            // ekraninin arama kutusunun altinda kalabiliyor, bu katman ise
            // tum alani kapladigi icin her zaman gorunur.
            <Text style={styles.overlayError} numberOfLines={4}>
              {error}
            </Text>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.overlayText}>Harita yükleniyor</Text>
            </>
          )}
        </View>
      )}

      {/* Harita acildiktan sonra da hata cikabilir (tile, glyph, sprite). */}
      {ready && !!error && (
        <View
          style={[styles.errorBanner, { top: errorTopOffset ?? ERROR_BANNER_TOP }]}
          pointerEvents="none">
          <Text style={styles.errorText} numberOfLines={3}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: colors.background },
  webView: { flex: 1, backgroundColor: colors.background },
  webViewContainer: { flex: 1, backgroundColor: colors.background },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  overlayText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  overlayError: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { ...typography.caption, color: colors.danger },
});
