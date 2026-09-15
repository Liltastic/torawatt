#!/usr/bin/env node
/**
 * mapHtml.ts icindeki WebView betigi bir template string'in icinde yasiyor,
 * bu yuzden TypeScript onu denetlemiyor. Bozuk JS sessizce bos harita uretiyor:
 * inline bir <script> ayristirilamazsa hic calismaz, yani window.onerror bile
 * kurulamaz ve harita sonsuza kadar "yukleniyor"da kalir.
 *
 * Bu script modulu GERCEKTEN derleyip buildMapHtml'i her taban harita icin
 * calistirir ve uretilen betigi node --check'ten gecirir.
 *
 * Neden gercek degerler: onceki surum ${...} yerlestirmelerini PLACEHOLDER ile
 * degistiriyordu ve tam da bu yuzden gercek bir hatayi kacirdi - bir yorum
 * icindeki tek ters bolulu kacis, sablon isleyince gercek satir sonuna donusup
 * yorumu ikiye bolmustu. PLACEHOLDER'li metinde gorunmuyordu.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = 'src/map/mapHtml.ts';
const out = mkdtempSync(join(tmpdir(), 'tora-map-'));

// Temadaki gercek degerler yerine sabitler: amac stil dogrulamak degil, uretilen
// betigin ayristirilabildigini kanitlamak. Alias cozumlemesi icin tsc'yi tek
// dosya modunda calistirdigimizdan import'u elle karsiliyoruz.
const THEME_STUB =
  'const theme_1={colors:{background:"#F2FBF6",surface:"#FFFFFF",surfaceMuted:"#EAF7F0",' +
  'text:"#0F2A22",textSecondary:"#5B7268",textTertiary:"#93A79D",border:"#DCEFE4",' +
  'primary:"#0FB5A3",primaryDark:"#0C8F82",primarySoft:"#DCF6EF",success:"#16C784",' +
  'warning:"#FF8A3D",danger:"#FF4D6D",neutral:"#93A79D",location:"#2F7DFF",white:"#FFFFFF"},' +
  'statusColors:{AVAILABLE:"#16C784",PARTIAL:"#FF8A3D",FULL:"#FF4D6D",UNKNOWN:"#93A79D"}};';

try {
  try {
    execSync(
      `npx tsc ${SOURCE} --ignoreConfig --outDir "${out}" --module commonjs --target es2020 --skipLibCheck`,
      { stdio: 'pipe' },
    );
  } catch {
    // Tek dosya modunda '@/theme', 'process' ve '__DEV__' cozumlenmiyor; tip
    // hatalari bekleniyor ve JS yine de uretiliyor. Gercek tip denetimi
    // `npm run typecheck` isi.
  }

  const compiled = join(out, 'mapHtml.js');
  const patched = join(out, 'mapHtml.cjs');
  const js = readFileSync(compiled, 'utf8').replace(
    /const theme_1 = require\("@\/theme"\);/,
    THEME_STUB,
  );
  writeFileSync(
    patched,
    `globalThis.__DEV__=false;process.env.EXPO_PUBLIC_MAPBOX_TOKEN="pk.check";\n${js}`,
    'utf8',
  );

  const { buildMapHtml, BASEMAPS } = createRequire(import.meta.url)(patched);

  for (const basemap of Object.keys(BASEMAPS)) {
    const html = buildMapHtml({ centerLatitude: 41, centerLongitude: 29, zoom: 10, basemap });
    const match = html.match(/<script>\n([\s\S]*?)<\/script>/);
    if (!match) {
      console.error(`✗ ${SOURCE} [${basemap}]: <script> blogu bulunamadi`);
      process.exit(1);
    }
    const scriptFile = join(out, `${basemap}.js`);
    writeFileSync(scriptFile, match[1], 'utf8');
    try {
      execSync(`node --check "${scriptFile}"`, { stdio: 'pipe' });
    } catch (error) {
      console.error(`✗ ${SOURCE} [${basemap}]: uretilen betikte sozdizimi hatasi\n`);
      console.error(String(error.stderr ?? error.message));
      process.exit(1);
    }
    console.log(`✓ ${SOURCE} [${basemap}]: uretilen betik gecerli`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
