import type { Station, Vehicle } from '@/types/domain';

import { haversineKm, type RouteResult } from './routing';

/**
 * Rota uzerinde sarj molasi onerir (spec bolum 11).
 *
 * Basitlestirmeler - gercek bir motor bunlari da hesaba katmali:
 * - Tuketim sabit kabul ediliyor; hiz, rakim, hava ve yuk yok sayiliyor
 * - Sarj suresi tepe gucun ortalama bir oraniyla hesaplanir; gercek
 *   egrinin sekli modellenmiyor
 * - Istasyon secimi rotaya yakinlik + guc; fiyat ve doluluk tahmini yok
 */

/** Aracin ulasabilecegi mesafeye uygulanan guvenlik payi. */
const SAFETY_MARGIN = 0.9;
/** Molalarda hedeflenen doluluk; %80 ustu sarj belirgin yavaslar. */
const CHARGE_TO_PERCENT = 80;
/** Bir istasyonun rotaya en fazla bu kadar uzakta olmasina izin verilir. */
const MAX_DETOUR_KM = 12;
/**
 * Gercekte guc batarya doldukca duser. %20-80 araliginda ortalama guc,
 * tepe gucun kabaca bu orani olur; sabit tepe guc kullanmak sureyi
 * ciddi sekilde iyimser gosteriyordu.
 */
const AVERAGE_POWER_RATIO = 0.65;

export interface ChargingStop {
  station: Station;
  /** Rota basindan bu istasyona kadar olan yaklasik mesafe. */
  distanceFromStartKm: number;
  /** Istasyona varista tahmini batarya yuzdesi. */
  arrivalPercent: number;
  departurePercent: number;
  addedKwh: number;
  chargeMinutes: number;
  cost: number;
}

export interface TripPlan {
  stops: ChargingStop[];
  arrivalPercent: number;
  totalChargeMinutes: number;
  totalChargeCost: number;
  /** Menzil yetmiyor ve uygun istasyon da bulunamadiysa true. */
  unreachable: boolean;
}

export interface TripInput {
  route: RouteResult;
  vehicle: Vehicle;
  startPercent: number;
  /** Varista kalmasi istenen minimum batarya. */
  reservePercent: number;
  stations: Station[];
}

/** Aracin verilen batarya yuzdesiyle gidebilecegi mesafe. */
function rangeKm(vehicle: Vehicle, percent: number): number {
  const usableKwh = (vehicle.batteryCapacityKwh * percent) / 100;
  return (usableKwh / vehicle.averageConsumptionKwhPer100Km) * 100 * SAFETY_MARGIN;
}

/** Rota cizgisi boyunca her noktanin baslangictan uzakligini hesaplar. */
function cumulativeDistances(geometry: [number, number][]): number[] {
  const distances: number[] = [0];
  for (let i = 1; i < geometry.length; i++) {
    const [lon1, lat1] = geometry[i - 1];
    const [lon2, lat2] = geometry[i];
    const step = haversineKm(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 },
    );
    distances.push(distances[i - 1] + step);
  }
  return distances;
}

interface StationOnRoute {
  station: Station;
  distanceFromStartKm: number;
  detourKm: number;
  maxPowerKw: number;
}

/** Rotaya yakin istasyonlari, baslangictan uzakliklariyla birlikte bulur. */
function stationsAlongRoute(route: RouteResult, stations: Station[]): StationOnRoute[] {
  const cumulative = cumulativeDistances(route.geometry);
  const found: StationOnRoute[] = [];

  for (const station of stations) {
    const usable = station.connectors.filter((c) => c.status === 'AVAILABLE');
    if (usable.length === 0) continue;

    let bestDetour = Infinity;
    let bestIndex = 0;

    // Rota cok noktali olabilir; her noktayi denemek yerine ornekleyerek tariyoruz.
    const step = Math.max(1, Math.floor(route.geometry.length / 600));
    for (let i = 0; i < route.geometry.length; i += step) {
      const [lon, lat] = route.geometry[i];
      const detour = haversineKm(
        { latitude: lat, longitude: lon },
        { latitude: station.latitude, longitude: station.longitude },
      );
      if (detour < bestDetour) {
        bestDetour = detour;
        bestIndex = i;
      }
    }

    if (bestDetour <= MAX_DETOUR_KM) {
      found.push({
        station,
        distanceFromStartKm: cumulative[bestIndex],
        detourKm: bestDetour,
        maxPowerKw: Math.max(...usable.map((c) => c.powerKw)),
      });
    }
  }

  return found.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);
}

