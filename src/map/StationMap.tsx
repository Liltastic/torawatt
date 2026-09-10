import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colors, radius, spacing, typography } from '@/theme';
import { stationAvailability, type Station } from '@/types/domain';

import { buildMapHtml, TILE_ORIGIN } from './mapHtml';

/** Arama kutusunun altina denk gelir; harita basligin arkasina kadar uzaniyor. */
const ERROR_BANNER_TOP = 130;

/** Istanbul merkezi; konum izni eklenene kadar varsayilan kamera. */
const DEFAULT_CENTER = { centerLatitude: 41.055, centerLongitude: 29.0, zoom: 10.5 };

interface StationMapProps {
  stations: Station[];
  selectedId?: string;
  onSelectStation?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

type BridgeMessage =
  | { type: 'ready' }
  | { type: 'stationPress'; id: string }
  | { type: 'error'; message: string };

export function StationMap({ stations, selectedId, onSelectStation, style }: StationMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const html = useMemo(() => buildMapHtml(DEFAULT_CENTER), []);

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
          selected: station.id === selectedId,
        },
      })),
    }),
    [stations, selectedId],
  );

  const pushStations = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `window.__tw && window.__tw.setStations(${JSON.stringify(geojson)}); true;`,
    );
  }, [geojson]);

  // Istasyon listesi veya secim degistiginde haritayi tazele.
  useEffect(() => {
    if (ready) pushStations();
  }, [ready, pushStations]);

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
      } else if (message.type === 'stationPress') {
        onSelectStation?.(message.id);
      } else if (message.type === 'error') {
        setError(message.message);
      }
    },
    [onSelectStation, pushStations],
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        // baseUrl olmadan Android WebView'in origin'i null kalir ve uzak
        // kaynaklara yapilan istekler CORS'a takilir.
        source={{ html, baseUrl: TILE_ORIGIN }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={(e) => setError(e.nativeEvent.description || 'WebView yüklenemedi')}
        onHttpError={(e) => setError(`HTTP ${e.nativeEvent.statusCode}`)}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        scrollEnabled={false}
        overScrollMode="never"
      />

      {!ready && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.overlayText}>Harita yükleniyor</Text>
        </View>
      )}

      {/* Harita yuklendikten sonra da hata cikabilir (tile, glyph, sprite). */}
      {!!error && (
        <View style={styles.errorBanner} pointerEvents="none">
          <Text style={styles.errorText} numberOfLines={3}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

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
  errorBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: ERROR_BANNER_TOP,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { ...typography.caption, color: colors.danger },
});
