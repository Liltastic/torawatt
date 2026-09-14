import { colors, statusColors } from '@/theme';

/** Mapbox GL JS surumu CDN'de sabitlenir. */
const MAPBOX_GL_VERSION = '3.9.0';

/**
 * Mapbox Studio'da elle tasarlanmis ozel stil (raxyizm/cmu1946s600gj01s75bta4r79).
 * Bu bir "Standard" stili: `imports: ['basemap']` ile mapbox://styles/mapbox/standard'i
 * temel alip aydinlatma/renk konfigurasyonu (lightPreset: dawn vb.) uzerine
 * kuruluyor - Mapbox GL JS v3'e ozel bir mekanizma. MapLibre bu "imports"
 * sistemini hic desteklemiyor, klasik "Raster Tiles" ucu da bu stil turunu
 * islenmis goruntuye ceviremeyip her zaman bos/beyaz karo donduruyor (denendi,
 * dogrulandi). Bu yuzden burada MapLibre yerine gercek Mapbox GL JS kullanip
 * stili doğrudan `mapbox://styles/...` ile yukluyoruz.
 */
export const TILE_ORIGIN = 'https://api.mapbox.com';
const MAPBOX_USERNAME = 'raxyizm';
const MAPBOX_STYLE_ID = 'cmu1946s600gj01s75bta4r79';
// Public token (pk.) - Mapbox'ta client tarafinda kullanilmasi normal, ama
// koda gomulu bir token GitHub'in secret-scanning korumasini tetikliyor; env
// degiskeninde tutup derleme zamaninda gomduruyoruz (bkz. .env.example).
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const MAPBOX_STYLE_URL = `mapbox://styles/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}`;

if (__DEV__ && !MAPBOX_ACCESS_TOKEN) {
  console.warn(
    'EXPO_PUBLIC_MAPBOX_TOKEN tanımlı değil, harita yüklenemeyecek. .env dosyasına ekle (bkz. .env.example).',
  );
}

export interface MapHtmlOptions {
  centerLatitude: number;
  centerLongitude: number;
  zoom: number;
}

