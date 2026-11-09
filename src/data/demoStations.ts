import type { Station } from '@/types/domain';

/**
 * Uygulamanin gosterdigi istasyonlar: ORNEK VERI. Bu surumde gercek istasyon
 * ya da canli soket durumu yok; adlarin "Demo" ile baslamasi kullanicinin bunu
 * her ekranda gormesi icin.
 *
 * Sunucuya sorulmadan uygulamanin icinden geliyor: backend uyurken bile harita
 * aninda doluyor. Kimlikler sunucudaki kayitlarla ayni (st_*), cunku favoriler
 * sunucuda o tabloya bagli.
 *
 * Saat, kadran, widget ve CarPlay ayni listeyi kendi Swift dosyalarinda tasiyor
 * (bkz. targets/README.md); liste degisirse onlar da guncellenmeli.
 */
const OPERATOR = 'TORA WATT Demo';

export const DEMO_STATIONS: Station[] = [
  {
    id: 'st_maslak',
    name: 'Demo Maslak',
    latitude: 41.1106,
    longitude: 29.0206,
    address: 'Maslak, Sarıyer/İstanbul',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Market'],
    connectors: [
      { id: 'c1', type: 'CCS2', powerKw: 180, status: 'AVAILABLE' },
      { id: 'c2', type: 'CCS2', powerKw: 180, status: 'AVAILABLE' },
      { id: 'c3', type: 'CHADEMO', powerKw: 50, status: 'OCCUPIED' },
      { id: 'c4', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_levent',
    name: 'Demo Levent',
    latitude: 41.0819,
    longitude: 29.0117,
    address: 'Levent, Beşiktaş/İstanbul',
    operator: OPERATOR,
    isOpen24h: false,
    amenities: ['Otopark', 'Restoran'],
    connectors: [
      { id: 'c5', type: 'CCS2', powerKw: 60, status: 'OCCUPIED' },
      { id: 'c6', type: 'TYPE_2', powerKw: 11, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_kagithane',
    name: 'Demo Kağıthane',
    latitude: 41.0876,
    longitude: 28.9712,
    address: 'Merkez, Kağıthane/İstanbul',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Market', 'Otopark'],
    connectors: [
      { id: 'c7', type: 'CCS2', powerKw: 300, status: 'AVAILABLE' },
      { id: 'c8', type: 'CCS2', powerKw: 300, status: 'FAULTED' },
      { id: 'c9', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_besiktas',
    name: 'Demo Beşiktaş',
    latitude: 41.0422,
    longitude: 29.0061,
    address: 'Sinanpaşa, Beşiktaş/İstanbul',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['Kafe'],
    connectors: [
      { id: 'c10', type: 'CCS2', powerKw: 90, status: 'OCCUPIED' },
      { id: 'c11', type: 'CCS2', powerKw: 90, status: 'OCCUPIED' },
    ],
  },
  {
    id: 'st_atasehir',
    name: 'Demo Ataşehir',
    latitude: 40.9923,
    longitude: 29.1244,
    address: 'Barbaros, Ataşehir/İstanbul',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Otopark'],
    connectors: [
      { id: 'c12', type: 'CCS2', powerKw: 150, status: 'AVAILABLE' },
      { id: 'c13', type: 'NACS', powerKw: 150, status: 'AVAILABLE' },
      { id: 'c14', type: 'TYPE_2', powerKw: 22, status: 'OFFLINE' },
    ],
  },
  {
    id: 'st_gebze',
    name: 'Demo Gebze',
    latitude: 40.8021,
    longitude: 29.4307,
    address: 'TEM Otoyolu, Gebze/Kocaeli',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Restoran'],
    connectors: [
      { id: 'c20', type: 'CCS2', powerKw: 180, status: 'AVAILABLE' },
      { id: 'c21', type: 'CCS2', powerKw: 180, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_sakarya',
    name: 'Demo Sakarya',
    latitude: 40.7654,
    longitude: 30.4012,
    address: 'TEM Otoyolu, Adapazarı/Sakarya',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Market'],
    connectors: [
      { id: 'c22', type: 'CCS2', powerKw: 150, status: 'AVAILABLE' },
      { id: 'c23', type: 'CHADEMO', powerKw: 50, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_duzce',
    name: 'Demo Düzce',
    latitude: 40.8438,
    longitude: 31.1565,
    address: 'TEM Otoyolu, Düzce',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Kafe'],
    connectors: [
      { id: 'c24', type: 'CCS2', powerKw: 90, status: 'OCCUPIED' },
      { id: 'c25', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_bolu',
    name: 'Demo Bolu',
    latitude: 40.7396,
    longitude: 31.6112,
    address: 'Bolu Dağı Geçişi, Bolu',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Restoran', 'Market', 'Otopark'],
    connectors: [
      { id: 'c26', type: 'CCS2', powerKw: 300, status: 'AVAILABLE' },
      { id: 'c27', type: 'CCS2', powerKw: 300, status: 'AVAILABLE' },
      { id: 'c28', type: 'NACS', powerKw: 250, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_gerede',
    name: 'Demo Gerede',
    latitude: 40.8005,
    longitude: 32.1985,
    address: 'D100 Karayolu, Gerede/Bolu',
    operator: OPERATOR,
    isOpen24h: false,
    amenities: ['WC'],
    connectors: [
      { id: 'c29', type: 'CCS2', powerKw: 120, status: 'AVAILABLE' },
    ],
  },
  {
    id: 'st_kizilcahamam',
    name: 'Demo Kızılcahamam',
    latitude: 40.4712,
    longitude: 32.6489,
    address: 'Ankara Yolu, Kızılcahamam/Ankara',
    operator: OPERATOR,
    isOpen24h: true,
    amenities: ['WC', 'Kafe', 'Restoran'],
    connectors: [
      { id: 'c30', type: 'CCS2', powerKw: 180, status: 'AVAILABLE' },
      { id: 'c31', type: 'TYPE_2', powerKw: 22, status: 'AVAILABLE' },
    ],
  },
];
