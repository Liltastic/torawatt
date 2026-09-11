import { colors, statusColors } from '@/theme';

/** MapLibre GL JS surumu CDN'de sabitlenir; UMD build yalnizca 5.x'te var. */
const MAPLIBRE_VERSION = '5.24.0';

/**
 * Acik kaynak tile saglayicisi: OpenFreeMap (API anahtari yok, kota yok).
 * Taban stil "positron"; zemin ve su renkleri TORA WATT paletine cekiliyor.
 */
export const TILE_ORIGIN = 'https://tiles.openfreemap.org';
const STYLE_URL = `${TILE_ORIGIN}/styles/positron`;

/**
 * Positron'un notr grilerini "Solar Fresh" paletine cekiyoruz: canli nane
 * yesili zemin, doygun gok mavisi su, yesil alanlar (park/orman/cim) daha
 * belirgin bir yesile, binalar hafif sicak bir kreme boyaniyor.
 */
const LAND_COLOR = '#E4F7EC';
const WATER_COLOR = '#BFE7F5';
const PARK_COLOR = '#BFEBD2';
const BUILDING_COLOR = '#FFF1DE';

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
<link href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<style>
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
  #map { height: 100%; width: 100%; }
  body { background: ${colors.background}; overflow: hidden; }
  /* OSM atifi ODbL geregi gorunur kalmali; yalnizca uygulamanin tipografisine uyduruyoruz. */
  .maplibregl-ctrl-attrib { font-size: 9px; background: rgba(255,255,255,0.75); }
  .maplibregl-ctrl-attrib a { color: ${colors.textSecondary}; }
  .maplibregl-ctrl-bottom-left { display: none; }
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

  if (typeof maplibregl === 'undefined') {
    post({ type: 'error', message: 'MapLibre betigi yuklenemedi (CDN)' });
    return;
  }


  var EMPTY = { type: 'FeatureCollection', features: [] };

  var map = new maplibregl.Map({
    container: 'map',
    style: '${STYLE_URL}',
    center: [${centerLongitude}, ${centerLatitude}],
    zoom: ${zoom},
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
    if (map.getLayer('background')) map.setPaintProperty('background', 'background-color', '${LAND_COLOR}');

    // Positron'un tam katman kimliklerini varsayamayiz (surum/CDN degisebilir);
    // isimlerine gore eslesen dolgu katmanlarini tarayip Solar Fresh paletine
    // ceviriyoruz. Beklenmeyen bir katman turu patlatirsa tek bir katman
    // yuzunden haritanin tamami calismaz olmasin diye try/catch var.
    map.getStyle().layers.forEach(function (layer) {
      if (layer.type !== 'fill') return;
      var id = layer.id.toLowerCase();
      try {
        if (id.indexOf('water') !== -1) {
          map.setPaintProperty(layer.id, 'fill-color', '${WATER_COLOR}');
        } else if (
          id.indexOf('park') !== -1 ||
          id.indexOf('wood') !== -1 ||
          id.indexOf('forest') !== -1 ||
          id.indexOf('grass') !== -1 ||
          id.indexOf('landcover') !== -1
        ) {
          map.setPaintProperty(layer.id, 'fill-color', '${PARK_COLOR}');
        } else if (id.indexOf('building') !== -1) {
          map.setPaintProperty(layer.id, 'fill-color', '${BUILDING_COLOR}');
          map.setPaintProperty(layer.id, 'fill-opacity', 0.6);
        }
      } catch (e) {
        // Bu katman beklenen paint ozelligini desteklemiyor olabilir; digerlerini etkilemesin.
      }
    });

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
