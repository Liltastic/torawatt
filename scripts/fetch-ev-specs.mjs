// Elektrikli arac teknik verilerini Open EV Data setinden uretir.
//
//   node scripts/fetch-ev-specs.mjs
//
// Cikti: src/data/ev-specs.json ve src/data/ev-specs-LICENCE.txt
//
// Neden gomulu?
// - Setin barindirilan API'si (api.open-ev-data.org) kapanmis; yayinlanan
//   veri dosyasi ise GitHub surumlerinde duruyor. Calisma aninda bagimli
//   olacak bir uc yok.
// - Secim aninda aciliyor, ag beklemesi yok.
//
// Lisans: Community Data License Agreement - Permissive 2.0. Kullanima ve
// ticari dagitima izin veriyor; TEK sart veriyi paylasirken lisans metnini de
// birlikte tasimak - bu yuzden betik lisansi da indirip yanina yaziyor.
//
// Kirpma: ham dosya 3 MB ve sarj uygulamasinin kullanmadigi alanlarla dolu
// (motor torku, boyutlar, agirliklar, pazarlar...). Yalnizca formda karsiligi
// olan alanlar aliniyor.
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO = 'open-ev-data/open-ev-data-dataset';
const LICENCE_URL = `https://raw.githubusercontent.com/${REPO}/main/LICENCE`;

async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'tora-watt' } });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
}

const release = await json(`https://api.github.com/repos/${REPO}/releases/latest`);
const asset = release.assets.find((item) => item.name.endsWith('.json'));
if (!asset) throw new Error('surumde json dosyasi yok');

console.log(`${release.tag_name} indiriliyor (${(asset.size / 1024 / 1024).toFixed(1)} MB)...`);
const dataset = await json(asset.browser_download_url);

const variants = [];
for (const vehicle of dataset.vehicles ?? []) {
  const battery = vehicle.battery?.pack_capacity_kwh_net ?? vehicle.battery?.pack_capacity_kwh_gross;
  const ac = vehicle.charging?.ac?.max_power_kw;
  const dc = vehicle.charging?.dc?.max_power_kw;

  // Uc degerden biri bile yoksa kayit formu dolduramaz; listeye almiyoruz ki
  // kullanici secip yarisi bos bir form ile kalmasin.
  if (battery == null || ac == null || dc == null) continue;

  // SOKET TIPI BILEREK ALINMIYOR. Set, Tesla Model Y'yi pazarlari arasinda
  // Almanya ve Fransa oldugu halde "nacs" olarak veriyor; Avrupa'da o arac
  // CCS2. Bizim pazarimiz icin yanlis olacak bir degeri forma yazmaktansa
  // soketi kullaniciya birakiyoruz.

  variants.push({
    make: vehicle.make.name,
    model: vehicle.model.name,
    year: vehicle.year,
    // Ayni model yillara ve donanima gore farkli batarya tasiyor; kullanici
    // hangisini surdugunu bu adla ayirt ediyor.
    trim: vehicle.trim?.name ?? null,
    batteryKwh: Math.round(battery * 10) / 10,
    acKw: Math.round(ac * 10) / 10,
    dcKw: Math.round(dc),
  });
}

variants.sort(
  (a, b) =>
    a.make.localeCompare(b.make, 'tr') ||
    a.model.localeCompare(b.model, 'tr') ||
    (b.year ?? 0) - (a.year ?? 0) ||
    (a.trim ?? '').localeCompare(b.trim ?? '', 'tr'),
);

const target = path.join('src', 'data', 'ev-specs.json');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, JSON.stringify(variants), 'utf8');

// Lisans metni veriyle birlikte tasinmak ZORUNDA (CDLA-Permissive 2.0, 2.1).
const licence = await fetch(LICENCE_URL);
if (!licence.ok) throw new Error(`lisans indirilemedi: HTTP ${licence.status}`);
await fs.writeFile(
  path.join('src', 'data', 'ev-specs-LICENCE.txt'),
  `Open EV Data (${REPO}), surum ${release.tag_name}\n` +
    `Kaynak: https://github.com/${REPO}\n\n` +
    (await licence.text()),
  'utf8',
);

const makes = new Set(variants.map((variant) => variant.make));
const bytes = (await fs.stat(target)).size;
console.log(
  `${makes.size} marka, ${variants.length} surum -> ${target} (${(bytes / 1024).toFixed(0)} KB)`,
);
