import { colors, statusColors } from '@/theme';

/** MapLibre GL JS surumu CDN'de sabitlenir; UMD build yalnizca 5.x'te var. */
const MAPLIBRE_VERSION = '5.24.0';

/**
 * Acik kaynak tile saglayicisi: OpenFreeMap (API anahtari yok, kota yok).
 * Taban stil "positron"; zemin ve su renkleri TORA WATT paletine cekiliyor.
 */
export const TILE_ORIGIN = 'https://tiles.openfreemap.org';
const STYLE_URL = `${TILE_ORIGIN}/styles/positron`;

/** Positron'un notr grilerini uygulamanin lavanta tonuna yaklastiriyoruz. */
const LAND_COLOR = '#F4F6FD';
const WATER_COLOR = '#DCE4F7';

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
    if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', '${WATER_COLOR}');

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
        'circle-radius': 10,
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

    post({ type: 'ready' });
  });

  // React Native tarafinin cagirdigi kopru.
  window.__tw = {
    setStations: function (geojson) {
      var src = map.getSource('stations');
      if (src) src.setData(geojson);
    },
    flyTo: function (lng, lat, z) {
      map.flyTo({ center: [lng, lat], zoom: z || map.getZoom(), duration: 600 });
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
