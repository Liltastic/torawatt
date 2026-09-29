import catalog from './car-catalog.json';

/**
 * Arac marka/model listesi.
 *
 * carimagesapi.com katalogundan uretiliyor (bkz. scripts/fetch-car-catalog.mjs)
 * ve pakete gomulu geliyor: katalog ucu sunucu tarafi bir api_secret istiyor,
 * o yuzden uygulamadan canli sorgulanamiyor. Gomulu olmasinin iki faydasi da
 * var - secim aninda aciliyor ve listedeki her modelin GORSELI de var, cunku
 * liste gorsellerin geldigi katalogla ayni (bkz. services/carImage).
 *
 * 199 marka, 4618 model, ~51 KB. Uretimi 2010'dan once bitmis modeller
 * disarida; sarj uygulamasinda karsiligi yok ve listeyi okunmaz yapiyorlardi.
 */
export interface CarCatalogEntry {
  make: string;
  models: string[];
}

const entries = catalog as CarCatalogEntry[];

export const carMakes: string[] = entries.map((entry) => entry.make);

export function modelsForMake(make: string): string[] {
  return entries.find((entry) => entry.make === make)?.models ?? [];
}

/**
 * Listede olmayan bir marka/model de kabul ediliyor (eski kayitlar, katalogda
 * bulunmayan araclar). Secicinin "listede yok" durumunu ayirt edebilmesi icin.
 */
export function isKnownMake(make: string): boolean {
  return entries.some((entry) => entry.make === make);
}

/**
 * Kullanicinin kaydindaki model adini katalogdaki karsiligina cevirir.
 *
 * Hazir ayarlar donanim seviyesini de tasiyor ("T10X Uzun Menzil",
 * "ID.4 Pro", "Model Y Long Range") cunku batarya ve guc degerleri ona gore
 * degisiyor. Katalogda ise yalnizca govde model adi var. Gorsel sorgusunda
 * kaydi oldugu gibi kullanirsak hicbiri eslesmiyor.
 *
 * Adi KISALTIYORUZ, tahmin etmiyoruz: yalnizca katalogda gercekten bulunan ve
 * kaydin basiyla ortusen en uzun model adi seciliyor. Karsiligi yoksa ad
 * oldugu gibi birakiliyor.
 */
export function resolveCatalogModel(make: string, model: string): string {
  const models = modelsForMake(make);

  /** Kaydin basiyla ortusen en uzun katalog adi. */
  const longestPrefix = (value: string): string | undefined => {
    if (models.includes(value)) return value;

    const lower = value.toLocaleLowerCase('tr');
    const candidates = models.filter(
      (candidate) =>
        value.length > candidate.length &&
        lower.startsWith(`${candidate.toLocaleLowerCase('tr')} `),
    );
    if (candidates.length === 0) return undefined;

    return candidates.reduce((longest, candidate) =>
      candidate.length > longest.length ? candidate : longest,
    );
  };

  const direct = longestPrefix(model);
  if (direct) return direct;

  // Bazi markalarda katalog model adini marka adi olmadan tutuyor: MG'nin
  // "MG4"u orada yalnizca "4". Marka onekini atip bir daha bakiyoruz.
  const lowerMake = make.toLocaleLowerCase('tr');
  if (model.toLocaleLowerCase('tr').startsWith(lowerMake)) {
    const stripped = model.slice(make.length).trim();
    if (stripped) {
      const withoutMake = longestPrefix(stripped);
      if (withoutMake) return withoutMake;
    }
  }

  return model;
}