/** Aracin bir istasyonda kullanabilecegi gercek guc. */
function effectivePowerKw(vehicle: Vehicle, station: Station): number {
  const usable = station.connectors.filter(
    (c) => c.status === 'AVAILABLE' && vehicle.connectors.includes(c.type),
  );
  if (usable.length === 0) return 0;

  const stationMax = Math.max(...usable.map((c) => c.powerKw));
  const isAc = usable.every((c) => c.type === 'TYPE_2');
  return Math.min(stationMax, isAc ? vehicle.maxAcKw : vehicle.maxDcKw);
}

function cheapestPrice(station: Station): number {
  const prices = station.connectors
    .filter((c) => c.status === 'AVAILABLE' && c.pricePerKwh != null)
    .map((c) => c.pricePerKwh!);
  return prices.length ? Math.min(...prices) : 0;
}

export function planTrip({
  route,
  vehicle,
  startPercent,
  reservePercent,
  stations,
}: TripInput): TripPlan {
  const candidates = stationsAlongRoute(route, stations).filter(
    (c) => effectivePowerKw(vehicle, c.station) > 0,
  );

  const stops: ChargingStop[] = [];
  let batteryPercent = startPercent;
  let positionKm = 0;

  // Her adimda, menzil sinirini asmadan ulasilabilen en uzak istasyonu sec.
  for (let guard = 0; guard < 12; guard++) {
    const remainingKm = route.distanceKm - positionKm;
    const reachableKm = rangeKm(vehicle, batteryPercent - reservePercent);

    if (reachableKm >= remainingKm) break;

    const reachable = candidates.filter(
      (c) =>
        c.distanceFromStartKm > positionKm + 1 &&
        c.distanceFromStartKm - positionKm <= reachableKm,
    );

    if (reachable.length === 0) {
      return {
        stops,
        arrivalPercent: 0,
        totalChargeMinutes: stops.reduce((s, x) => s + x.chargeMinutes, 0),
        totalChargeCost: stops.reduce((s, x) => s + x.cost, 0),
        unreachable: true,
      };
    }

    // En uzaktaki durak, mola sayisini en aza indirir.
    const next = reachable[reachable.length - 1];
    const legKm = next.distanceFromStartKm - positionKm;
    const usedPercent =
      (legKm * vehicle.averageConsumptionKwhPer100Km) / vehicle.batteryCapacityKwh;
    const arrivalPercent = batteryPercent - usedPercent;

    const targetPercent = Math.max(CHARGE_TO_PERCENT, arrivalPercent);
    const addedKwh = ((targetPercent - arrivalPercent) / 100) * vehicle.batteryCapacityKwh;
    const powerKw = effectivePowerKw(vehicle, next.station);

    stops.push({
      station: next.station,
      distanceFromStartKm: next.distanceFromStartKm,
      arrivalPercent,
      departurePercent: targetPercent,
      addedKwh,
      chargeMinutes: powerKw > 0 ? (addedKwh / (powerKw * AVERAGE_POWER_RATIO)) * 60 : 0,
      cost: addedKwh * cheapestPrice(next.station),
    });

    batteryPercent = targetPercent;
    positionKm = next.distanceFromStartKm;
  }

  const finalLegKm = route.distanceKm - positionKm;
  const finalUsed =
    (finalLegKm * vehicle.averageConsumptionKwhPer100Km) / vehicle.batteryCapacityKwh;

  return {
    stops,
    arrivalPercent: batteryPercent - finalUsed,
    totalChargeMinutes: stops.reduce((s, x) => s + x.chargeMinutes, 0),
    totalChargeCost: stops.reduce((s, x) => s + x.cost, 0),
    unreachable: false,
  };
}
