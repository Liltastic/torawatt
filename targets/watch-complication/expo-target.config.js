/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  // Saat kadrani complication'i. Eklenti bu tipi watchOS uygulamasinin
  // ICINE gomuyor (bkz. with-xcode-changes.js, isWatchOSExtensionTarget).
  type: 'watch-widget',

  name: 'watchcomplication',
  displayName: 'TORA WATT',

  // Paket adi saat uygulamasinin ALTINDA olmali, yoksa gomme dogrulamasi
  // (ValidateEmbeddedBinary) hedefi reddediyor.
  // '.watchkitapp.complication' Apple tarafindan "kullanilabilir degil"
  // diye reddedildi; o ad hesapta zaten kayitli. Tek sart bu kimligin SAAT
  // uygulamasinin kimligiyle baslamasi - son parca serbest.
  bundleIdentifier: '.watchkitapp.watchwidget',

  // containerBackground ve Gauge'un aksesuar bicimi watchOS 10 istiyor.
  deploymentTarget: '10.0',

  // IKON YOK, bilerek. Bir widget uzantisinin kendi uygulama ikonu olmaz;
  // complication galerisinde SAAT uygulamasinin ikonu gorunuyor. Ikon
  // verildiginde eklenti hedefe ASSETCATALOG_COMPILER_APPICON_NAME ekliyor
  // (bkz. configuration-list.js createWatchWidgetConfigurationList) ve
  // watchOS uzantisinda uygulanabilir icerik bulunmadigi icin derleme
  // "AppIcon did not have any applicable content" ile dusuyor.

  colors: {
    $accent: '#0FB5A3',
  },
};