export function buildMapHtml({ centerLatitude, centerLongitude, zoom }: MapHtmlOptions): string {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<link href="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js"></script>
<style>
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
  #map { height: 100%; width: 100%; }
  body { background: ${colors.background}; overflow: hidden; }
  /* Mapbox atifi/logosu kullanim kosullari geregi gizlenemez; sadece kucultup uyumlu hale getiriyoruz. */
  .mapboxgl-ctrl-attrib { font-size: 9px; background: rgba(255,255,255,0.75); }
  .mapboxgl-ctrl-attrib a { color: ${colors.textSecondary}; }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  var post = function (msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  };

  // Sayfa seviyesi hatalar da RN'e tasinsin; aksi halde WebView icinde sessizce kayboluyor.
  window.onerror = function (message, src, line) {
    post({ type: 'error', message: String(message) + ' @' + line });
    return false;
  };

  if (typeof mapboxgl === 'undefined') {
    post({ type: 'error', message: 'Mapbox GL betigi yuklenemedi (CDN)' });
    return;
  }

  mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';

  var EMPTY = { type: 'FeatureCollection', features: [] };

  var map = new mapboxgl.Map({
    container: 'map',
    style: '${MAPBOX_STYLE_URL}',
    center: [${centerLongitude}, ${centerLatitude}],
    zoom: ${zoom},
    // Stilin Mapbox Studio'daki varsayilani egimli/dondurulmus (3D onizleme
    // icin) - uygulamamiz duz, tepeden gorunumlu 2D bir harita bekliyor.
    pitch: 0,
    bearing: 0,
    attributionControl: { compact: true },
    // Pinleri parmak altinda tutmak icin egimi kapatiyoruz.
    pitchWithRotate: false,
    dragRotate: false,
  });

  map.on('error', function (e) {
    var err = e && e.error;
    var msg = (err && err.message) || 'harita hatasi';
    if (err && err.url) msg += ' -> ' + err.url;
    if (err && err.status) msg += ' [' + err.status + ']';
    post({ type: 'error', message: msg });
  });

  map.on('load', function () {
    map.addSource('stations', {
      type: 'geojson',
      data: EMPTY,
      cluster: true,
      clusterRadius: 48,
      clusterMaxZoom: 13,
    });

    // Secili istasyonun mavi halesi (spec bolum 5).
    map.addLayer({
      id: 'station-halo',
      type: 'circle',
      source: 'stations',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], true]],
      paint: {
        'circle-radius': 18,
        'circle-color': '${colors.primary}',
        'circle-opacity': 0.22,
      },
    });

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'stations',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '${colors.primary}',
        'circle-radius': ['step', ['get', 'point_count'], 17, 10, 22, 25, 28],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'stations',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
      },
      paint: { 'text-color': '#FFFFFF' },
    });

    map.addLayer({
      id: 'stations',
      type: 'circle',
      source: 'stations',
      filter: ['!', ['has', 'point_count']],
      paint: {
        // Secili pin belirgin sekilde buyur; icindeki musait soket sayisi okunur kalsin.
        'circle-radius': ['case', ['==', ['get', 'selected'], true], 17, 13],
        'circle-color': [
          'match',
          ['get', 'status'],
          'AVAILABLE', '${statusColors.AVAILABLE}',
          'PARTIAL', '${statusColors.PARTIAL}',
          'FULL', '${statusColors.FULL}',
          '${statusColors.UNKNOWN}'
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    // Pinin icinde musait soket sayisi (referans tasarimdaki sayili rozetler).
    map.addLayer({
      id: 'station-count',
      type: 'symbol',
      source: 'stations',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['to-string', ['get', 'available']],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['case', ['==', ['get', 'selected'], true], 14, 12],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#FFFFFF' },
    });

    // Kullanici konumu: nabiz gibi genisleyen hale + mavi nokta. Marka mavisi
    // (colors.location) kasitli olarak istasyon turkuazindan farkli - "ben
    // buradayim" noktasi diger tum turkuaz/renkli pinlerden hemen ayrissin.
    map.addSource('user', { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: 'user-pulse',
      type: 'circle',
      source: 'user',
      paint: {
        'circle-radius': 14,
        'circle-color': '${colors.location}',
        'circle-opacity': 0.25,
      },
    });
    map.addLayer({
      id: 'user-dot',
      type: 'circle',
      source: 'user',
      paint: {
        'circle-radius': 7,
        'circle-color': '${colors.location}',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    // Rota cizgisi pinlerin altinda kalsin diye station-halo'nun onune ekleniyor.
    map.addSource('route', { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': 9 },
    }, 'station-halo');
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '${colors.primary}', 'line-width': 5 },
    }, 'station-halo');

    // Baslangic (koyu) ve varis (marka mavisi) noktalari.
    map.addSource('endpoints', { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: 'endpoints',
      type: 'circle',
      source: 'endpoints',
      paint: {
        'circle-radius': 7,
        'circle-color': ['match', ['get', 'kind'], 'start', '${colors.text}', '${colors.location}'],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    var pulseStart = null;
    var hasUser = false;
    function pulse(ts) {
      if (hasUser) {
        if (pulseStart === null) pulseStart = ts;
        var t = ((ts - pulseStart) % 2000) / 2000;
        map.setPaintProperty('user-pulse', 'circle-radius', 10 + t * 18);
        map.setPaintProperty('user-pulse', 'circle-opacity', 0.35 * (1 - t));
      }
      requestAnimationFrame(pulse);
    }
    requestAnimationFrame(pulse);
    window.__twSetUser = function (lng, lat) {
      hasUser = true;
      map.getSource('user').setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }],
      });
    };

    map.on('click', 'stations', function (e) {
      var f = e.features && e.features[0];
      if (f) post({ type: 'stationPress', id: f.properties.id });
    });

    map.on('click', 'clusters', function (e) {
      var f = e.features && e.features[0];
      if (!f) return;
      map.getSource('stations').getClusterExpansionZoom(f.properties.cluster_id).then(function (z) {
        map.easeTo({ center: f.geometry.coordinates, zoom: z });
      }).catch(function () {});
    });

    // Bos harita alanina (istasyon/cluster disi) dokunuldugunda RN tarafina
    // haber ver; boylece uygulama alt sheet'i kapatabilir - haritayla
    // etkilesim niyeti listeyle degil haritayla oldugunu gosterir.
    map.on('click', function (e) {
      var hits = map.queryRenderedFeatures(e.point, { layers: ['stations', 'clusters'] });
      if (hits.length === 0) post({ type: 'mapPress' });
    });

    post({ type: 'ready' });
  });

  // React Native tarafinin cagirdigi kopru.
  window.__tw = {
    setStations: function (geojson) {
      var src = map.getSource('stations');
      if (src) src.setData(geojson);
    },
    setUserLocation: function (lng, lat) {
      if (window.__twSetUser) window.__twSetUser(lng, lat);
    },
    // coords: [[lng, lat], ...]; endpoints: [{lng, lat, kind: 'start'|'end'}]
    setRoute: function (coords, endpoints) {
      var routeSrc = map.getSource('route');
      var endSrc = map.getSource('endpoints');
      if (!routeSrc || !endSrc) return;

      if (!coords || coords.length < 2) {
        routeSrc.setData(EMPTY);
        endSrc.setData(EMPTY);
        return;
      }

      routeSrc.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }],
      });
      endSrc.setData({
        type: 'FeatureCollection',
        features: (endpoints || []).map(function (p) {
          return { type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { kind: p.kind } };
        }),
      });

      var minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      coords.forEach(function (c) {
        if (c[0] < minLng) minLng = c[0];
        if (c[0] > maxLng) maxLng = c[0];
        if (c[1] < minLat) minLat = c[1];
        if (c[1] > maxLat) maxLat = c[1];
      });
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 36, duration: 0, maxZoom: 14 });
    },
    // offsetY (dp): hedef, ekran merkezinin bu kadar ustunde ortalanir.
    flyTo: function (lng, lat, z, offsetY) {
      map.flyTo({
        center: [lng, lat],
        zoom: z || map.getZoom(),
        offset: [0, -(offsetY || 0)],
        duration: 700,
        essential: true,
      });
    },
    fitTo: function (bounds) {
      map.fitBounds(bounds, { padding: 64, duration: 600, maxZoom: 14 });
    },
  };
})();
</script>
</body>
</html>`;
}
