/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  // Saat kadrani complication'i. Eklenti bu tipi watchOS uygulamasinin
  // ICINE gomuyor (bkz. with-xcode-changes.js, isWatchOSExtensionTarget).
  type: 'watch-widget',

  name: 'watchcomplication',
  displayName: 'TORA WATT',

  // Paket adi saat uygulamasinin ALTINDA olmali, yoksa gomme dogrulamasi
  // (ValidateEmbeddedBinary) hedefi reddediyor.
  bundleIdentifier: '.watchkitapp.complication',

  // containerBackground ve Gauge'un aksesuar bicimi watchOS 10 istiyor.
  deploymentTarget: '10.0',

  icon: '../../assets/images/icon.png',

  colors: {
    $accent: '#0FB5A3',
  },
};
