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
  // Istasyon isaretcisi damla/pin. UC KANAL, UC AYRI BILGI:
  //   kafa BOYUTU        -> guc sinifi (AC / DC / HPC)
  //   merkez ISARETI     -> guc sinifi yedegi (nokta = duvar prizi hizi, simsek = hizli)
  //   RIM MURKKEBI       -> "simdi sarj olabilir miyim"
  //   govde TONU         -> tam durum (onay kanali)
  //
  // Rim = kafayi ceviren gorunur beyaz bandin ne kadarinin KOYU kapatildigi.
  // Olculdu: bu kanalin siniri murekkep/beyaz = 15.28:1 ve TAMAMEN AKROMATIK,
  // yani protanopide 14.82, doteranopide 15.54 - hic degismiyor. Karsilastirma:
  // durum renklerinin kendisi doteranopide cokuyor (AVAILABLE ~ FULL CIEDE2000
  // = 6.7, yani AYIRT EDILEMEZ). Renk artik yalnizca ONAY kanali.
  //
  // Pinin ICINDE artik YAZI YOK: beyaz rakam durum renkleri uzerinde 2.20-3.21:1
  // kaliyordu (AA 4.5 ister) ve paydasiz "2" bir istasyonda 2/2, digerinde 2/40
  // demekti. Sayi z13'ten sonra pinin ALTINA, birimiyle ve paydasiyla aciliyor
  // (bkz. 'station-label'). Yan fayda: z13 ALTINDA istasyon isaretcilerinin glif
  // (font) bagimliligi SIFIR - Mapbox'ta font gecikirse pinler gecikmiyor.
  //
  // WebView'e servis edilen yerel dosya olmadigi icin ikonlar burada, calisma
  // zamaninda canvas ile cizilip map.addImage ile stile veriliyor. Cizim SENKRON:
  // addLayer'dan once bitiyor, yani "Image ... could not be loaded" hic cikmiyor.
  //
  // KULLANILMAYAN yollar ve nedenleri:
  //  - map.loadImage: MapLibre 5'te Promise, Mapbox 3'te callback donduruyor -
  //    getClusterExpansionZoom ile birebir ayni tuzak. Cagirmiyoruz.
  //  - SVG data URI: WebKit SVG'yi once kendi intrinsic boyutunda rasterize
  //    edip buyutuyor (iPhone'da bulanik pin) ve decode asenkron.
  //  - SDF ikon + icon-color: mesafe alani damlanin sivri ucunu kortelir, golge
  //    de mumkun olmaz, rim hic mumkun olmaz.

  // DPR TAM SAYI olsun: Android WebView 2.625 / 2.75 gibi kesirli yogunluklar
  // bildiriyor, iOS 2 veya 3. Yukari yuvarlayip 3'te kirpiyoruz.
  var PIN_DPR = Math.max(1, Math.min(3, Math.ceil(window.devicePixelRatio || 1)));

  // Tum olculer CSS (logical) px; cizim sirasinda elle PIN_DPR ile carpiliyor.
  // ctx.setTransform ile OLCEKLEME YAPMIYORUZ: shadowBlur/shadowOffsetY'nin
  // donusum matrisinden etkilenip etkilenmedigi motorlar arasinda ayrisabiliyor.
  var PIN_PAD_X = 6;
  var PIN_PAD_TOP = 6;
  // GORUNUR ucun bitmap'in ALT kenarina uzakligi (golge sigsin diye). TUM
  // ikonlarda birebir ayni olmak ZORUNDA, cunku icon-offset tek bir sabit.
  // Asagidaki tipY hesabindaki Math.ceil yuvarlama fazlasini USTE atiyor;
  // sozlesme bu, ve uc tier x uc DPR'nin dokuzunda da mesafe tam gapDev cikiyor.
  var PIN_TIP_GAP = 8;
  var PIN_SHADOW = 'rgba(6,40,33,0.28)';
  var PIN_SHADOW_BLUR = 5;
  var PIN_SHADOW_DY = 1.5;

  // Kafa merkezi -> gorunur sivri uc. UC SINIFTA DA AYNI olmak ZORUNDA:
  // station-halo ve stations-hit bu mesafeyi circle-translate ile telafi ediyor
  // ve circle-translate veriye bagli ifade KABUL ETMIYOR (Style Spec'te
  // parameters:["zoom"], yani data-constant). Sabit tuttugumuz icin hale de
  // isabet dairesi de UC TIER'DE DE tam hizali - sifir kayma.
  // Bedeli: d/r orani 2.44 (AC) .. 1.65 (HPC), teget acisi 65.8 -> 52.6 derece.
  // Yani AC biraz daha sivri, HPC biraz daha bodur. 13 derecelik bu yayilim
  // bilincli bir takas; yaricap araligi bu yuzden dar tutuldu.
  var PIN_TAIL = 32;
  var PIN_RING = 3;   // gorunur beyaz/koyu rim bandi
  // En distaki OPAK koyu tel. Beyaz halka nane zeminde 1.12:1, suda 1.32 - yani
  // pini haritadan hic ayirmiyordu. Ayni yerde murekkep 13.69 / 11.61 / 11.66 /
  // 13.67 (bina dolgusu 0.6 alfa ile kompozit) / 14.48. 1 CSS px secildi cunku
  // DPR1/2/3'te tam sayi device px veriyor - yarim piksel AA'si yok.
  var PIN_EDGE = 1;
  var PIN_BAND = PIN_RING + PIN_EDGE;

  var PIN_INK = '${colors.text}';
  var PIN_KEYLINE = '#FFFFFF';

  // ink: rim'in KOYU kapatilan orani. Bu, stationAvailability()'nin uc durumunun
  // gorsel karsiligi - surekli bir oran DEGIL, oyle iddia etmiyoruz.
  //   0    -> rim tamamen beyaz        (hepsi musait)
  //   0.5  -> omuzlar koyu, tepe beyaz (kismen)
  //   1    -> rim tamamen koyu         (dolu)
  //   1+dash -> kesikli                (bilinmiyor)
  // Govde HER durumda renkli kalir: beyaz govdeli bir pin nane (1.12) ve krem
  // (1.12) zemine gomulur.
  var PIN_STATUS = {
    AVAILABLE: { body: '${statusColors.AVAILABLE}', ink: 0,   dash: false },
    PARTIAL:   { body: '${statusColors.PARTIAL}',   ink: 0.5, dash: false },
    FULL:      { body: '${statusColors.FULL}',      ink: 1,   dash: false },
    UNKNOWN:   { body: '${statusColors.UNKNOWN}',   ink: 1,   dash: true  }
  };

  // Kafa caplari 31 / 36 / 42 dp (dolgu yaricapi + 4 dp kenar ailesi).
  // Isaret DURUSTCE iki degerli: nokta = duvar prizi hizi (AC), simsek = hizli
  // sarj (DC/HPC). Surucunun yoldaki asil ayrimi bu; DC ile HPC farkini boyut
  // ve z>=13'te etiketteki kW tasiyor.
  var PIN_TIERS = {
    AC:  { r: 11.5, mark: 'dot'  },
    DC:  { r: 14,   mark: 'bolt' },
    HPC: { r: 17,   mark: 'bolt' }
  };

  // Simsek: [-0.5,0.5] kutusunda 6 nokta; kutu kenari kafa yaricapinin 1.16 kati.
  var PIN_BOLT = [[0.18,-0.50],[-0.30,0.06],[-0.02,0.06],[-0.18,0.50],[0.30,-0.08],[0.02,-0.08]];

  function drawMark(ctx, kind, cx, cy, r, color) {
    ctx.fillStyle = color;
    if (kind === 'dot') {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.30, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    var k = r * 1.16;
    ctx.beginPath();
    for (var i = 0; i < PIN_BOLT.length; i++) {
      var x = cx + PIN_BOLT[i][0] * k;
      var y = cy + PIN_BOLT[i][1] * k;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawPinImage(tier, st) {
    var s = PIN_DPR;
    var outer = tier.r + PIN_BAND;

    var gapDev = Math.round(PIN_TIP_GAP * s);
    var w = Math.ceil((2 * outer + 2 * PIN_PAD_X) * s);
    // Yuvarlama fazlasi USTE gitsin ki uc-alt kenar mesafesi her ikonda tam
    // gapDev kalsin - sabit icon-offset'in tek sarti bu.
    var tipY = Math.ceil((PIN_PAD_TOP + outer + PIN_TAIL) * s);
    var h = tipY + gapDev;

    var cx = w / 2;
    var cy = tipY - PIN_TAIL * s;
    // Kose noktasi ring degil BAND kadar yukarida: en genis kontur yuvarlak
    // birlesimle tam band kadar tastigi icin gorunur uc yine tam tipY'de biter.
    var vertexY = tipY - PIN_BAND * s;
    var r = tier.r * s;
    var d = vertexY - cy;

    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    var ctx = cv.getContext('2d');
    if (!ctx) throw new Error('canvas 2d baglami alinamadi');

    // Damla = kafa cemberinin BUYUK yayi + kose noktasindan cembere iki teget.
    var t = Math.acos(Math.min(0.999, r / d));
    var a0 = Math.PI / 2 - t;   // sag teget degme noktasi
    var a1 = Math.PI / 2 + t;   // sol teget degme noktasi

    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1, true);
    ctx.lineTo(cx, vertexY);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1) Koyu tel + GOLGE. Golgeyi tek geciste birakiyoruz; ikincisi ust uste
    //    binip koyulasirdi.
    ctx.save();
    ctx.shadowColor = PIN_SHADOW;
    ctx.shadowBlur = PIN_SHADOW_BLUR * s;
    ctx.shadowOffsetY = PIN_SHADOW_DY * s;
    ctx.lineWidth = PIN_BAND * 2 * s;
    ctx.strokeStyle = PIN_INK;
    ctx.stroke();
    ctx.restore();

    // 2) Beyaz rim telin ICINE oturur; disarida tam PIN_EDGE kadar koyu kalir.
    ctx.lineWidth = PIN_RING * 2 * s;
    ctx.strokeStyle = PIN_KEYLINE;
    ctx.stroke();

    // 3) Govde rim'in ic yarisini kapatir; gorunur rim tam olarak r .. r+ring.
    ctx.fillStyle = st.body;
    ctx.fill();

    // 4) Rim murekkebi. rim yaricapi r+band/2 ve lineWidth band olunca gorunur
    //    bandin uzeri BIREBIR kapaniyor (butt cap sart, yoksa uclar tasar).
    if (st.ink > 0) {
      var band = PIN_RING * s;
      var rim = r + band / 2;
      var span = 2 * Math.PI - 2 * t;   // kafanin GORUNUR cember yayi
      var dashed = st.dash && typeof ctx.setLineDash === 'function';

      ctx.lineCap = 'butt';
      ctx.lineWidth = band;
      ctx.strokeStyle = PIN_INK;

      if (dashed) {
        // Desen adimi yay uzunlugunu TAM bolmezse uclarda yarim cizgi kalir.
        var n = Math.max(7, Math.round((span * rim) / (5 * s)));
        var step = (span * rim) / n;
        ctx.setLineDash([step * 0.55, step * 0.45]);
      }

      if (st.ink >= 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, rim, a0, a1, true);
        ctx.stroke();
      } else {
        // Koyu kisim iki teget ucundan ICERI dogru buyur, tepe en son kapanir:
        // "beyaz kep" ile "tamamen koyu" arasindaki fark uzaktan da okunur.
        var half = span * st.ink / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, rim, a0, a0 - half, true);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, rim, a1, a1 + half, false);
        ctx.stroke();
      }

      if (dashed) ctx.setLineDash([]);
      ctx.lineCap = 'round';
    }

    // Isaret HER durumda cizilir: guc sinifi, durumdan bagimsiz bir gercek.
    // Murekkep dort govdenin hepsinde AA (6.94 / 6.51 / 4.75 / 6.01).
    drawMark(ctx, tier.mark, cx, cy, r, PIN_INK);

    // ImageData iki kutuphanenin de bekledigi {width,height,data} imzasi.
    return ctx.getImageData(0, 0, w, h);
  }

  var PIN_PREFIX = 'tw-pin-';

  // Kimlik: tw-pin-<AC|DC|HPC>-<AVAILABLE|PARTIAL|FULL|UNKNOWN>
  function ensurePinImage(id) {
    if (!id || id.indexOf(PIN_PREFIX) !== 0) return false;
    if (map.hasImage(id)) return true;
    var parts = id.slice(PIN_PREFIX.length).split('-');
    if (parts.length !== 2) return false;
    var tier = PIN_TIERS[parts[0]];
    var st = PIN_STATUS[parts[1]];
    if (!tier || !st) return false;
    map.addImage(id, drawPinImage(tier, st), { pixelRatio: PIN_DPR });
    return true;
  }

  // 3 guc sinifi x 4 durum = 12 bitmap; 'sel' varyanti YOK, cunku secim pini
  // buyutmuyor. Olculen atlas (GL JS'in ikon basina 1 px dolgusu dahil):
  // DPR3'te 1.31 MB RGBA, DPR2'de 0.59 MB. Cihazda bellek sikisirsa (dosyanin
  // belgeledigi WKWebView cokmesi) ilk cevrilecek vida PIN_DPR tavani: 2.
  function buildAllPinImages() {
    var tiers = ['AC', 'DC', 'HPC'];
    var statuses = ['AVAILABLE', 'PARTIAL', 'FULL', 'UNKNOWN'];
    for (var i = 0; i < tiers.length; i++) {
      for (var j = 0; j < statuses.length; j++) {
        ensurePinImage(PIN_PREFIX + tiers[i] + '-' + statuses[j]);
      }
    }
  }

  // Emniyet kemeri: beklenmedik bir status/power degeri gelirse ya da bir ikon
  // dusmusse o an uret. Aksi halde o pin SESSIZCE kaybolur.
  map.on('styleimagemissing', function (e) {
    try { ensurePinImage(e && e.id); } catch (err) {}
  });

  // icon-anchor 'bottom' bitmap'in ALT-ORTA noktasini koordinata oturtur;
  // gorunur uc alt kenardan PIN_TIP_GAP yukarida oldugu icin bitmap'i ayni
  // miktarda asagi itiyoruz, uc tam koordinata gelsin.
  var PIN_ICON_OFFSET = Math.round(PIN_TIP_GAP * PIN_DPR) / PIN_DPR;

  // Gorunmez isabet dairesi. YARICAP == KAYDIRMA olmasi kasitli: dairenin alt
  // kenari tam olarak koordinatin (yani sivri ucun) uzerinden geciyor, ustteki
  // her sey iceride kaliyor. Kafa merkezi -32'de, en genis dis yaricap 21 (HPC):
  // 5 + 21 = 26 <= 27, yani UC TIER'DE DE kafanin tamami kapsaniyor.
  // Etkin hedef 54 dp; MIN_TOUCH_TARGET 44 (src/theme/layout.ts).
  // Bu katman opaklik 0 olmasina ragmen sorguda doner - GL JS'te yaricap
  // circle-radius + circle-stroke-width'ten hesaplanir, opakliktan degil - ve
  // circle-translate sorgu geometrisine de uygulanir. Cizim maliyeti SIFIR:
  // render yolu opaklik 0 ve kontur 0 iken erken donuyor.
  var PIN_HIT_RADIUS = 27;

  // Cizim/yerlestirme onceligi. DIKKAT - isaret iki katmanda TERS calisir:
  // allow-overlap ACIK olan ikon katmaninda BUYUK deger uste cizilir;
  // allow-overlap KAPALI olan etiket katmaninda KUCUK deger once yerlestirilir
  // (Style Spec: "features with a lower sort key will have priority during
  // placement"). Etiket katmani bu yuzden PIN_PLACE_RANK kullaniyor.
  // Ayni zamanda StationMap'in mesafeye gore sirali geojson'undan gelen
  // "en uzak istasyon en ustte" hatasini da kapatiyor.
  var PIN_RANK = ['+',
    ['case', ['==', ['get', 'selected'], true], 1000, 0],
    ['match', ['get', 'status'], ['AVAILABLE', 'PARTIAL'], 100, 0],
    ['match', ['get', 'power'], 'HPC', 30, 'DC', 20, 10]];
  var PIN_PLACE_RANK = ['-', 0, PIN_RANK];

  var PIN_IMAGE = ['concat', PIN_PREFIX,
    ['match', ['get', 'power'], 'HPC', 'HPC', 'DC', 'DC', 'AC'],
    '-',
    ['match', ['get', 'status'],
      'AVAILABLE', 'AVAILABLE',
      'PARTIAL', 'PARTIAL',
      'FULL', 'FULL',
      'UNKNOWN']];

  // Olcu sayilarinin tek kaynagi PIN_TIERS kalsin diye ifade oradan turetiliyor.
  var PIN_TIER_RADIUS = ['match', ['get', 'power'],
    'HPC', PIN_TIERS.HPC.r, 'DC', PIN_TIERS.DC.r, PIN_TIERS.AC.r];

  // Pin alti etiketi. z13-15: yalnizca guc. z>=15: guc + paydali musaitlik.
  // DIKKAT: '\\n' cift ters bolu ile YAZILMALI. Bu dosya bir template literal;
  // tek ters boluyle yazilirsa uretilen JS dizesinin ICINE gercek satir
  // sonu girer ve sayfa HIC acilmaz.
  var LABEL_KW_KNOWN = ['>', ['to-number', ['get', 'maxKw'], 0], 0];
  var LABEL_KW = ['concat', ['to-string', ['round', ['to-number', ['get', 'maxKw'], 0]]], ' kW'];
  var LABEL_FREE = ['case',
    ['>', ['to-number', ['get', 'total'], 0], 0],
    ['concat', ['to-string', ['get', 'available']], '/', ['to-string', ['get', 'total']], ' m\\u00fcsait'],
    'Durum bilinmiyor'];
  // maxKw 0 ise (soketi olmayan/bozuk veri) "0 kW" basmak yerine z13-15'te
  // etiket hic cizilmiyor.
  var STATION_LABEL = ['step', ['zoom'],
    ['case', LABEL_KW_KNOWN, LABEL_KW, ''],
    15,
    ['case', LABEL_KW_KNOWN, ['concat', LABEL_KW, '\\n', LABEL_FREE], LABEL_FREE]];
  map.on('load', function () {
    // Yukleme bekcisini HEMEN sustur. 'load' geldiyse harita takilmamistir;
    // bundan sonra patlayan bir sey olursa window.onerror gercek hatayi
    // bildirir. Bu satir pin yeniden tasariminda (c46aaa7) cevresindeki kodla
    // birlikte silinmisti ve bekci her acilista, harita calisirken, 20 sn sonra
    // "Harita acilamadi - son asama: stil geldi" basiyordu. check-map-html bu
    // atamanin varligini artik denetliyor.
    opened = true;
    stage = 'yuklendi';
${config.onLoadScript}
    map.addSource('stations', {
      type: 'geojson',
      data: EMPTY,
      cluster: true,
      clusterRadius: 52,
      // Pinler buyudu (HPC 32 -> 42 dp); kumeleme de bir kademe uzasin, yoksa
      // z13.x'te yogun semt eskisinden sikisik goruntu verir. Kume artik gercek
      // bilgi tasidigi icin bu bir kayip degil.
      clusterMaxZoom: 14,
      // Kume "burada 24 nokta var" degil "24'unun 8'inde su an sarj olabilirsin"
      // desin. [operator, map_ifadesi] kisa yazimi iki kutuphanede de ayni
      // supercluster koduna, ['+', ['accumulated'], ['get', ad]] seklinde
      // aciliyor. kwmax BILEREK YOK: 40 AC direginin arasindaki tek bir 350 kW
      // tum baloncugu "ultra hizli" diye boyar, yaniltici olur.
      clusterProperties: {
        // En az bir bos soketi olan istasyon sayisi.
        free: ['+', ['match', ['get', 'status'], ['AVAILABLE', 'PARTIAL'], 1, 0]],
        // Hepsi bilinmiyorsa kume kirmizi degil gri olsun: "0 bos" ile
        // "durumu bilinmiyor" ayni sey degil.
        known: ['+', ['case', ['!=', ['get', 'status'], 'UNKNOWN'], 1, 0]]
      },
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

    // Pin kafasi koordinatin PIN_TAIL kadar ustunde; hale ve isabet dairesi bu
    // mesafeyi circle-translate ile telafi ediyor. Kuyruk UC SINIFTA DA SABIT
    // oldugu icin tek bir sabit uc tier'i de TAM hizaliyor (kayma 0 dp).
    // 'viewport' capa sart - iki parmakla dondurme dragRotate:false'a ragmen
    // acik, hale pinden ayrilmasin.
    var PIN_HEAD_DY = pinsOk ? PIN_TAIL : 0;

    // Secim artik pini BUYUTMUYOR: boyut kanali yalnizca guc sinifini tasiyor,
    // secili bir AC pini buyuseydi DC gibi okunur ve hiyerarsi kendi kendini
    // bozardi. Yumusak disk + net halka tek katmanda.
    // Halka primary DEGIL primaryDark: olculdu, #0FB5A3 zeminde 2.31 / 1.96 /
    // 1.96 / 2.30 ile grafik nesne esigi 3:1'i GECEMIYOR; #0C8F82 ayni
    // zeminlerde 3.57 / 3.03 / 3.04 / 3.57.
    // KIMLIK DEGISMIYOR: rota katmanlari beforeId olarak bunu kullaniyor.
    map.addLayer({
      id: 'station-halo',
      type: 'circle',
      source: 'stations',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], true]],
      paint: {
        // Pinin dis kenari r + 4; hale 5 dp disinda duruyor.
        'circle-radius': ['+', PIN_TIER_RADIUS, PIN_BAND + 5],
        'circle-color': '${colors.primary}',
        'circle-opacity': 0.2,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '${colors.primaryDark}',
        'circle-translate': [0, -PIN_HEAD_DY],
        'circle-translate-anchor': 'viewport',
      },
    });
    // Kume grameri = pin grameri. Kenar ailesi birebir ayni: [koyu tel 1]
    // [beyaz 3][dolgu]. circle-stroke yaricapin DISINA cizildigi icin tel
    // dairesi r + 3 + 1. Beyaz keyline "burada sarj olabilirsin", koyu keyline
    // "olamazsin" demek - pindeki rim diliyle ayni.
    // Eskiden "hic bos yok" kumesi beyaz dolgu + kirmizi konturdu: beyaz/nane
    // 1.12, kirmizi/nane 2.88 - yani haritanin "hicbir yerde sarj olamazsin"
    // diyen tek nesnesi en dusuk kontrastli nesnesiydi.
    var CLUSTER_RADIUS = ['step', ['get', 'point_count'], 17, 10, 22, 25, 27];
    var CLUSTER_COLOR = ['case',
      ['==', ['get', 'known'], 0], '${statusColors.UNKNOWN}',
      ['==', ['get', 'free'], 0], '${statusColors.FULL}',
      ['>=', ['*', ['get', 'free'], 2], ['get', 'point_count']], '${statusColors.AVAILABLE}',
      '${statusColors.PARTIAL}'];

    map.addLayer({
      id: 'cluster-edge',
      type: 'circle',
      source: 'stations',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '${colors.text}',
        'circle-radius': ['+', CLUSTER_RADIUS, PIN_RING + PIN_EDGE],
      },
    });

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'stations',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': CLUSTER_COLOR,
        'circle-radius': CLUSTER_RADIUS,
        'circle-stroke-width': PIN_RING,
        'circle-stroke-color': ['case', ['>', ['get', 'free'], 0], '#FFFFFF', '${colors.text}'],
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'stations',
      filter: ['has', 'point_count'],
      layout: {
        // Paydasiz sayi yaniltiyordu; "8/24" kendi baglamini tasiyor.
        // point_count_abbreviated KULLANILMIYOR: 1000'in altinda SAYI, ustunde
        // "1.2k" string'i donuyor; pay gercek sayi iken paydanin kisaltilmasi
        // orani bozar.
        'text-field': ['concat',
          ['to-string', ['get', 'free']], '/', ['to-string', ['get', 'point_count']]],
        'text-font': ['${boldFont}'],
        'text-size': ['step', ['get', 'point_count'], 12, 25, 13],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      // Beyaz murekkep #0FB5A3 uzerinde 2.57:1 idi. Koyu murekkep dort kume
      // renginin hepsinde AA: 6.94 / 6.51 / 4.75 / 6.01.
      paint: { 'text-color': '${colors.text}' },
    });
    // Istasyon pini. Katman KIMLIGI degismiyor ('stations'), cunku tiklama
    // sorgusu ona gore yazilmis.
    if (pinsOk) {
      map.addLayer({
        id: 'stations',
        type: 'symbol',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': PIN_IMAGE,
          // 1 DISINDA deger verme: bitmap buyutuldugunde bulaniklasir. Guc
          // sinifi zaten ayri, dogru olcude uretilmis bitmaplerde.
          'icon-size': 1,
          'icon-anchor': 'bottom',
          'icon-offset': [0, PIN_ICON_OFFSET],
          // ZORUNLU: bunlar olmadan yogun bolgede pinlerin bir kismi SESSIZCE
          // kaybolur. Kalabalik yonetimini kume ve etiket katmani yapiyor.
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          // Harita dondurulse/egilse de pin dik dursun.
          'icon-rotation-alignment': 'viewport',
          'icon-pitch-alignment': 'viewport',
          'symbol-sort-key': PIN_RANK,
        },
      });
    } else {
      // Acil yedek: ikon uretilemediyse daire pinler. Guc sinifi yaricapta,
      // musaitlik konturda (beyaz = sarj olabilirsin, koyu = olamazsin) - gorsel
      // kayip var, ERISILEBILIRLIK kaybi yok.
      // circle-sort-key LAYOUT'tadir (Style Spec: layout_circle), paint'te degil.
      map.addLayer({
        id: 'stations',
        type: 'circle',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        layout: { 'circle-sort-key': PIN_RANK },
        paint: {
          'circle-radius': PIN_TIER_RADIUS,
          'circle-color': ['match', ['get', 'status'],
            'AVAILABLE', '${statusColors.AVAILABLE}',
            'PARTIAL', '${statusColors.PARTIAL}',
            'FULL', '${statusColors.FULL}',
            '${statusColors.UNKNOWN}'],
          'circle-stroke-width': PIN_RING,
          'circle-stroke-color': ['match', ['get', 'status'],
            ['AVAILABLE', 'PARTIAL'], '#FFFFFF',
            '${colors.text}'],
        },
      });
    }
    // Sayi artik pinin ICINDE degil ALTINDA, birimiyle ve paydasiyla.
    // Iki sebep: 12 px beyaz rakam durum renkleri uzerinde 2.20-3.21:1 kaliyordu
    // (AA 4.5 istiyor) ve paydasiz "2" bir istasyonda 2/2, digerinde 2/40
    // anlamina geliyordu. Burada koyu murekkep + beyaz halo: zemine karsi 13.69,
    // halo uzerinde 15.28.
    //
    // minzoom 13, clusterMaxZoom 14 ile bilincli olarak ortusuyor: z13-14
    // arasinda yalnizca KUME DISI kalmis ayrik pinler gorunur - yani "komsu pin
    // yok, goreli boyut ise yaramaz" durumu tam da etiketin acildigi durum.
    //
    // Carpisma ACIK (allow-overlap false): kalabalik semtte ETIKETLER seyreliyor,
    // pinler degil. sort-key burada TERS calisir - dusuk deger once yerlesir.
    map.addLayer({
      id: 'station-label',
      type: 'symbol',
      source: 'stations',
      filter: ['!', ['has', 'point_count']],
      minzoom: 13,
      layout: {
        'text-field': STATION_LABEL,
        'text-font': ['${boldFont}'],
        // 11'in altina inilmiyor: harita glifleri iOS Dynamic Type'a da Android
        // font scale'ine de TEPKI VERMIYOR (WebView SDF gliflerine uygulamaz),
        // yani bu taban kullanicinin buyutemeyecegi tek olcu.
        'text-size': 11,
        'text-anchor': 'top',
        // Capa feature koordinati, yani pinin UCU; golge ucun 8 px altina kadar
        // iniyor, etiket onun da altinda basliyor (0.85 em = 9.35 dp).
        'text-offset': pinsOk ? [0, 0.85] : [0, 2],
        'text-max-width': 8,
        'text-padding': 3,
        'text-allow-overlap': false,
        'symbol-sort-key': PIN_PLACE_RANK,
      },
      paint: {
        'text-color': '${colors.text}',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.4,
      },
    });

    // Dokunma hedefi: cizilen pin 31-42 dp genis, bu daire 54 dp.
    map.addLayer({
      id: 'stations-hit',
      type: 'circle',
      source: 'stations',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': PIN_HIT_RADIUS,
        'circle-color': '#000000',
        'circle-opacity': 0,
        'circle-translate': pinsOk ? [0, -PIN_HIT_RADIUS] : [0, 0],
        'circle-translate-anchor': 'viewport',
      },
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

    // TEK click isleyicisi. Eskiden katman bazli 'stations'/'clusters'
    // dinleyicileri ile bos alani sinayan genel dinleyici AYRI calisiyordu;
    // isabet alani buyudugunde ayni dokunus hem stationPress hem mapPress
    // uretir ve sheet acilir acilmaz kapanirdi. Tek yol oldugu icin bu kusur
    // artik YAPISAL OLARAK imkansiz.
    //
    // 'stations' listede ikinci guvence olarak duruyor: isabet dairesi hangi
    // sebeple olursa olsun donmezse cizilen ikonun kendisine dokunmak calisir
    // (icon-ignore-placement:true olan symbol'ler de sorguda doner - kutulari
    // ignoredGrid'e yaziliyor). 'cluster-edge' de listede, yoksa kumenin en
    // distaki 4 dp'lik koyu bandi olu bolge olurdu.
    var CLICK_LAYERS = ['stations-hit', 'stations', 'clusters', 'cluster-edge'];

    // Sorgu sonucu kaynak/cizim sirasinda gelir, DOKUNULAN NOKTAYA gore degil;
    // StationMap geojson'u mesafeye gore siraladigi icin ilkini almak
    // kalabalikta yanlis istasyonu acmak demek. Gorsel olarak en yakin pini sec.
    // Pin KAFASI koordinatin PIN_HEAD_DY kadar ustunde oldugu icin mesafe
    // kafaya gore olculuyor; kuyruk sabit oldugundan bu tek bir sayi.
    function pickNearest(feats, p, headDy) {
      var best = null, bestD = Infinity;
      for (var i = 0; i < feats.length; i++) {
        var g = feats[i].geometry;
        if (!g || g.type !== 'Point') continue;
        var sp = map.project(g.coordinates);
        var dx = sp.x - p.x;
        var dy = (sp.y - headDy) - p.y;
        var dd = dx * dx + dy * dy;
        if (dd < bestD) { bestD = dd; best = feats[i]; }
      }
      return best;
    }

    map.on('click', function (e) {
      var hits = map.queryRenderedFeatures(e.point, { layers: CLICK_LAYERS });
      var stationHits = [];
      var clusterHits = [];
      for (var i = 0; i < hits.length; i++) {
        var props = hits[i].properties || {};
        if (props.point_count != null) clusterHits.push(hits[i]);
        else if (props.id != null) stationHits.push(hits[i]);
      }

      // Pin kumeden oncelikli: belirsizlikte kullanicinin nisan aldigi sey
      // nokta isaretcisidir.
      var station = pickNearest(stationHits, e.point, PIN_HEAD_DY);
      if (station) {
        post({ type: 'stationPress', id: station.properties.id });
        return;
      }

      var cluster = pickNearest(clusterHits, e.point, 0);
      if (cluster) {
        // Kume acma zoom'u, iki kutuphanenin imzasi ayrilan TEK yeri: MapLibre 5
        // Promise donduruyor, Mapbox GL JS ise callback bekliyor. Yanlisini
        // cagirinca kumeye her dokunusta "then is not a function" patliyor.
        var expand = function (z) {
          map.easeTo({ center: cluster.geometry.coordinates, zoom: z });
        };
        var pending = map.getSource('stations').getClusterExpansionZoom(
          cluster.properties.cluster_id,
          function (err, z) { if (!err && z != null) expand(z); }
        );
        if (pending && typeof pending.then === 'function') {
          pending.then(expand).catch(function () {});
        }
        return;
      }

      // Bos harita alani: uygulama alt sheet'i kapatabilsin.
      post({ type: 'mapPress' });
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
