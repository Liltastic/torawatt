import type { Station } from '@/types/domain';

/**
 * GECICI: yalnizca UI gelistirme icin. Backend /stations ucu hazir olunca
 * bu dosya silinip TanStack Query ile gercek veri baglanacak.
 */
export const mockStations: Station[] = [
  {
    id: 'st_maslak',
    name: 'TORA WATT Maslak',
    latitude: 41.1106,
    longitude: 29.0206,
    address: 'Maslak Mah. Büyükdere Cad. No:243, Sarıyer/İstanbul',
    operator: 'TORA WATT',
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Market'],
    distanceKm: 1.2,
    connectors: [
      { id: 'c1', type: 'CCS2', powerKw: 180, status: 'AVAILABLE', pricePerKwh: 12.49, idleFeePerMin: 0.99 },
      { id: 'c2', type: 'CCS2', powerKw: 180, status: 'AVAILABLE', pricePerKwh: 12.49, idleFeePerMin: 0.99 },
      { id: 'c3', type: 'CHADEMO', powerKw: 50, status: 'OCCUPIED', pricePerKwh: 11.9 },
      { id: 'c4', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE', pricePerKwh: 9.75 },
    ],
  },
  {
    id: 'st_levent',
    name: 'Levent Plaza Otopark',
    latitude: 41.0819,
    longitude: 29.0117,
    address: 'Levent Mah. Çarşı Cad. No:12, Beşiktaş/İstanbul',
    operator: 'Voltrun',
    isOpen24h: false,
    amenities: ['Otopark', 'Restoran'],
    distanceKm: 2.4,
    connectors: [
      { id: 'c5', type: 'CCS2', powerKw: 60, status: 'OCCUPIED', pricePerKwh: 13.2 },
      { id: 'c6', type: 'TYPE_2', powerKw: 11, status: 'AVAILABLE', pricePerKwh: 8.9 },
    ],
  },
  {
    id: 'st_kagithane',
    name: 'Kağıthane Vadi AVM',
    latitude: 41.0876,
    longitude: 28.9712,
    address: 'Merkez Mah. Vadi İstanbul, Kağıthane/İstanbul',
    operator: 'ZES',
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Market', 'Otopark'],
    distanceKm: 3.8,
    connectors: [
      { id: 'c7', type: 'CCS2', powerKw: 300, status: 'AVAILABLE', pricePerKwh: 14.5, idleFeePerMin: 1.5 },
      { id: 'c8', type: 'CCS2', powerKw: 300, status: 'FAULTED' },
      { id: 'c9', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE', pricePerKwh: 9.25 },
    ],
  },
  {
    id: 'st_besiktas',
    name: 'Beşiktaş Sahil',
    latitude: 41.0422,
    longitude: 29.0061,
    address: 'Sinanpaşa Mah. Sahil Yolu, Beşiktaş/İstanbul',
    operator: 'Trugo',
    isOpen24h: true,
    amenities: ['Kafe'],
    distanceKm: 5.1,
    connectors: [
      { id: 'c10', type: 'CCS2', powerKw: 90, status: 'OCCUPIED', pricePerKwh: 12.8 },
      { id: 'c11', type: 'CCS2', powerKw: 90, status: 'OCCUPIED', pricePerKwh: 12.8 },
    ],
  },
  {
    id: 'st_atasehir',
    name: 'Ataşehir Finans Merkezi',
    latitude: 40.9923,
    longitude: 29.1244,
    address: 'Barbaros Mah. Finans Merkezi, Ataşehir/İstanbul',
    operator: 'TORA WATT',
    isOpen24h: true,
    amenities: ['WC', 'Otopark'],
    distanceKm: 8.6,
    connectors: [
      { id: 'c12', type: 'CCS2', powerKw: 150, status: 'AVAILABLE', pricePerKwh: 12.49 },
      { id: 'c13', type: 'NACS', powerKw: 150, status: 'AVAILABLE', pricePerKwh: 12.49 },
      { id: 'c14', type: 'TYPE_2', powerKw: 22, status: 'OFFLINE' },
    ],
  },
];

export function findMockStation(id: string): Station | undefined {
  return mockStations.find((station) => station.id === id);
}
