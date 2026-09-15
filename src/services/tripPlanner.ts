import type { Connector, Station, Vehicle } from '@/types/domain';

import { haversineKm, type RouteResult } from './routing';

/**
 * Rota uzerinde sarj molasi onerir (spec bolum 11).
 *
 * Basitlestirmeler - gercek bir motor bunlari da hesaba katmali:
 * - Tuketim sabit kabul ediliyor; hiz, rakim, hava ve yuk yok sayiliyor
 * - Sarj suresi tepe gucun ortalama bir oraniyla hesaplanir; gercek
 *   egrinin sekli modellenmiyor
 * - Istasyon secimi rotaya yakinlik + guc; doluluk tahmini yok, anlik doluluk
 *   varista gecerli olmayacagi icin aday elemede kullanilmiyor
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
/**
 * Bir mola en az bu kadar doluluk eklemeli. Aksi halde batarya varista zaten
 * CHARGE_TO_PERCENT ustundeyse "0 kWh, 0 dk" gibi anlamsiz bir durak cikiyor.
 */
const MIN_CHARGE_GAIN_PERCENT = 10;

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
  /**
   * Hedefe varista tahmini batarya yuzdesi. unreachable true iken bu deger
   * "hic durmadan gidilseydi" projeksiyonudur ve eksiye dusebilir; olcum
   * degil, ne kadar acik kaldigini gosteren bir isaret.
   */
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

/**
 * Verilen mesafe icin harcanacagi varsayilan batarya yuzdesi; rangeKm ile ayni
 * tuketim varsayimini paylasir.
 *
 * Guvenlik payi BILEREK uygulanmiyor. Pay yalnizca "bu bacagi bu sarjla gecebilir
 * miyim" testine ait (bkz. rangeKm). Buraya da katsaydik varista batarya oldugundan
 * dusuk gorunur, addedKwh = (hedef - varis) oldugu icin her molaya gercekte
 * harcanmayan enerji eklenir ve kullaniciya gosterilen sarj suresi ile maliyet
 * sisirdi - 250 km'lik bir bacakta durak basina ~5 kWh hayalet enerji.
 */
function consumedPercent(vehicle: Vehicle, km: number): number {
  const kwh = (km * vehicle.averageConsumptionKwhPer100Km) / 100;
  return (kwh / vehicle.batteryCapacityKwh) * 100;
}

/**
 * Plan kurarken soket durumu eleme olcutu degil bilgi: kullanici istasyona
 * saatler sonra varacak, o ana kadar DOLU bir soket bosalmis olabilir. Bu
 * yuzden yalnizca kalici olarak kullanilamayacak soketleri disarida birakiyoruz.
 */
function plannableConnectors(station: Station): Connector[] {
  return station.connectors.filter((c) => c.status !== 'FAULTED' && c.status !== 'OFFLINE');
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
    const usable = plannableConnectors(station);
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
  const usable = plannableConnectors(station).filter((c) => vehicle.connectors.includes(c.type));
  if (usable.length === 0) return 0;

  const stationMax = Math.max(...usable.map((c) => c.powerKw));
  const isAc = usable.every((c) => c.type === 'TYPE_2');
  return Math.min(stationMax, isAc ? vehicle.maxAcKw : vehicle.maxDcKw);
}

function cheapestPrice(station: Station): number {
  const prices = plannableConnectors(station)
    .filter((c) => c.pricePerKwh != null)
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
        // Dolgu bir 0 yerine gercek projeksiyon: hic durmadan gidilseydi
        // batarya nereye duserdi. Eksi cikmasi menzil aciginin olcusu.
        arrivalPercent: batteryPercent - consumedPercent(vehicle, remainingKm),
        totalChargeMinutes: stops.reduce((s, x) => s + x.chargeMinutes, 0),
        totalChargeCost: stops.reduce((s, x) => s + x.cost, 0),
        unreachable: true,
      };
    }

    // En uzaktaki durak, mola sayisini en aza indirir.
    const next = reachable[reachable.length - 1];
    const legKm = next.distanceFromStartKm - positionKm;
    const arrivalPercent = batteryPercent - consumedPercent(vehicle, legKm);

    // Varista batarya zaten hedefin ustundeyse hic enerji eklemeyen bir durak
    // cikmasin; mola her zaman anlamli bir kazanc saglasin.
    const targetPercent = Math.min(
      100,
      Math.max(CHARGE_TO_PERCENT, arrivalPercent + MIN_CHARGE_GAIN_PERCENT),
    );
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

  return {
    stops,
    arrivalPercent: batteryPercent - consumedPercent(vehicle, finalLegKm),
    totalChargeMinutes: stops.reduce((s, x) => s + x.chargeMinutes, 0),
    totalChargeCost: stops.reduce((s, x) => s + x.cost, 0),
    unreachable: false,
  };
}
