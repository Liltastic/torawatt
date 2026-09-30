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
/**
 * Ayni sey iki kaynakta farkli yazilabiliyor: secicide "MG", burada
 * "MG Motor"; secicide "Megane E-Tech", burada "Megane E-Tech Electric".
 * Yalnizca biri digerinin basiysa VE kesme noktasi bir sozcuk sinirindaysa
 * esit sayiyoruz - boylece "ID.4" ile "ID.4 X" ayri modeller olarak kaliyor.
 * (Aksan ve buyuk/kucuk farki zaten same() ile eleniyor: "Citroën" =
 * "Citroen", "Škoda" = "Skoda".)
 */
const prefixOf = (shorter: string, longer: string) =>
  longer.length > shorter.length &&
  longer.toLocaleLowerCase('tr').startsWith(`${shorter.toLocaleLowerCase('tr')} `);

const matches = (a: string, b: string) => same(a, b) || prefixOf(a, b) || prefixOf(b, a);

export function variantsFor(make: string, model: string): EvVariant[] {
  if (!make || !model) return [];

  const ofMake = variants.filter((variant) => matches(variant.make, make));
  if (ofMake.length === 0) return [];

  // Once birebir model adi; bulunamazsa onek kuralina dusuyoruz.
  const exact = ofMake.filter((variant) => same(variant.model, model));
  if (exact.length > 0) return exact;

  const byPrefix = ofMake.filter((variant) => matches(variant.model, model));
  if (byPrefix.length > 0) return byPrefix;

  // Bazi markalarda bir katalog marka adini modele katiyor, digeri katmiyor:
  // secicide "MG" + "4", burada "MG Motor" + "MG4". Marka adini modelin basina
  // ekleyip bir daha bakiyoruz.
  const withMake = `${make}${model}`;
  return ofMake.filter(
    (variant) => same(variant.model, withMake) || same(variant.model, `${make} ${model}`),
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
