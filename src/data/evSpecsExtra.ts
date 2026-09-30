import type { EvVariant } from './evSpecs';

/**
 * Open EV Data setinde BULUNMAYAN araclar.
 *
 * Set 62 marka tasiyor ama Kia, Togg, Opel ve Seat'in tamami disarida
 * (bkz. evSpecs). Bu dosya o bosluklari kapatiyor.
 *
 * KURAL: buradaki hicbir sayi hafizadan yazilmadi. Her satirin `source`
 * alani, degerin alindigi sayfayi gosteriyor; bir degeri dogrulamak isteyen
 * dogrudan oraya bakabilir. Kaynagindan teyit edemedigim hicbir arac listeye
 * alinmadi - eksik birakmak, uydurmaktan iyidir.
 *
 * Batarya degerleri KULLANILABILIR (useable) kapasite; uygulamanin menzil ve
 * sarj suresi hesaplari da onu istiyor, brut kapasiteyi degil.
 *
 * Yeni arac eklerken ayni kalibi izle: kaynak sayfayi ac, uc degeri oradan
 * oku, baglantiyi satira yaz.
 */
export const extraVariants: EvVariant[] = [
  {
    make: 'Togg',
    model: 'T10X',
    year: 2025,
    trim: 'Long Range RWD',
    batteryKwh: 85,
    acKw: 11,
    dcKw: 180,
    source: 'https://ev-database.org/car/3302/TOGG-T10X-Long-Range-RWD',
  },
  {
    make: 'Togg',
    model: 'T10X',
    year: 2025,
    trim: 'Long Range AWD',
    batteryKwh: 85,
    // AWD'de standart sarj cihazi 22 kW; RWD'de 11 kW (kaynakta ikisi de
    // ayri ayri yaziyor, pazara gore degisebildigi notuyla).
    acKw: 22,
    dcKw: 180,
    source: 'https://ev-database.org/car/3303/TOGG-T10X-Long-Range-AWD',
  },
  {
    make: 'Togg',
    model: 'T10F',
    year: 2025,
    trim: 'Standard Range RWD',
    batteryKwh: 50,
    acKw: 11,
    dcKw: 180,
    source: 'https://ev-database.org/car/3304/TOGG-T10F-Standard-Range-RWD',
  },
  {
    make: 'Kia',
    model: 'EV6',
    year: 2021,
    trim: 'Long Range 2WD',
    batteryKwh: 74,
    acKw: 11,
    dcKw: 233,
    source: 'https://ev-database.org/car/1481/Kia-EV6-Long-Range-2WD',
  },
  {
    make: 'Kia',
    model: 'EV9',
    year: 2023,
    trim: '99.8 kWh AWD',
    batteryKwh: 96,
    acKw: 11,
    dcKw: 209,
    source: 'https://ev-database.org/car/1835/Kia-EV9-998-kWh-AWD',
  },
  {
    make: 'Opel',
    model: 'Mokka Electric',
    year: 2024,
    trim: null,
    batteryKwh: 50.8,
    // Standart sarj cihazi 7.4 kW; 11 kW bazi pazarlarda opsiyon.
    acKw: 7.4,
    dcKw: 107,
    source: 'https://ev-database.org/car/3051/Opel-Mokka-Electric',
  },
];
