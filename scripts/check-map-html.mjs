#!/usr/bin/env node
/**
 * mapHtml.ts icindeki WebView betigi bir template string'in icinde yasiyor,
 * bu yuzden TypeScript onu denetlemiyor. Bozuk JS sessizce bos harita uretiyor:
 * inline bir <script> ayristirilamazsa hic calismaz, yani window.onerror bile
 * kurulamaz ve harita sonsuza kadar "yukleniyor"da kalir.
 *
 * Bu script modulu GERCEKTEN derleyip buildMapHtml'i her taban harita ve her
 * tema (acik/koyu) icin calistirir ve uretilen betigi node --check'ten gecirir.
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
// Harita HTML'inin temadan kullandigi her sey (paletler, durum renkleri,
// withAlpha) bu dosyada ve React Native'e bagli degil.
const THEME_SOURCE = 'src/theme/colors.ts';
const COLOR_SCHEMES = ['light', 'dark'];
const out = mkdtempSync(join(tmpdir(), 'tora-map-'));

/**
 * Eksik bir palet anahtari ya da tanimsiz bir tema varyanti hata vermeden
 * "undefined" yaziyor: CSS'te gecersiz renk, betikte 'undefined' adli bir
 * stil ya da renk. Uretilen HTML'de mesru olan yalnizca bu ikisi.
 */
const LEGIT_UNDEFINED = [/typeof \w+ === 'undefined'/g, /projection: undefined,/g];

function checkGenerated(label, html) {
  const stripped = LEGIT_UNDEFINED.reduce((text, pattern) => text.replace(pattern, ''), html);
  const index = stripped.search(/\bundefined\b/);
  if (index !== -1) {
    const line = stripped.slice(0, index).split('\n').length;
    console.error(
      `✗ ${SOURCE} [${label}]: uretilen HTML'de tanimsiz bir deger var: ` +
        stripped.split('\n')[line - 1].trim(),
    );
    process.exit(1);
  }

  const match = html.match(/<script>\n([\s\S]*?)<\/script>/);
  if (!match) {
    console.error(`✗ ${SOURCE} [${label}]: <script> blogu bulunamadi`);
    process.exit(1);
  }
  const scriptFile = join(out, `${label.replace('/', '-')}.js`);
  writeFileSync(scriptFile, match[1], 'utf8');
  try {
    execSync(`node --check "${scriptFile}"`, { stdio: 'pipe' });
  } catch (error) {
    console.error(`✗ ${SOURCE} [${label}]: uretilen betikte sozdizimi hatasi\n`);
    console.error(String(error.stderr ?? error.message));
    process.exit(1);
  }
  // Sozdizimi gecerli ama davranisi bozuk bir betik de sessizce yayina
  // gidebiliyor: yukleme bekcisinin bayragi bir kez, buyuk bir yeniden
  // duzenlemede silindi ve bekci her acilista calisan bir harita icin
  // "Harita acilamadi" demeye basladi. Bayrak kurulup hic set edilmiyorsa dur.
  const script = match[1];
  // Satir basina capali: yorum satirindaki "// opened = true" SAYILMAZ, yalnizca
  // gercekten calisan bir atama sayilir.
  if (/var opened = false/.test(script) && !/^\s*opened\s*=\s*true\s*;/m.test(script)) {
    console.error(
      `✗ ${SOURCE} [${label}]: yukleme bekcisinin 'opened' bayragi hic true yapilmiyor; ` +
        "bekci her acilista sahte 'Harita acilamadi' hatasi basar",
    );
    process.exit(1);
  }

  console.log(`✓ ${SOURCE} [${label}]: uretilen betik gecerli`);
}

try {
  try {
    execSync(
      `npx tsc ${SOURCE} ${THEME_SOURCE} --ignoreConfig --rootDir src --outDir "${out}" --module commonjs --target es2020 --skipLibCheck`,
      { stdio: 'pipe' },
    );
  } catch {
    // Tek dosya modunda '@/theme', '@/types/domain', 'process' ve '__DEV__'
    // cozumlenmiyor; tip hatalari bekleniyor ve JS yine de uretiliyor. Gercek
    // tip denetimi `npm run typecheck` isi.
  }

  // Stub yerine gercek palet: renkler de betige gomuluyor. '@/theme' alias'ini
  // derlenmis colors modulune yonlendiriyoruz.
  const colorsModule = join(out, 'colors.cjs');
  writeFileSync(colorsModule, readFileSync(join(out, 'theme', 'colors.js'), 'utf8'), 'utf8');

  const compiled = readFileSync(join(out, 'map', 'mapHtml.js'), 'utf8');
  const js = compiled.replace(/require\("@\/theme"\)/, `require(${JSON.stringify(colorsModule)})`);
  if (js === compiled) {
    console.error(`✗ ${SOURCE}: derlenmis ciktida require("@/theme") bulunamadi`);
    process.exit(1);
  }
  const patched = join(out, 'mapHtml.cjs');
  writeFileSync(
    patched,
    `globalThis.__DEV__=false;process.env.EXPO_PUBLIC_MAPBOX_TOKEN="pk.check";\n${js}`,
    'utf8',
  );

  const { buildMapHtml, BASEMAPS } = createRequire(import.meta.url)(patched);

  for (const basemap of Object.keys(BASEMAPS)) {
    for (const colorScheme of COLOR_SCHEMES) {
      const html = buildMapHtml({
        centerLatitude: 41,
        centerLongitude: 29,
        zoom: 10,
        basemap,
        colorScheme,
      });
      checkGenerated(`${basemap}/${colorScheme}`, html);
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
