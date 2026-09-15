import { colors, statusColors } from '@/theme';

/**
 * Uygulamada iki taban harita var, kullanici haritadaki katman butonuyla
 * arasinda geciyor (bkz. src/store/mapStyle.ts):
 *
 *  - "classic": OpenFreeMap positron (acik kaynak, anahtar/kota yok), zemin ve
 *    su renkleri TORA WATT paletine cekilerek. MapLibre GL JS ile cizilir.
 *  - "studio":  kullanicinin Mapbox Studio'da elle tasarladigi ozel stil.
 *    Bu bir "Standard" stili: `imports: ['basemap']` ile mapbox://styles/mapbox/standard'i
 *    temel alip aydinlatma/renk konfigurasyonu uzerine kuruluyor - Mapbox GL JS
 *    v3'e ozel bir mekanizma. MapLibre bu "imports" sistemini hic desteklemiyor,
 *    klasik "Raster Tiles" ucu da bu stil turunu isleyemeyip her zaman bos/beyaz
 *    karo donduruyor (denendi, dogrulandi). Bu yuzden gercek Mapbox GL JS ile
 *    dogrudan `mapbox://styles/...` olarak yukleniyor.
 *
 * Iki kutuphane ayni Style Spec API'sini konustugu icin asagidaki katman/pin/rota
 * kodu ikisinde de degismeden calisiyor; yalnizca CDN, global ad, stil URL'i ve
 * glif (font) adi degisiyor. Kutuphaneleri bilerek ayri tutuyoruz: Mapbox GL JS
 * v3 kendi lisansi geregi Mapbox disi karolarla kullanilamaz.
 */
export type BasemapId = 'classic' | 'studio';

/** MapLibre GL JS surumu CDN'de sabitlenir; UMD build yalnizca 5.x'te var. */
const MAPLIBRE_VERSION = '5.24.0';
const MAPBOX_GL_VERSION = '3.30.0';

/**
 * Harita bu surede acilmazsa pes edip kullaniciya soyluyoruz. Onsuz basarisiz
 * bir yukleme sonsuza kadar "Harita yukleniyor" donduruyor ve elimizde neyin
 * takildigina dair hicbir bilgi kalmiyor - ozellikle iOS'ta, WebView'in icine
 * bakamadigimiz icin.
 */
const LOAD_TIMEOUT_MS = 20000;

const MAPBOX_USERNAME = 'raxyizm';
const MAPBOX_STYLE_ID = 'cmu1946s600gj01s75bta4r79';
// Public token (pk.) - Mapbox'ta client tarafinda kullanilmasi normal, ama
// koda gomulu bir token GitHub'in secret-scanning korumasini tetikliyor; env
// degiskeninde tutup derleme zamaninda gomduruyoruz (bkz. .env.example).
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

if (__DEV__ && !MAPBOX_ACCESS_TOKEN) {
  console.warn(
    'EXPO_PUBLIC_MAPBOX_TOKEN tanımlı değil, detaylı harita yüklenemeyecek. .env dosyasına ekle (bkz. .env.example).',
  );
}

/**
 * Positron'un notr grilerini "Solar Fresh" paletine cekiyoruz: canli nane
 * yesili zemin, doygun gok mavisi su, yesil alanlar (park/orman/cim) daha
 * belirgin bir yesile, binalar hafif sicak bir kreme boyaniyor.
 */
const LAND_COLOR = '#E4F7EC';
const WATER_COLOR = '#BFE7F5';
const PARK_COLOR = '#BFEBD2';
const BUILDING_COLOR = '#FFF1DE';

/**
 * Positron'un tam katman kimliklerini varsayamayiz (surum/CDN degisebilir);
 * isimlerine gore eslesen dolgu katmanlarini tarayip Solar Fresh paletine
 * ceviriyoruz. Beklenmeyen bir katman turu patlatirsa tek bir katman yuzunden
 * haritanin tamami calismaz olmasin diye try/catch var.
 */
const RECOLOR_SCRIPT = `
    if (map.getLayer('background')) map.setPaintProperty('background', 'background-color', '${LAND_COLOR}');

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
`;

