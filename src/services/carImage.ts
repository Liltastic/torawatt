import { resolveCatalogModel } from '@/data/carCatalog';

import { CAR_IMAGE_API_KEY } from './config';

/**
 * Arac gorselleri (carimagesapi.com).
 *
 * Gorsel ucu DOGRUDAN cagrilamiyor: api_key tek basina 403 "Signature
 * required" veriyor. Once imzali bir URL aliniyor, gorsel o URL'den geliyor.
 * Imza bir gun kadar gecerli, o yuzden sonucu uzun sure onbellekliyoruz
 * (bkz. queries/carImage).
 *
 * Anahtar hakkinda: saglayici imzali URL'nin ICINE api_key'i koyuyor, yani
 * anahtar istemciye zaten ulasiyor; sunucumuzdan vekillemek onu gizlemezdi.
 * Bu yuzden Mapbox token'i gibi EXPO_PUBLIC_ degiskeninde tutuluyor - .env
 * ve EAS ortaminda, depoda degil. Kotaya musallat olunursa panelden
 * yenilenebiliyor.
 *
 * Kapsam tam degil: olculdu, Togg T10X ve Renault Megane E-Tech geliyor ama
 * Togg T8X gelmiyor. Katalogda olmayan araclarda servis hata degil, jenerik
 * bir yer tutucu gorsel donduruyor.
 */
const BASE_URL = 'https://carimagesapi.com';
const REQUEST_TIMEOUT_MS = 10_000;

export interface CarImageQuery {
  make: string;
  model: string;
  modelYear?: number;
  /** Servis istenen olcunun ustundeki en yakin boyutu veriyor. */
  width?: number;
}

export async function fetchCarImageUrl(query: CarImageQuery): Promise<string | undefined> {
  if (!CAR_IMAGE_API_KEY) return undefined;

  const params = new URLSearchParams({
    api_key: CAR_IMAGE_API_KEY,
    make: query.make,
    // Kayit donanim seviyesi tasiyabiliyor ("T10X Uzun Menzil"); katalogda
    // yalnizca govde adi var (bkz. data/carCatalog).
    model: resolveCatalogModel(query.make, query.model),
    width: String(query.width ?? 600),
  });
  if (query.modelYear) params.set('year', String(query.modelYear));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/signed-url?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) return undefined;

    const body = (await response.json()) as { url?: unknown };
    return typeof body.url === 'string' ? body.url : undefined;
  } catch {
    // Gorsel kozmetik: gelmezse kart yazilarla duruyor, hata gosterilmiyor.
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
