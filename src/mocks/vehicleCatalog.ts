import type { ConnectorType } from '@/types/domain';

/**
 * GECICI: arac katalogu. Gercekte bu liste backend'den (veya bir arac
 * veritabani saglayicisindan) gelmeli; burada Turkiye pazarinda yaygin
 * modellerle sinirli bir baslangic seti var.
 *
 * Degerler ureticinin verdigi nominal rakamlar; gercek menzil ve sarj
 * hizi hava, yuk ve batarya durumuna gore degisir.
 */
export interface VehiclePreset {
  id: string;
  make: string;
  model: string;
  batteryCapacityKwh: number;
  maxAcKw: number;
  maxDcKw: number;
  connectors: ConnectorType[];
  averageConsumptionKwhPer100Km: number;
}

export const vehicleCatalog: VehiclePreset[] = [
  {
    id: 'togg-t10x-long',
    make: 'Togg',
    model: 'T10X Uzun Menzil',
    batteryCapacityKwh: 88.5,
    maxAcKw: 22,
    maxDcKw: 180,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 18.5,
  },
  {
    id: 'togg-t10x-standard',
    make: 'Togg',
    model: 'T10X Standart Menzil',
    batteryCapacityKwh: 52.4,
    maxAcKw: 22,
    maxDcKw: 145,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 17.5,
  },
  {
    id: 'tesla-model-y',
    make: 'Tesla',
    model: 'Model Y Long Range',
    batteryCapacityKwh: 75,
    maxAcKw: 11,
    maxDcKw: 250,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 16.9,
  },
  {
    id: 'tesla-model-3',
    make: 'Tesla',
    model: 'Model 3',
    batteryCapacityKwh: 60,
    maxAcKw: 11,
    maxDcKw: 170,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 14.7,
  },
  {
    id: 'hyundai-ioniq5',
    make: 'Hyundai',
    model: 'IONIQ 5',
    batteryCapacityKwh: 77.4,
    maxAcKw: 11,
    maxDcKw: 233,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 18.2,
  },
  {
    id: 'kia-ev6',
    make: 'Kia',
    model: 'EV6',
    batteryCapacityKwh: 77.4,
    maxAcKw: 11,
    maxDcKw: 240,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 17.8,
  },
  {
    id: 'vw-id4',
    make: 'Volkswagen',
    model: 'ID.4 Pro',
    batteryCapacityKwh: 77,
    maxAcKw: 11,
    maxDcKw: 135,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 18.9,
  },
  {
    id: 'byd-atto3',
    make: 'BYD',
    model: 'Atto 3',
    batteryCapacityKwh: 60.5,
    maxAcKw: 11,
    maxDcKw: 88,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 18.5,
  },
  {
    id: 'renault-megane',
    make: 'Renault',
    model: 'Megane E-Tech',
    batteryCapacityKwh: 60,
    maxAcKw: 22,
    maxDcKw: 130,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 16.1,
  },
  {
    id: 'mg-mg4',
    make: 'MG',
    model: 'MG4 Luxury',
    batteryCapacityKwh: 64,
    maxAcKw: 11,
    maxDcKw: 140,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 17.2,
  },
  {
    id: 'fiat-500e',
    make: 'Fiat',
    model: '500e',
    batteryCapacityKwh: 42,
    maxAcKw: 11,
    maxDcKw: 85,
    connectors: ['CCS2', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 14.8,
  },
  {
    id: 'nissan-leaf',
    make: 'Nissan',
    model: 'Leaf',
    batteryCapacityKwh: 40,
    maxAcKw: 6.6,
    maxDcKw: 50,
    connectors: ['CHADEMO', 'TYPE_2'],
    averageConsumptionKwhPer100Km: 17.1,
  },
];
