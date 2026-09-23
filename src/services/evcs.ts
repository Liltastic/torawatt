import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getDeviceId } from '@/lib/deviceId';
import type {
  Connector,
  ConnectorType,
  Coordinate,
  Station,
  StationCatalogInfo,
} from '@/types/domain';

import { EVCS_API_URL } from './config';

/**
 * EVCS Mobile API (testmobileapi2.torasarj.net) - grubun kendi sarj
 * platformunun mobil API'si. TORA WATT buradan YALNIZCA istasyon verisi
 * okuyor: konum, adres, isletmeci ve soket bilgisi.
 *
 * Kullanilan uclar herkese acik (token istemiyor, yalnizca X-App-* basliklari
 * zorunlu - baslik olmadan 400 donuyor):
 *   GET /api/v1/stations/external          kutu ya da lat/lng+yaricap ile liste
 *   GET /api/v1/stations/external/{id}     detay + soket listesi
 *
 * `/api/v1/stations/nearby` BILEREK kullanilmiyor: orasi platformun kendi
 * istasyonlari ve token istiyor; test ortaminda da bos donuyor.
 *
 * ONEMLI - veride olmayan seyler: anlik soket doluluğu, fiyat, calisma saati
 * ve olanaklar. Uc bunlari hic dondurmuyor (3 sehirde 600 kayitta dogrulandi),
 * bu yuzden buradan gelen her soket 'UNKNOWN' durumla ve fiyatsiz uretiliyor;
 * uygulama da onlari "Durum bilinmiyor" olarak gosteriyor.
 */

/** Kaynaktaki sayisal kimlik bizim string id alanimiza bu onekle giriyor. */
const EXTERNAL_ID_PREFIX = 'epdk-';

export const toExternalStationId = (id: number): string => `${EXTERNAL_ID_PREFIX}${id}`;

export const isExternalStationId = (id: string): boolean => id.startsWith(EXTERNAL_ID_PREFIX);

const toCatalogId = (id: string): string => id.slice(EXTERNAL_ID_PREFIX.length);

/** Uc, cevapsiz kaldiginda ekran sonsuza kadar iskelet gostermesin. */
const REQUEST_TIMEOUT_MS = 15_000;

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** X-App-Platform yalnizca iOS | Android | HarmonyOS kabul ediyor. */
const APP_PLATFORM = Platform.OS === 'ios' ? 'iOS' : 'Android';

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
}

/** Liste ucunun dondurdugu istasyon; tek tek soketleri YOK, yalnizca sayilari var. */
interface CatalogStation {
  id: number;
  /** Sarj istasyonu sicil numarasi (ŞRJ/...). */
  srjNo?: string;
  name: string;
  /** Isletmecinin ticari unvani. */
  operator: string;
  operatorLicenseNo?: string;
  brand?: string;
  address: string;
  province?: string;
  latitude: number;
  longitude: number;
  isPublicAccess?: boolean;
  isGreen?: boolean;
  socketCount: number;
  acSocketCount: number;
  dcSocketCount: number;
  maxPowerKw: number;
  /** lat/lng verildiginde geliyor; sonuclar da buna gore sirali. */
  distanceKm?: number;
}

interface CatalogSocket {
  sktNo: string;
  currentType: 'AC' | 'DC';
  socketType: string;
  powerKw: number;
}

interface CatalogStationDetail extends CatalogStation {
  sockets?: CatalogSocket[];
  /** Yalnizca detayda: bolgenin elektrik dagitim sirketi. */
  distributionCompany?: string;
  /** Yalnizca detayda: kaydin katalogda en son dogrulandigi an. */
  lastSeenAt?: string;
}

