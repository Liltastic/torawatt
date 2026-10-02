// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // admin/ kendi ayarlariyla derlenen ayri bir uygulama (bkz. admin/README.md);
    // mobil uygulamanin kurallari oraya uygulanmamali.
    ignores: ['dist/*', 'admin/*'],
  },
  {
    // Config eklentileri Node'da, CommonJS olarak calisiyor: __dirname,
    // require ve module burada tanimli. Varsayilan ayar dosyalari tarayici
    // kodu sandigi icin hepsini "tanimsiz" olarak isaretliyordu.
    files: ['plugins/**/*.js', 'metro.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' },
    },
  },
  {
    // Betikler ESM (.mjs) ve Node'da calisiyor.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly', fetch: 'readonly' },
    },
  },
]);
