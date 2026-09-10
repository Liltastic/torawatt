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
  pricePerKwh?: number;
  idleFeePerMin?: number;
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

export type ChargingSessionStatus = 'STARTING' | 'CHARGING' | 'COMPLETED' | 'STOPPING' | 'ERROR';

export interface ChargingSession {
  id: string;
  stationId: string;
  connectorId: string;
  startedAt: string;
  endedAt?: string;
  energyKwh: number;
  powerKw: number;
  cost: number;
  batteryPercent?: number;
  status: ChargingSessionStatus;
}

/** Spec bolum 10: draft -> pending -> confirmed -> arrived -> expired/cancelled */
export type ReservationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface Reservation {
  id: string;
  stationId: string;
  connectorId: string;
  startsAt: string;
  durationMinutes: number;
  status: ReservationStatus;
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
}

/** Kart verisi asla saklanmaz; yalnizca saglayici token'i ve maskelenmis alanlar. */
export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface ChargingHistoryItem {
  id: string;
  stationName: string;
  startedAt: string;
  endedAt: string;
  energyKwh: number;
  durationMinutes: number;
  cost: number;
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
