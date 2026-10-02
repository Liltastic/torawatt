/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',

  // Urun adi (Xcode hedefi); ana ekranda gorunen ad displayName.
  name: 'watch',
  displayName: 'TORA WATT',

  // Basta nokta = ana uygulamanin paket adina eklenir:
  // net.torasarj.torawatt.watchkitapp
  bundleIdentifier: '.watchkitapp',

  // watchOS 10: SwiftUI Map, .containerBackground ve aksesuar Gauge bu
  // surumle geliyor. Series 4 ve sonrasini kapsiyor.
  deploymentTarget: '10.0',

  // Telefonun ikonuyla ayni marka isareti (assets/images/icon.png).
  // Ikon verilmezse eklenti AppIcon asset'ini hic uretmiyor ve Xcode
  // derlemede patliyor - bu yuzden bilerek veriyoruz.
  icon: '../../assets/images/icon.png',

  // Marka turkuazi; SwiftUI'da .accentColor olarak geliyor.
  colors: {
    $accent: '#0FB5A3',
  },
};
