/**
 * TORA WATT domain modeli (spec bolum 21).
 * Backend sozlesmesi kesinlestiginde bu tipler revize edilecek.
 */

export type ChargerStatus = 'AVAILABLE' | 'OCCUPIED' | 'FAULTED' | 'OFFLINE' | 'UNKNOWN';

export type ConnectorType = 'TYPE_2' | 'CCS2' | 'CHADEMO' | 'NACS';

/** Guc sinifi: sarj hizi rozetlerinde kullanilir (spec bolum 5). */
export type CurrentType = 'AC' | 'DC' | 'HPC';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Connector {
  id: string;
  type: ConnectorType;
  powerKw: number;
  status: ChargerStatus;
  /** Kullaniciya gosterilecek soket numarasi; yoksa id gosterilir. */
  label?: string;
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  operator: string;
  isOpen24h: boolean;
  amenities: string[];
  connectors: Connector[];
  /** Kullanicinin konumuna gore hesaplanir; backend veya istemci doldurur. */
  distanceKm?: number;
}

/** Spec bolum 14. */
export interface Vehicle {
  id: string;
  make: string;
  model: string;
  modelYear: number;
  batteryCapacityKwh: number;
  maxAcKw: number;
  maxDcKw: number;
  connectors: ConnectorType[];
  averageConsumptionKwhPer100Km: number;
  /** Filtreleme ve rota onerilerinde kullanilacak arac; sahibin en fazla bir aktif araci olur. */
  isActive: boolean;
}

/** Bir soketin guc sinifini dondurur (spec bolum 5 rozetleri). */
export function currentTypeOf(connector: Pick<Connector, 'type' | 'powerKw'>): CurrentType {
  if (connector.type === 'TYPE_2') return 'AC';
  return connector.powerKw >= 150 ? 'HPC' : 'DC';
}

export const connectorLabels: Record<ConnectorType, string> = {
  TYPE_2: 'Type 2',
  CCS2: 'CCS2',
  CHADEMO: 'CHAdeMO',
  NACS: 'NACS',
};

/** Istasyon seviyesinde uygunluk; harita pini bu dort duruma gore renklenir (spec bolum 5). */
export type StationAvailability = 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'UNKNOWN';

/**
 * Yalnizca sarj edilebilir ya da bosalmasi beklenebilir soketler sayilir;
 * cevrimdisi, durumu bilinmeyen ve ARIZALI olanlar hesap disi. Arizali soket
 * asla bosalmayacagi icin FULL ('Dolu') sayilmasi, kullaniciya beklemeye deger
 * bir istasyon vaadi veriyordu; hepsi arizali istasyon artik UNKNOWN doner.
 */
export function stationAvailability(station: Pick<Station, 'connectors'>): StationAvailability {
  const usable = station.connectors.filter(
    (c) => c.status === 'AVAILABLE' || c.status === 'OCCUPIED',
  );
  if (usable.length === 0) return 'UNKNOWN';

  const available = usable.filter((c) => c.status === 'AVAILABLE').length;
  if (available === 0) return 'FULL';
  if (available === usable.length) return 'AVAILABLE';
  return 'PARTIAL';
}
