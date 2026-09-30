import { extraVariants } from './evSpecsExtra';
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
 * Set 62 marka tasiyor ama Kia, Togg, Opel ve Seat tamamen disarida; o
 * bosluk evSpecsExtra ile, her satirin kaynagi yazilarak kapatiliyor.
 */
export interface EvVariant {
  make: string;
  model: string;
  year: number | null;
  trim: string | null;
  batteryKwh: number;
  acKw: number;
  dcKw: number;
  /** Elle girilen kayitlarda degerin alindigi sayfa (bkz. evSpecsExtra). */
  source?: string;
}

// Setin kapsamadigi araclar elle, kaynak gostererek ekleniyor
// (bkz. evSpecsExtra); ikisi tek liste gibi sorgulaniyor.
const variants: EvVariant[] = [...(specs as EvVariant[]), ...extraVariants];

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

/** Secicide gosterilen bir satir. */
export interface EvVariantOption {
  label: string;
  variant: EvVariant;
}

/** Yil disindaki her sey: iki kayit bunda esitse formu AYNI dolduruyorlar. */
const specKey = (variant: EvVariant) =>
  [variant.trim ?? '', variant.batteryKwh, variant.acKw, variant.dcKw].join('|');

/** Etiketin yil bolumu: tek yil "2024", birden fazlasi "2022-2025". */
const yearRange = (years: number[]): string | null => {
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min}-${max}`;
};

const baseLabel = (variant: EvVariant, years: string | null): string => {
  const parts: string[] = [];
  if (years) parts.push(years);
  // "Base" tek donanimli araclarda otomatik konuyor; kullaniciya bir sey
  // anlatmadigi icin gosterilmiyor.
  if (variant.trim && variant.trim.toLocaleLowerCase('tr') !== 'base') {
    parts.push(variant.trim);
  }
  parts.push(`${variant.batteryKwh} kWh`);
  return parts.join(' · ');
};

/** Etiket -> kac kez gectigi. */
const tally = (labels: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return counts;
};

/**
 * variantsFor sonucunu secici satirlarina cevirir: "2022-2025 · Long Range · 75 kWh".
 *
 * Iki is yapiyor, ikisi de veri setinin bicimi yuzunden gerekli:
 *
 * 1. TEKLESTIRME. Set ayni araci her model yili icin ayri kayit olarak
 *    tutuyor; BMW i4 eDrive40 uc kez, Audi Q4 e-tron on sekiz kez geliyor ve
 *    cogunun batarya/AC/DC degerleri birebir ayni. Bunlar kullanici icin ayri
 *    secenek DEGIL - hangisini sececegini bilemedigi, formu ayni dolduran
 *    satirlar. Sayilari ayni olanlar tek satirda birlesiyor ve yil aralik
 *    olarak yaziliyor; boylece 1144 surum 443 secenege iniyor ve kullanici
 *    kendi model yilini araligin icinde goruyor.
 *
 * 2. BENZERSIZ ETIKET. Secici yalnizca metinle calisiyor: iki satirin etiketi
 *    ayni olursa listede ayirt edilemiyorlar, secim her zaman ilkini buluyor ve
 *    ayni key ile cizilen satirlar React'te uyari uretiyor. Mercedes EQE'nin
 *    84 kWh'lik iki surumu yalnizca DC gucunde ayriliyor (170 ve 200 kW);
 *    cakisan etiketlere once DC, gerekirse AC ekleniyor.
 */
export function variantOptions(variants: EvVariant[]): EvVariantOption[] {
  if (variants.length === 0) return [];

  const merged = new Map<string, { variant: EvVariant; years: number[] }>();
  for (const variant of variants) {
    const group = merged.get(specKey(variant));
    if (group) {
      if (variant.year) group.years.push(variant.year);
    } else {
      merged.set(specKey(variant), { variant, years: variant.year ? [variant.year] : [] });
    }
  }

  const rows = [...merged.values()].map(({ variant, years }) => ({
    variant,
    label: baseLabel(variant, yearRange(years)),
  }));

  // Yalnizca GERCEKTEN cakisan etiketlere ek yapiliyor; digerleri gereksiz
  // yere uzamasin.
  const byLabel = tally(rows.map((row) => row.label));
  const withDc = rows.map((row) =>
    (byLabel.get(row.label) ?? 0) > 1
      ? { ...row, label: `${row.label} · ${row.variant.dcKw} kW DC` }
      : row,
  );

  // DC de ayniysa AC ile ayriliyor. Teklestirme trim+batarya+AC+DC uzerinden
  // yapildigi icin bu noktadan sonra iki satir ayni kalamaz.
  const byDcLabel = tally(withDc.map((row) => row.label));
  return withDc.map((row) =>
    (byDcLabel.get(row.label) ?? 0) > 1
      ? { ...row, label: `${row.label} · ${row.variant.acKw} kW AC` }
      : row,
  );
}