interface BasemapConfig {
  /** Katman butonunda ve erisilebilirlik etiketinde gecen ad. */
  label: string;
  /** WebView'in baseUrl'i; Android'de origin null kalmasin diye (bkz. StationMap). */
  tileOrigin: string;
  cssHref: string;
  scriptSrc: string;
  /** CDN betiginin tanimladigi global ad; ayni zamanda ctrl CSS siniflarinin oneki. */
  globalName: string;
  styleUrl: string;
  /**
   * Pin ici rakamlar icin kalin glif. Mapbox "Noto Sans Bold"u sunmuyor (404
   * doner ve yazilar hic cizilmez); DIN Pro onun kendi standart fontu.
   */
  boldFont: string;
  /** Harita olusturulmadan once calisan hazirlik (Mapbox icin token). */
  setupScript: string;
  /** Map yapicisindaki `projection` degeri; anlamsizsa 'undefined' (yani yok sayilir). */
  projection: string;
  /** `load` olayinda, kendi katmanlarimizi eklemeden once calisan kod. */
  onLoadScript: string;
  /** Logo kontrolu gizlenebilir mi - Mapbox'ta kullanim kosullari geregi hayir. */
  hideLogo: boolean;
}

export const BASEMAPS: Record<BasemapId, BasemapConfig> = {
  classic: {
    label: 'Sade harita',
    tileOrigin: 'https://tiles.openfreemap.org',
    cssHref: `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`,
    scriptSrc: `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`,
    globalName: 'maplibregl',
    styleUrl: 'https://tiles.openfreemap.org/styles/positron',
    boldFont: 'Noto Sans Bold',
    setupScript: '',
    projection: 'undefined',
    onLoadScript: RECOLOR_SCRIPT,
    hideLogo: true,
  },
  studio: {
    label: 'Detaylı harita',
    tileOrigin: 'https://api.mapbox.com',
    cssHref: `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`,
    scriptSrc: `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`,
    globalName: 'mapboxgl',
    styleUrl: `mapbox://styles/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}`,
    boldFont: 'DIN Pro Bold',
    // Token bos kalirsa Mapbox'in kendi hatasi ("An API access token is
    // required...") neyin eksik oldugunu soylemiyor. Bu bir kez gercekten
    // basimiza geldi: token .env'de vardi ama EAS ortam degiskenlerine
    // eklenmedigi icin yayinlanan pakette bos cikti ve harita hic acilmadi.
    setupScript: `  mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
  if (!mapboxgl.accessToken) {
    post({ type: 'error', message: 'Mapbox token yok (EXPO_PUBLIC_MAPBOX_TOKEN). Yayinlanan surumde EAS ortam degiskenlerine de eklenmis olmali.' });
    return;
  }`,
    // "Standard" stilleri GL JS v3'te varsayilan olarak kure projeksiyonuyla
    // cizilir. Uygulama zaten duz 2D bir harita istiyor (pitch/bearing sifir,
    // dondurme kapali), ustelik kure bambaska ve cok daha agir bir WebGL yolu.
    projection: `'mercator'`,
    onLoadScript: '',
    hideLogo: false,
  },
};

export interface MapHtmlOptions {
  centerLatitude: number;
  centerLongitude: number;
  zoom: number;
  basemap: BasemapId;
}

