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

  // Istanbul - Ankara koridoru: rota planlayicinin mola onerebilmesi icin.
  {
    id: 'st_gebze',
    name: 'Gebze Dinlenme Tesisi',
    latitude: 40.8021,
    longitude: 29.4307,
    address: 'TEM Otoyolu, Gebze/Kocaeli',
    operator: 'TORA WATT',
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Restoran'],
    connectors: [
      { id: 'c20', type: 'CCS2', powerKw: 180, status: 'AVAILABLE', pricePerKwh: 12.9 },
      { id: 'c21', type: 'CCS2', powerKw: 180, status: 'AVAILABLE', pricePerKwh: 12.9 },
    ],
  },
  {
    id: 'st_sakarya',
    name: 'Sakarya Batı Dinlenme',
    latitude: 40.7654,
    longitude: 30.4012,
    address: 'TEM Otoyolu, Adapazarı/Sakarya',
    operator: 'ZES',
    isOpen24h: true,
    amenities: ['WC', 'Market'],
    connectors: [
      { id: 'c22', type: 'CCS2', powerKw: 150, status: 'AVAILABLE', pricePerKwh: 13.4 },
      { id: 'c23', type: 'CHADEMO', powerKw: 50, status: 'AVAILABLE', pricePerKwh: 12.1 },
    ],
  },
  {
    id: 'st_duzce',
    name: 'Düzce Otoyol Plaza',
    latitude: 40.8438,
    longitude: 31.1565,
    address: 'TEM Otoyolu, Düzce',
    operator: 'Voltrun',
    isOpen24h: true,
    amenities: ['WC', 'Kafe'],
    connectors: [
      { id: 'c24', type: 'CCS2', powerKw: 90, status: 'OCCUPIED', pricePerKwh: 13.9 },
      { id: 'c25', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE', pricePerKwh: 9.6 },
    ],
  },
  {
    id: 'st_bolu',
    name: 'TORA WATT Bolu Dağı',
    latitude: 40.7396,
    longitude: 31.6112,
    address: 'Bolu Dağı Geçişi, Bolu',
    operator: 'TORA WATT',
    isOpen24h: true,
    amenities: ['WC', 'Restoran', 'Market', 'Otopark'],
    connectors: [
      { id: 'c26', type: 'CCS2', powerKw: 300, status: 'AVAILABLE', pricePerKwh: 14.2 },
      { id: 'c27', type: 'CCS2', powerKw: 300, status: 'AVAILABLE', pricePerKwh: 14.2 },
      { id: 'c28', type: 'NACS', powerKw: 250, status: 'AVAILABLE', pricePerKwh: 14.2 },
    ],
  },
  {
    id: 'st_gerede',
    name: 'Gerede Kavşak',
    latitude: 40.8005,
    longitude: 32.1985,
    address: 'D100 Karayolu, Gerede/Bolu',
    operator: 'Trugo',
    isOpen24h: false,
    amenities: ['WC'],
    connectors: [
      { id: 'c29', type: 'CCS2', powerKw: 120, status: 'AVAILABLE', pricePerKwh: 13.1 },
    ],
  },
  {
    id: 'st_kizilcahamam',
    name: 'Kızılcahamam Termal',
    latitude: 40.4712,
    longitude: 32.6489,
    address: 'Ankara Yolu, Kızılcahamam/Ankara',
    operator: 'TORA WATT',
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Restoran'],
    connectors: [
      { id: 'c30', type: 'CCS2', powerKw: 180, status: 'AVAILABLE', pricePerKwh: 12.7 },
      { id: 'c31', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE', pricePerKwh: 9.4 },
    ],
  },
];

export function findMockStation(id: string): Station | undefined {
  return mockStations.find((station) => station.id === id);
}