async function requestHeaders(): Promise<Record<string, string>> {
  return {
    'X-App-Name': 'TORA WATT',
    'X-App-Version': APP_VERSION,
    'X-App-Platform': APP_PLATFORM,
    // Cihaz parmak izi zaten uygulamada var (kayit/giris de bunu gonderiyor).
    'X-Device-Id': await getDeviceId(),
    'X-App-Locale': 'tr',
  };
}

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${EVCS_API_URL}${path}`, {
      headers: await requestHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`İstasyon servisi ${response.status} döndü`);
    }

    const body = (await response.json()) as Envelope<T>;
    if (!body.success) {
      throw new Error(body.message ?? 'İstasyon servisi isteği reddetti');
    }
    return body.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('İstasyon servisi yanıt vermedi');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const SOCKET_TYPES: Record<string, ConnectorType> = {
  AC_TYPE2: 'TYPE_2',
  DC_CCS: 'CCS2',
  DC_CHADEMO: 'CHADEMO',
};

function connectorType(socket: CatalogSocket): ConnectorType {
  return SOCKET_TYPES[socket.socketType] ?? (socket.currentType === 'DC' ? 'CCS2' : 'TYPE_2');
}

/**
 * Katalogda ad bazen tesis adi yerine sicil kodu ("000056") oluyor; o zaman
 * marka adi kullaniciya daha anlamli geliyor.
 */
function displayName(station: CatalogStation): string {
  const name = station.name?.trim() ?? '';
  if (name && !/^\d+$/.test(name)) return name;
  return station.brand?.trim() || station.operator?.trim() || name || 'İsimsiz istasyon';
}

/** Sehir sebekesinde AC soketler pratikte 22 kW'i gecmiyor; DC'li tesiste maxPowerKw DC'ye ait. */
const AC_POWER_CEILING_KW = 22;

/**
 * Liste ucu soketleri tek tek vermedigi icin sayilardan uretiliyor: kart ve pin
 * yalnizca soket SAYISINI ve istasyonun en yuksek gucunu gosteriyor. Istasyon
 * acildiginda detay ucu gercek soketlerle bunlarin uzerine yaziyor
 * (bkz. fetchExternalStation).
 */
function estimatedConnectors(station: CatalogStation, stationId: string): Connector[] {
  const acPower = station.dcSocketCount > 0
    ? Math.min(AC_POWER_CEILING_KW, station.maxPowerKw)
    : station.maxPowerKw;

  const connectors: Connector[] = [];
  for (let i = 0; i < station.acSocketCount; i++) {
    connectors.push({
      id: `${stationId}-ac-${i + 1}`,
      type: 'TYPE_2',
      powerKw: acPower,
      status: 'UNKNOWN',
    });
  }
  for (let i = 0; i < station.dcSocketCount; i++) {
    connectors.push({
      id: `${stationId}-dc-${i + 1}`,
      type: 'CCS2',
      powerKw: station.maxPowerKw,
      status: 'UNKNOWN',
    });
  }
  // Soket kirilimi gelmediyse (ac+dc=0 ama socketCount>0) en azindan sayi dogru olsun.
  for (let i = connectors.length; i < station.socketCount; i++) {
    connectors.push({
      id: `${stationId}-skt-${i + 1}`,
      type: 'TYPE_2',
      powerKw: station.maxPowerKw,
      status: 'UNKNOWN',
    });
  }
  return connectors;
}

function catalogInfo(station: CatalogStationDetail): StationCatalogInfo {
  return {
    stationNo: station.srjNo?.trim() || undefined,
    operatorLegalName: station.operator?.trim() || undefined,
    licenseNo: station.operatorLicenseNo?.trim() || undefined,
    province: station.province?.trim() || undefined,
    distributionCompany: station.distributionCompany?.trim() || undefined,
    publicAccess: station.isPublicAccess,
    greenEnergy: station.isGreen,
    lastSeenAt: station.lastSeenAt,
  };
}

function toStation(station: CatalogStationDetail): Station {
  const id = toExternalStationId(station.id);
  const sockets = station.sockets ?? [];

  return {
    id,
    name: displayName(station),
    latitude: station.latitude,
    longitude: station.longitude,
    address: station.address ?? '',
    // Marka kullaniciya tanidik gelen ad; ticari unvan yalnizca yedek.
    operator: station.brand?.trim() || station.operator?.trim() || '',
    // Katalogda calisma saati ve olanak bilgisi yok.
    isOpen24h: false,
    amenities: [],
    connectors: sockets.length
      ? sockets.map((socket) => ({
          id: `${id}-${socket.sktNo}`,
          // Kullaniciya EPDK soket numarasi gosteriliyor; id yalnizca ic anahtar.
          label: socket.sktNo,
          type: connectorType(socket),
          powerKw: socket.powerKw,
          status: 'UNKNOWN' as const,
        }))
      : estimatedConnectors(station, id),
    distanceKm: station.distanceKm,
    source: 'epdk',
    catalog: catalogInfo(station),
  };
}

/**
 * Verilen noktanin cevresindeki istasyonlar, mesafeye gore sirali.
 * Uc yaricapi en fazla 100 km kabul ediyor ve sonucu 10 dk sunucuda onbellekliyor.
 */
export async function fetchNearbyExternalStations(
  center: Coordinate,
  radiusKm: number,
  size: number,
): Promise<Station[]> {
  const query = new URLSearchParams({
    lat: String(center.latitude),
    lng: String(center.longitude),
    radius: String(radiusKm),
    size: String(size),
  });

  const page = await request<Page<CatalogStation>>(`/api/v1/stations/external?${query}`);
  return page.items.map(toStation);
}

/** Tek istasyonun detayi: gercek soket listesiyle birlikte. */
export async function fetchExternalStation(stationId: string): Promise<Station> {
  const station = await request<CatalogStationDetail>(
    `/api/v1/stations/external/${toCatalogId(stationId)}`,
  );
  return toStation(station);
}