export function buildMapHtml({
  centerLatitude,
  centerLongitude,
  zoom,
  basemap,
}: MapHtmlOptions): string {
  const config = BASEMAPS[basemap];
  const { globalName, boldFont } = config;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<link href="${config.cssHref}" rel="stylesheet" />
<script src="${config.scriptSrc}"></script>
<style>
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
  #map { height: 100%; width: 100%; }
  body { background: ${colors.background}; overflow: hidden; }
  /* Atif (OSM icin ODbL, Mapbox icin kullanim kosullari) gorunur kalmali; yalnizca tipografiye uyduruyoruz. */
  .${globalName}-ctrl-attrib { font-size: 9px; background: rgba(255,255,255,0.75); }
  .${globalName}-ctrl-attrib a { color: ${colors.textSecondary}; }
  ${config.hideLogo ? `.${globalName}-ctrl-bottom-left { display: none; }` : ''}
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

  if (typeof ${globalName} === 'undefined') {
    post({ type: 'error', message: 'Harita betigi yuklenemedi (CDN)' });
    return;
  }

${config.setupScript}

  var EMPTY = { type: 'FeatureCollection', features: [] };

  // Yukleme sessizce takilirsa (WebView'in icine bakamadigimiz iOS'ta oldugu
  // gibi) en azindan nereye kadar gelindigini bilelim.
  var stage = 'betik yuklendi';
  var opened = false;
  setTimeout(function () {
    if (!opened) post({ type: 'error', message: 'Harita acilamadi - son asama: ' + stage });
  }, ${LOAD_TIMEOUT_MS});

  var map = new ${globalName}.Map({
    container: 'map',
    style: '${config.styleUrl}',
    center: [${centerLongitude}, ${centerLatitude}],
    zoom: ${zoom},
    // Mapbox stilinin Studio'daki varsayilani egimli/dondurulmus (3D onizleme
    // icin) - uygulamamiz duz, tepeden gorunumlu 2D bir harita bekliyor.
    pitch: 0,
    bearing: 0,
    projection: ${config.projection},
    attributionControl: { compact: true },
    // Pinleri parmak altinda tutmak icin egimi kapatiyoruz.
    pitchWithRotate: false,
    dragRotate: false,
  });
  stage = 'harita kuruldu';

  map.on('styledata', function () { stage = 'stil geldi'; });

  map.on('error', function (e) {
    var err = e && e.error;
    var msg = (err && err.message) || 'harita hatasi';
    if (err && err.url) msg += ' -> ' + err.url;
    if (err && err.status) msg += ' [' + err.status + ']';
    post({ type: 'error', message: msg });
  });

  // Taban harita degistiginde WebView bastan yukleniyor; RN tarafi son kamerayi
  // saklayip yeni haritayi ayni yerden acsin diye her hareketin sonunda bildiriyoruz.
  map.on('moveend', function () {
    var c = map.getCenter();
    post({ type: 'camera', lng: c.lng, lat: c.lat, zoom: map.getZoom() });
  });

  // ---------------------------------------------------------------- PIN IKONLARI
  // Istasyon isaretcisi daire degil damla/pin. WebView'e servis edilen yerel
  // dosya olmadigi icin ikonlar burada, calisma zamaninda canvas ile cizilip
  // map.addImage ile stile veriliyor. Cizim SENKRON: addLayer'dan once bitiyor,
  // yani "Image ... could not be loaded" penceresi hic acilmiyor.
  //
  // KULLANILMAYAN yollar ve nedenleri:
  //  - map.loadImage: MapLibre 5'te Promise, Mapbox 3'te callback donduruyor -
  //    getClusterExpansionZoom ile birebir ayni tuzak. Cagirmiyoruz.
  //  - SVG data URI: WebKit SVG'yi once kendi intrinsic boyutunda rasterize
  //    edip buyutuyor (iPhone'da bulanik pin) ve decode asenkron.
  //  - SDF ikon + icon-color: mesafe alani damlanin sivri ucunu kortelir,
  //    golge de mumkun olmaz.

  // DPR TAM SAYI olsun: Android WebView 2.625 / 2.75 gibi kesirli yogunluklar
  // bildiriyor, iOS 2 veya 3. Yukari yuvarlayip 3'te kirpiyoruz; 3'un ustu
  // gozle ayirt edilmiyor ama doku atlasini buyutuyor.
  var PIN_DPR = Math.max(1, Math.min(3, Math.ceil(window.devicePixelRatio || 1)));

  // Tum olculer CSS (logical) px; cizim sirasinda elle PIN_DPR ile carpiliyor.
  //
  // DIKKAT - canvas'ta ctx.setTransform ile OLCEKLEME YAPMIYORUZ. Sebebi
  // shadowBlur / shadowOffsetY: spesifikasyon bunlarin donusum matrisinden
  // etkilenmedigini soyler ama motorlar bu noktada ayrisabiliyor. Birim matris
  // + elle carpma iki davranista da ayni pikseli uretir; iOS'ta
  // dogrulayamayacagimiz bir belirsizligi tamamen ortadan kaldirir.
  var PIN_PAD_X = 6;
  var PIN_PAD_TOP = 6;
  // GORUNUR ucun bitmap'in ALT kenarina uzakligi (golge sigsin diye). TUM
  // ikonlarda birebir ayni olmak ZORUNDA, cunku icon-offset tek bir sabit.
  var PIN_TIP_GAP = 8;
  var PIN_SHADOW = 'rgba(6,40,33,0.28)';
  var PIN_SHADOW_BLUR = 5;
  var PIN_SHADOW_DY = 1.5;

  var PIN_COLORS = {
    AVAILABLE: '${statusColors.AVAILABLE}',
    PARTIAL: '${statusColors.PARTIAL}',
    FULL: '${statusColors.FULL}',
    UNKNOWN: '${statusColors.UNKNOWN}'
  };

  // r    : kafa cemberinin dolgu yaricapi
  // ring : GORUNUR beyaz cerceve kalinligi (stroke lineWidth'inin yarisi)
  // tail : kafa merkezi -> GORUNUR sivri uc mesafesi. Koordinata oturan nokta
  //        iste bu uc; rakamin text-offset'i de buna gore.
  // font : kafadaki rakamin text-size'i
  // tail/font iki durumda da 2.5 secildi; boylece text-offset SABIT olabiliyor.
  var PIN_SPECS = {
    def: { r: 13, ring: 3, tail: 30, font: 12 },
    sel: { r: 16, ring: 3.5, tail: 35, font: 14 }
  };

  function drawPinImage(spec, color) {
    var s = PIN_DPR;
    var outer = spec.r + spec.ring;

    var gapDev = Math.round(PIN_TIP_GAP * s);
    var w = Math.ceil((2 * outer + 2 * PIN_PAD_X) * s);
    // Yuvarlama fazlasi USTE gitsin ki uc-alt kenar mesafesi her ikonda tam
    // gapDev kalsin - sabit icon-offset'in tek sarti bu.
    var tipY = Math.ceil((PIN_PAD_TOP + outer + spec.tail) * s);
    var h = tipY + gapDev;

    var cx = w / 2;
    var cy = tipY - spec.tail * s;
    var vertexY = tipY - spec.ring * s;
    var r = spec.r * s;
    var d = vertexY - cy;

    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    var ctx = cv.getContext('2d');
    if (!ctx) throw new Error('canvas 2d baglami alinamadi');

    // Damla = kafa cemberinin BUYUK yayi + kose noktasindan cembere iki teget.
    // Teget degme noktalari asagi eksenden +-acos(r/d) acida durur.
    var t = Math.acos(Math.min(0.999, r / d));
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI / 2 - t, Math.PI / 2 + t, true);
    ctx.lineTo(cx, vertexY);
    ctx.closePath();

    // Yuvarlak birlesim: uc tam olarak ring kadar tasar (miter olsaydi tasma
    // uc acisina gore degisirdi) - gorunur uc kesin olarak tipY'de biter.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Beyaz cerceveyi GOLGELI ciz; ic yarisini birazdan dolgu kapatacak.
    // Golgeyi tek islemde birakiyoruz, ikincisi ust uste binip koyulasirdi.
    ctx.save();
    ctx.shadowColor = PIN_SHADOW;
    ctx.shadowBlur = PIN_SHADOW_BLUR * s;
    ctx.shadowOffsetY = PIN_SHADOW_DY * s;
    ctx.lineWidth = spec.ring * 2 * s;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = color;
    ctx.fill();

    // ImageData iki kutuphanenin de bekledigi {width,height,data} imzasi.
    return ctx.getImageData(0, 0, w, h);
  }

  var PIN_PREFIX = 'tw-pin-';

  function ensurePinImage(id) {
    if (!id || id.indexOf(PIN_PREFIX) !== 0) return false;
    if (map.hasImage(id)) return true;
    var rest = id.slice(PIN_PREFIX.length);
    var dash = rest.lastIndexOf('-');
    if (dash < 0) return false;
    var spec = PIN_SPECS[rest.slice(dash + 1)];
    var color = PIN_COLORS[rest.slice(0, dash)];
    if (!spec || !color) return false;
    map.addImage(id, drawPinImage(spec, color), { pixelRatio: PIN_DPR });
    return true;
  }

  function buildAllPinImages() {
    var statuses = ['AVAILABLE', 'PARTIAL', 'FULL', 'UNKNOWN'];
    var states = ['def', 'sel'];
    for (var i = 0; i < statuses.length; i++) {
      for (var j = 0; j < states.length; j++) {
        ensurePinImage(PIN_PREFIX + statuses[i] + '-' + states[j]);
      }
    }
  }

  // Emniyet kemeri: beklenmedik bir status degeri gelirse ya da bir ikon
  // dusmusse o an uret. Aksi halde o pin SESSIZCE kaybolur.
  map.on('styleimagemissing', function (e) {
    try { ensurePinImage(e && e.id); } catch (err) {}
  });

  // icon-anchor 'bottom' bitmap'in ALT-ORTA noktasini koordinata oturtur;
  // gorunur uc alt kenardan PIN_TIP_GAP yukarida oldugu icin bitmap'i ayni
  // miktarda asagi itiyoruz, uc tam koordinata gelsin.
  var PIN_ICON_OFFSET = Math.round(PIN_TIP_GAP * PIN_DPR) / PIN_DPR;

  // text-offset EM cinsinden ve dogrudan feature koordinatindan olculur,
  // icon-offset'ten bagimsizdir. Kafa merkezi koordinatin 'tail' px ustunde.
  // Iki durumun tail/font orani esitse tek sabit yeter (bugun 2.5); geometri
  // degisirse kod kendiliginden data-driven ifadeye geciyor.
  var PIN_TEXT_OFFSET = (function () {
    var a = -(PIN_SPECS.def.tail / PIN_SPECS.def.font);
    var b = -(PIN_SPECS.sel.tail / PIN_SPECS.sel.font);
    if (a === b) return [0, a];
    return ['case', ['==', ['get', 'selected'], true],
      ['literal', [0, b]], ['literal', [0, a]]];
  })();

  // Secili pin komsularinin ustunde cizilsin. allow-overlap acikken BUYUK
  // sort-key sonra (yani ustte) cizilir - iki motorda da ayni.
  var PIN_SORT_KEY = ['case', ['==', ['get', 'selected'], true], 2, 1];

  map.on('load', function () {
${config.onLoadScript}
    map.addSource('stations', {
      type: 'geojson',
      data: EMPTY,
      cluster: true,
      clusterRadius: 48,
      clusterMaxZoom: 13,
    });

    // Ikonlar KATMANLARDAN ONCE eklenmeli, ama stil yuklendikten sonra
    // (Mapbox aksi halde "Style is not done loading" firlatir) - yani burasi.
    // Taban harita degisiminde WebView bastan kuruldugu icin (StationMap
    // key={basemap}) bu kod her seferinde yeniden calisir.
    var pinsOk = true;
    try {
      buildAllPinImages();
    } catch (err) {
      pinsOk = false;
      post({
        type: 'error',
        message: 'Pin ikonlari uretilemedi, daire pinlere donuldu: ' + ((err && err.message) || err),
      });
    }

    // Secili istasyonun turkuaz halesi. Koordinat artik pinin UCU oldugu icin
    // hale ucun degil KAFANIN etrafinda olmali: ekran uzayinda tail kadar
    // yukari kaydiriliyor. 'viewport' capa sart - iki parmakla dondurme
    // dragRotate:false'a ragmen acik, hale pinden ayrilmasin.
    map.addLayer({
      id: 'station-halo',
      type: 'circle',
      source: 'stations',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], true]],
      paint: {
        'circle-radius': pinsOk ? PIN_SPECS.sel.r + PIN_SPECS.sel.ring + 8 : 18,
        'circle-color': '${colors.primary}',
        'circle-opacity': 0.22,
        'circle-translate': pinsOk ? [0, -PIN_SPECS.sel.tail] : [0, 0],
        'circle-translate-anchor': 'viewport',
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
        'text-font': ['${boldFont}'],
        'text-size': 13,
      },
      paint: { 'text-color': '#FFFFFF' },
    });

    // Istasyon pini: damla/pin ikonu. Katman KIMLIGI degismiyor ('stations'),
    // cunku click ve queryRenderedFeatures ona gore yazilmis.
    if (pinsOk) {
      map.addLayer({
        id: 'stations',
        type: 'symbol',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'concat',
            PIN_PREFIX,
            ['match', ['get', 'status'],
              'AVAILABLE', 'AVAILABLE',
              'PARTIAL', 'PARTIAL',
              'FULL', 'FULL',
              'UNKNOWN'],
            ['case', ['==', ['get', 'selected'], true], '-sel', '-def'],
          ],
          // 1 DISINDA deger verme: bitmap buyutuldugunde bulaniklasir. Secili
          // varyant zaten ayri ve daha buyuk bir bitmap olarak uretiliyor.
          'icon-size': 1,
          'icon-anchor': 'bottom',
          'icon-offset': [0, PIN_ICON_OFFSET],
          // ZORUNLU: circle katmani carpisma testi yapmiyordu, symbol yapiyor.
          // Bunlar olmadan yogun bolgelerde pinlerin bir kismi SESSIZCE kaybolur.
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          // Harita dondurulse/egilse de pin dik dursun.
          'icon-rotation-alignment': 'viewport',
          'icon-pitch-alignment': 'viewport',
          'symbol-sort-key': PIN_SORT_KEY,
        },
      });
    } else {
      // Acil yedek: ikon uretilemediyse eski daire pinler. Gorsel kayip var,
      // islevsel kayip yok - harita asla bos kalmiyor.
      map.addLayer({
        id: 'stations',
        type: 'circle',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        paint: {
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
    }

    // Musait soket sayisi pinin KAFASINDA.
    //
    // Bilerek AYRI katman: boylece pin ikonu glif (font) istegine hic baglanmaz.
    // Tek symbol katmaninda birlestirilseydi symbol bucket'i glif bagimliliklari
    // cozulmeden render edilmezdi ve Mapbox'ta font gecikirse/duserse PINLER DE
    // gecikirdi - dosyanin basindaki not bu riskin gercek oldugunu belgeliyor.
    // Birlestirmek "komsu pinin sayisi ustume bindi" sorununu zaten cozmez:
    // GL JS tek katmanda bile once tum ikonlari, sonra tum metinleri cizer.
    map.addLayer({
      id: 'station-count',
      type: 'symbol',
      source: 'stations',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['to-string', ['get', 'available']],
        'text-font': ['${boldFont}'],
        'text-size': ['case', ['==', ['get', 'selected'], true],
          PIN_SPECS.sel.font, PIN_SPECS.def.font],
        'text-anchor': 'center',
        'text-offset': pinsOk ? PIN_TEXT_OFFSET : [0, 0],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-rotation-alignment': 'viewport',
        'symbol-sort-key': PIN_SORT_KEY,
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

    // Nabiz dongusu rAF'i BOSA dondurmemeli. Eskiden 'load' aninda baslayip
    // kullanici konumu hic gelmese bile sonsuza kadar donuyordu (rota
    // onizlemesinde konum hic verilmiyor); konum geldiginde ise her karede
    // setPaintProperty cagirip haritanin TAMAMINI 60 Hz yeniden cizdiriyordu -
    // kullanici alt sheet'te liste okurken veya baska sekmedeyken bile.
    // Artik yalnizca konum varken VE RN "ekran odakta" derken doner.
    var pulseStart = null;
    var hasUser = false;
    var pulseOn = true;
    var pulseRaf = null;

    function pulse(ts) {
      if (pulseStart === null) pulseStart = ts;
      var t = ((ts - pulseStart) % 2000) / 2000;
      map.setPaintProperty('user-pulse', 'circle-radius', 10 + t * 18);
      map.setPaintProperty('user-pulse', 'circle-opacity', 0.35 * (1 - t));
      pulseRaf = requestAnimationFrame(pulse);
    }
    function startPulse() {
      if (pulseRaf === null && hasUser && pulseOn) pulseRaf = requestAnimationFrame(pulse);
    }
    function stopPulse() {
      if (pulseRaf !== null) {
        cancelAnimationFrame(pulseRaf);
        pulseRaf = null;
        pulseStart = null;
      }
    }

    window.__twSetPulse = function (on) {
      pulseOn = !!on;
      if (pulseOn) startPulse(); else stopPulse();
    };
    window.__twSetUser = function (lng, lat) {
      hasUser = true;
      map.getSource('user').setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }],
      });
      startPulse();
    };

    map.on('click', 'stations', function (e) {
      var f = e.features && e.features[0];
      if (f) post({ type: 'stationPress', id: f.properties.id });
    });

    // Kume acma zoom'u, iki kutuphanenin imzasi ayrilan tek yeri: MapLibre 5
    // Promise donduruyor, Mapbox GL JS ise callback bekliyor. Yanlisini
    // cagirinca kumeye her dokunusta "then is not a function" patliyor.
    map.on('click', 'clusters', function (e) {
      var f = e.features && e.features[0];
      if (!f) return;
      var expand = function (z) {
        map.easeTo({ center: f.geometry.coordinates, zoom: z });
      };
      var pending = map.getSource('stations').getClusterExpansionZoom(
        f.properties.cluster_id,
        function (err, z) { if (!err && z != null) expand(z); }
      );
      if (pending && typeof pending.then === 'function') {
        pending.then(expand).catch(function () {});
      }
    });

    // Bos harita alanina (istasyon/cluster disi) dokunuldugunda RN tarafina
    // haber ver; boylece uygulama alt sheet'i kapatabilir - haritayla
    // etkilesim niyeti listeyle degil haritayla oldugunu gosterir.
    map.on('click', function (e) {
      var hits = map.queryRenderedFeatures(e.point, { layers: ['stations', 'clusters'] });
      if (hits.length === 0) post({ type: 'mapPress' });
    });

    opened = true;
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
    // Ekran odagi kaybolunca nabzi durdur: aksi halde kullanici baska
    // sekmedeyken de harita 60 Hz yeniden cizilir.
    setPulse: function (on) {
      if (window.__twSetPulse) window.__twSetPulse(on);
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
