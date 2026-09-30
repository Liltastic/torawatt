import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * Cikti dogrudan Go binary'sinin gomecegi klasore yaziliyor
 * (bkz. admin/backend/internal/web). Boylece "npm run build" sonrasi
 * "go build" tek dosya uretiyor, arada kopyalama adimi yok.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      /**
       * Arayuz kutuphanesinin bilesenleri paylasilan yardimcilari
       * "@react-cupertino-ui/shared/lib/..." derin yoluyla cagiriyor. Paketin
       * exports haritasi bu kalibi tanimliyor ve Node dogru cozuyor, ama
       * Rollup ayni kalibi cozemeyip derlemeyi durduruyor. Yolu dogrudan
       * dosyaya bagliyoruz; kutuphane bu kismi duzeltince alias kaldirilabilir.
       */
      {
        find: /^@react-cupertino-ui\/shared\/lib\/(.*)$/,
        replacement: `${here}node_modules/@react-cupertino-ui/shared/dist/lib/$1.js`,
      },
    ],
  },
  build: {
    outDir: '../backend/internal/web/dist',
    emptyOutDir: true,
  },
  server: {
    port: 5180,
    // Gelistirme sirasinda API'yi Go sunucusu veriyor.
    proxy: { '/api': 'http://localhost:8090' },
  },
});
