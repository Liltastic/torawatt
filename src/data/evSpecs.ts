import specs from './ev-specs.json';

/**
 * Elektrikli arac teknik verileri.
 *
 * Kaynak: Open EV Data (bkz. scripts/fetch-ev-specs.mjs ve yanindaki
 * ev-specs-LICENCE.txt). Degerler uretici verisi; buradan UYDURULAN hicbir
 * sey yok - bu yuzden veri setinde batarya, AC ve DC'den biri bile eksik olan
 * kayitlar listeye hic alinmiyor, kullanici yarisi bos bir form ile kalmasin.
 *
 * SOKET TIPI bu kaynaktan ALINMIYOR: set, Tesla Model Y'yi pazarlari arasinda
 * Almanya ve Fransa oldugu halde NACS olarak veriyor, oysa Avrupa'da CCS2.
 * Soketi kullanici kendisi isaretliyor (bkz. scripts/fetch-ev-specs.mjs).
 *
 * Kapsam tam degil: 62 marka, 1144 surum. Togg veri setinde YOK; onun
 * degerleri uygulamanin kendi hazir ayar listesinden geliyor
 * (bkz. mocks/vehicleCatalog).
 */
export interface EvVariant {
  make: string;
  model: string;
  year: number | null;
  trim: string | null;
  batteryKwh: number;
  acKw: number;
  dcKw: number;
}

const variants = specs as EvVariant[];

const same = (a: string, b: string) =>
  a.localeCompare(b, 'tr', { sensitivity: 'base' }) === 0;

/**
 * Secilen marka ve modelin bilinen surumleri; yoksa bos dizi ve form elle
 * doldurulmaya devam eder.
 */
export function variantsFor(make: string, model: string): EvVariant[] {
  if (!make || !model) return [];

  const ofMake = variants.filter((variant) => same(variant.make, make));
  const exact = ofMake.filter((variant) => same(variant.model, model));
  if (exact.length > 0) return exact;

  // Ayni arac iki kaynakta farkli yazilabiliyor: secicideki "Megane E-Tech"
  // burada "Megane E-Tech Electric". Yalnizca biri digerinin basiysa ve
  // kesme noktasi bir SOZCUK sinirindaysa esitiyoruz - "ID.4" ile "ID.4 X"
  // gibi gercekten farkli modelleri birbirine karistirmasin diye.
  const prefixOf = (shorter: string, longer: string) =>
    longer.length > shorter.length &&
    longer.toLocaleLowerCase('tr').startsWith(`${shorter.toLocaleLowerCase('tr')} `);

  return ofMake.filter(
    (variant) => prefixOf(model, variant.model) || prefixOf(variant.model, model),
  );
}

/** Secicide gorunen ad: "2024 · Long Range · 75 kWh". */
export function variantLabel(variant: EvVariant): string {
  const parts: string[] = [];
  if (variant.year) parts.push(String(variant.year));
  // "Base" tek donanimli araclarda otomatik konuyor; kullaniciya bir sey
  // anlatmadigi icin gosterilmiyor.
  if (variant.trim && variant.trim.toLocaleLowerCase('tr') !== 'base') {
    parts.push(variant.trim);
  }
  parts.push(`${variant.batteryKwh} kWh`);
  return parts.join(' · ');
}
