import type {
  ChargingHistoryEntry,
  Connector,
  PaymentMethod,
  Reservation,
  Station,
  Vehicle,
} from '@prisma/client';

/**
 * SQLite'ta native dizi yok; Station.amenities ve Vehicle.connectors
 * JSON-metin olarak saklaniyor. Bu dosya DB satirlarini mobil uygulamanin
 * bekledigi (src/types/domain.ts ile birebir uyumlu) JSON sekline cevirir.
 */

export function serializeStation(station: Station & { connectors: Connector[] }) {
  return {
    id: station.id,
    name: station.name,
    latitude: station.latitude,
    longitude: station.longitude,
    address: station.address,
    operator: station.operator,
    isOpen24h: station.isOpen24h,
    amenities: JSON.parse(station.amenities) as string[],
    connectors: station.connectors.map(serializeConnector),
  };
}

export function serializeConnector(connector: Connector) {
  return {
    id: connector.id,
    type: connector.type,
    powerKw: connector.powerKw,
    status: connector.status,
    pricePerKwh: connector.pricePerKwh ?? undefined,
    idleFeePerMin: connector.idleFeePerMin ?? undefined,
  };
}

export function serializeVehicle(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    modelYear: vehicle.modelYear,
    batteryCapacityKwh: vehicle.batteryCapacityKwh,
    maxAcKw: vehicle.maxAcKw,
    maxDcKw: vehicle.maxDcKw,
    connectors: JSON.parse(vehicle.connectors) as string[],
    averageConsumptionKwhPer100Km: vehicle.averageConsumptionKwhPer100Km,
    isActive: vehicle.isActive,
  };
}

/** Rezervasyon bekleme suresi (dakika). Mobil taraftaki RESERVATION_GRACE_MINUTES ile ayni tutulmali. */
export const RESERVATION_GRACE_MINUTES = 15;

/**
 * EXPIRED durumu veritabaninda tutulmuyor; saatten turetiliyor. Boylece
 * bekleme suresi gecmis bir rezervasyon, kimse bakmadan CONFIRMED olarak
 * kalmiyor ve durumu guncel tutmak icin arka planda bir job calismasi gerekmiyor.
 */
export function effectiveStatus(reservation: Pick<Reservation, 'status' | 'startsAt' | 'durationMinutes'>): string {
  if (reservation.status === 'CANCELLED' || reservation.status === 'ARRIVED') {
    return reservation.status;
  }

  const deadline = reservation.startsAt.getTime() + RESERVATION_GRACE_MINUTES * 60_000;
  return Date.now() > deadline ? 'EXPIRED' : reservation.status;
}

export function serializeReservation(reservation: Reservation) {
  return {
    id: reservation.id,
    stationId: reservation.stationId,
    connectorId: reservation.connectorId,
    stationName: reservation.stationName,
    connectorLabel: reservation.connectorLabel,
    startsAt: reservation.startsAt.toISOString(),
    durationMinutes: reservation.durationMinutes,
    status: effectiveStatus(reservation),
    createdAt: reservation.createdAt.toISOString(),
  };
}

export function serializeHistoryEntry(entry: ChargingHistoryEntry) {
  return {
    id: entry.id,
    stationId: entry.stationId ?? undefined,
    stationName: entry.stationName,
    connectorLabel: entry.connectorLabel,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt.toISOString(),
    durationMinutes: entry.durationMinutes,
    energyKwh: entry.energyKwh,
    pricePerKwh: entry.pricePerKwh,
    cost: entry.cost,
  };
}

export function serializePaymentMethod(method: PaymentMethod) {
  return {
    id: method.id,
    brand: method.brand,
    last4: method.last4,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    isDefault: method.isDefault,
  };
}
