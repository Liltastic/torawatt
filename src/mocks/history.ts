import type { ChargingHistoryDetail } from '@/types/domain';

/**
 * GECICI: ornek sarj gecmisi. Backend /charging-history ucu hazir olunca
 * bu dosya silinip TanStack Query ile gercek veri baglanacak.
 *
 * Tarihler acilis anina gore uretiliyor; boylece "son 7 gun" ve "bu ay"
 * filtreleri her zaman anlamli sonuc verir.
 */
function daysAgo(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function plusMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function entry(
  id: string,
  stationId: string,
  stationName: string,
  connectorLabel: string,
  days: number,
  hour: number,
  durationMinutes: number,
  energyKwh: number,
  pricePerKwh: number,
): ChargingHistoryDetail {
  const startedAt = daysAgo(days, hour);
  return {
    id,
    stationId,
    stationName,
    connectorLabel,
    startedAt,
    endedAt: plusMinutes(startedAt, durationMinutes),
    durationMinutes,
    energyKwh,
    pricePerKwh,
    cost: energyKwh * pricePerKwh,
  };
}

export const seedHistory: ChargingHistoryDetail[] = [
  entry('h1', 'st_maslak', 'TORA WATT Maslak', 'CCS2 · 180 kW', 2, 9, 32, 41.2, 12.49),
  entry('h2', 'st_kagithane', 'Kağıthane Vadi AVM', 'CCS2 · 300 kW', 5, 18, 21, 33.8, 14.5),
  entry('h3', 'st_levent', 'Levent Plaza Otopark', 'Type 2 · 11 kW', 9, 11, 214, 24.1, 8.9),
  entry('h4', 'st_atasehir', 'Ataşehir Finans Merkezi', 'CCS2 · 150 kW', 14, 20, 27, 35.6, 12.49),
  entry('h5', 'st_maslak', 'TORA WATT Maslak', 'Type 2 · 22 kW', 23, 8, 96, 19.4, 9.75),
];
