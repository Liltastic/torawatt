// Arac marka/model listesini carimagesapi.com katalogundan uretir.
//
//   CAR_IMAGE_API_KEY=ci_... CAR_IMAGE_API_SECRET=... node scripts/fetch-car-catalog.mjs
//
// Cikti: src/data/car-catalog.json
//
// Neden gomulu bir liste?
// - Katalog ucu api_secret istiyor ve o anahtar SUNUCU TARAFI icin; uygulamaya
//   konamaz. Liste burada bir kez uretilip pakete giriyor, sir hicbir yere
//   sizmiyor.
// - Secim aninda aciliyor; ag beklemesi ve backend bagimliligi yok.
// - Liste gorsel katalogunun KENDISINDEN geldigi icin listede gorunen her
//   modelin fotografi da var (bkz. services/carImage).
//
// Listeyi tazelemek gerekirse bu betigi tekrar calistirmak yeterli.
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://carimagesapi.com';
const API_KEY = process.env.CAR_IMAGE_API_KEY;
const API_SECRET = process.env.CAR_IMAGE_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('CAR_IMAGE_API_KEY ve CAR_IMAGE_API_SECRET tanimli olmali.');
  process.exit(1);
}

/**
 * Uretimi suren ya da yakin gecmiste biten modeller. Katalog 1960'lara kadar
 * uzaniyor; sarj uygulamasinda kimsenin 1969 Renault 12'yi secmesi beklenmiyor
 * ve tum tarihi gommek paketi gereksiz sisiriyor.
 */
const OLDEST_YEAR_END = 2010;

/** Es zamanli istek; ucun siniri dakikada 60. */
const CONCURRENCY = 4;

async function api(pathname) {
  const url = `${BASE_URL}${pathname}${pathname.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
  const response = await fetch(url, { headers: { 'X-Api-Secret': API_SECRET } });
  if (!response.ok) {
    throw new Error(`${pathname} -> HTTP ${response.status}`);
  }
  return response.json();
}

const asArray = (payload, key) =>
  Array.isArray(payload) ? payload : (payload?.[key] ?? payload?.data ?? []);

/** Sirayi koruyarak sinirli es zamanlilikla calistirir. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const makes = asArray(await api('/api/v1/makes'), 'makes');
console.log(`${makes.length} marka bulundu, modeller cekiliyor...`);

let done = 0;
const entries = await mapLimit(makes, CONCURRENCY, async (make) => {
  let models = [];
  try {
    models = asArray(await api(`/api/v1/makes/${make.slug}/models`), 'models');
  } catch (error) {
    console.warn(`  ${make.name}: ${error.message}`);
  }

  done += 1;
  if (done % 25 === 0) console.log(`  ${done}/${makes.length}`);

  const recent = models
    .filter((model) => model.year_end == null || model.year_end >= OLDEST_YEAR_END)
    .map((model) => model.name)
    .sort((a, b) => a.localeCompare(b, 'tr'));

  return recent.length > 0 ? { make: make.name, models: recent } : null;
});

// Modeli kalmayan markalar listeye hic girmiyor: secilince bos bir liste
// acilmasi kullaniciya cikmaz sokak gibi gorunurdu.
const catalog = entries
  .filter(Boolean)
  .sort((a, b) => a.make.localeCompare(b.make, 'tr'));

const target = path.join('src', 'data', 'car-catalog.json');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, JSON.stringify(catalog), 'utf8');

const bytes = (await fs.stat(target)).size;
const modelCount = catalog.reduce((total, entry) => total + entry.models.length, 0);
console.log(
  `\n${catalog.length} marka, ${modelCount} model -> ${target} (${(bytes / 1024).toFixed(0)} KB)`,
);
