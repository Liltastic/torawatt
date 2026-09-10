import type { Coordinate } from '@/types/domain';

/**
 * Acik kaynak, anahtar gerektirmeyen rota ve adres servisleri.
 *
 * GECICI: ikisi de kamuya acik demo/topluluk sunuculari. Uretimde kendi
 * OSRM/Valhalla ornegimize ya da sozlesmeli bir saglayiciya gecilmeli;
 * bu sunucularin SLA'si ve kota garantisi yok (spec bolum 24).
 */
const OSRM_BASE = 'https://router.project-osrm.org';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/** Nominatim kullanim sartlari tanimlayici bir User-Agent istiyor. */
const USER_AGENT = 'ToraWatt/0.1 (https://git.tora.com.tr/torapetrol/torawatt)';

export interface Place {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  /** Rota cizgisi; haritaya cizmek icin [lng, lat] dizisi. */
  geometry: [number, number][];
}

/** Adres / yer arama. */
export async function geocode(query: string, signal?: AbortSignal): Promise<Place[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url =
    `${NOMINATIM_BASE}/search?format=json&limit=5&countrycodes=tr` +
    `&q=${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal });
  if (!response.ok) throw new Error('Adres araması başarısız');

  const results = (await response.json()) as {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }[];

  return results.map((r) => ({
    id: String(r.place_id),
    label: r.display_name,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
  }));
}

/** Iki nokta arasi surus rotasi. */
export async function getRoute(
  from: Coordinate,
  to: Coordinate,
  signal?: AbortSignal,
): Promise<RouteResult> {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Rota alınamadı');

  const data = (await response.json()) as {
    code: string;
    routes?: {
      distance: number;
      duration: number;
      geometry: { coordinates: [number, number][] };
    }[];
  };

  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route) throw new Error('Bu iki nokta arasında rota bulunamadı');

  return {
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
    geometry: route.geometry.coordinates,
  };
}

/** Iki koordinat arasi kus ucusu mesafe (km). */
export function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(h));
}
