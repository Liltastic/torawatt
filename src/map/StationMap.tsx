import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useMapStyleStore } from '@/store/mapStyle';
import { colors, radius, spacing, typography } from '@/theme';
import {
  currentTypeOf,
  stationAvailability,
  type Coordinate,
  type CurrentType,
  type Station,
} from '@/types/domain';

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

/**
 * Icerik sureci cokunce kac kez sessizce yeniden yuklenecegi. Cokme genelde
 * bellek baskisindan geliyor; kosulsuz yeniden yukleme cokme-yukleme dongusune
 * girer, bu yuzden birkac denemeden sonra karari kullaniciya birakiyoruz.
 */
const MAX_CRASH_RELOADS = 2;

/**
 * Pin boyutu istasyonun EN YUKSEK guc sinifina gore secilir. EN YUKSEK kW'li
 * sokete bakmak YANLIS olurdu: currentTypeOf() Type 2'yi kW'dan bagimsiz AC
 * sayiyor, yani 60 kW Type 2 + 50 kW CCS bulunan bir istasyon "AC" cikardi.
 */
const POWER_RANK: Record<CurrentType, number> = { AC: 0, DC: 1, HPC: 2 };

/** Harita bu kadar sure ayakta kalirsa cokme sayaci sifirlanir. */
const CRASH_RESET_AFTER_MS = 60_000;

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

  // WebView'in icerik sureci (iOS'ta WKWebView, Android'de render process)
  // bellek baskisiyla oldurulunce sayfa yok oluyor ama RN tarafi bunu bilmiyor:
  // ready hala true kaliyor ve kullanici aciklamasiz bos bir dikdortgen
  // goruyor. nonce artisi WebView'i bastan kuruyor, crashes sayaci da sonsuz
  // cokme-yeniden yukleme dongusunu kesiyor.
  const [reload, setReload] = useState({ nonce: 0, crashes: 0 });
  const crashGaveUp = reload.crashes > MAX_CRASH_RELOADS;
  const crashResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCrashResetTimer = useCallback(() => {
    if (crashResetTimer.current) {
      clearTimeout(crashResetTimer.current);
      crashResetTimer.current = null;
    }
  }, []);
  useEffect(() => clearCrashResetTimer, [clearCrashResetTimer]);

  const html = useMemo(
    () => buildMapHtml({ ...cameraRef.current, basemap }),
    // nonce sart: yoksa yeniden kurulan harita eski HTML ile, yani kullanicinin
    // baktigi yer yerine DEFAULT_CENTER ile acilir. Lint bunu "gereksiz"
    // sayiyor cunku govdedeki tek degisken okumasi bir ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basemap, reload.nonce],
  );

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
  }, [basemap, reload.nonce, clearErrorTimer]);

  const handleCrash = useCallback(() => {
    // Sayfa gitti: ready'yi dusurmezsek olu WebView'in uzerinde hicbir
    // gosterge cikmaz. Bekleyen sayac sifirlamasini da iptal ediyoruz - harita
    // ayakta kalamadi, o hakki kazanmadi.
    clearCrashResetTimer();
    setReady(false);
    setReload((prev) =>
      prev.crashes >= MAX_CRASH_RELOADS
        ? { nonce: prev.nonce, crashes: prev.crashes + 1 }
        : { nonce: prev.nonce + 1, crashes: prev.crashes + 1 },
    );
  }, [clearCrashResetTimer]);

  const retryAfterCrash = useCallback(() => {
    setReload((prev) => ({ nonce: prev.nonce + 1, crashes: 0 }));
  }, []);


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
      features: stations.map((station) => {
        // Payda stationAvailability() ile AYNI kumeden gelmeli: arizali ve
        // cevrimdisi soketler sayilmazsa pin rengi ile etiketteki kesir
        // birbirini yalanlar ("0/4 musait" yazan gri pin gibi).
        const usable = station.connectors.filter(
          (c) => c.status === 'AVAILABLE' || c.status === 'OCCUPIED',
        );

        let power: CurrentType = 'AC';
        let maxKw = 0;
        for (const connector of station.connectors) {
          const tier = currentTypeOf(connector);
          if (POWER_RANK[tier] > POWER_RANK[power]) power = tier;
          if (connector.powerKw > maxKw) maxKw = connector.powerKw;
        }

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [station.longitude, station.latitude],
          },
          properties: {
            id: station.id,
            status: stationAvailability(station),
            available: usable.filter((c) => c.status === 'AVAILABLE').length,
            total: usable.length,
            // Pin boyutunu ve etiketteki kW'yi bunlar belirliyor. maxKw tum
            // soketlerden: mekanin KAPASITESI sabit bir ozellik, "su an bos olan
            // en yuksek guc" degil - o soruyu rim ve alt etiket cevapliyor.
            power,
            maxKw: Math.round(maxKw),
            selected: station.id === selectedId,
          },
        };
      }),
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
        // Sayaci HEMEN sifirlamiyoruz. Bellek baskisindan olen bir WebView'in
        // tipik oruntusu "yeniden yukle -> sayfa acilir -> tekrar oldurulur";
        // ready aninda sifirlansaydi sayac hic dolmaz ve korumak istedigimiz
        // sonsuz cokme dongusu acik kalirdi. Harita bir sure AYAKTA kalirsa
        // gercekten toparlanmis sayiyoruz.
        clearCrashResetTimer();
        crashResetTimer.current = setTimeout(() => {
          setReload((prev) => (prev.crashes === 0 ? prev : { ...prev, crashes: 0 }));
        }, CRASH_RESET_AFTER_MS);
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
        key={`${basemap}:${reload.nonce}`}
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
        // Icerik sureci oldurulunce (iOS jetsam / Android render process) haber
        // veren tek kanal bunlar; yoksa harita kalici olarak bos kalir.
        onContentProcessDidTerminate={handleCrash}
        onRenderProcessGone={handleCrash}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        scrollEnabled={false}
        overScrollMode="never"
        // iOS ic scroll view'e guvenli alan kadar ust kenar payi ekliyor;
        // harita tam ekran ve kaydirilamaz oldugu icin bu, GL tuvalini asagi
        // itip gorsel merkez ile dokunma/flyTo merkezini ayirir. Guvenli alan
        // hesabi HTML tarafinda (viewport-fit=cover + env()) yapiliyor.
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      />

      {!ready && (
        <View style={styles.overlay} pointerEvents={crashGaveUp ? 'auto' : 'none'}>
          {crashGaveUp ? (
            // Ust uste cokme bellek baskisi demek; otomatik yeniden yukleme
            // beyaz flas dongusune donusmesin diye karari kullaniciya veriyoruz.
            <>
              <Text style={styles.overlayError}>
                Harita bellek yetersizliğinden kapandı.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retryAfterCrash}
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
                <Text style={styles.retryText}>Yeniden dene</Text>
              </Pressable>
            </>
          ) : error ? (
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
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
  },
  retryButtonPressed: { opacity: 0.8 },
  retryText: { ...typography.captionStrong, color: colors.white },
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
