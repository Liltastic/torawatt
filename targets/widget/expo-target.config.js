/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',

  name: 'widget',
  displayName: 'TORA WATT',

  // Kilit ekrani aksesuar aileleri iOS 16, containerBackground iOS 17 istiyor.
  deploymentTarget: '17.0',

  icon: '../../assets/images/icon.png',

  colors: {
    $accent: '#0FB5A3',
  },
};
