import type { EvVariant } from './evSpecs';

/**
 * Open EV Data setinde BULUNMAYAN araclar.
 *
 * Set 62 marka tasiyor ama Kia, Togg ve Opel'in tamami disarida
 * (bkz. evSpecs). Bu dosya o bosluklari kapatiyor.
 *
 * KURAL: buradaki hicbir sayi hafizadan yazilmadi. Her satirin `source`
 * alani, degerin alindigi sayfayi gosteriyor; bir degeri dogrulamak isteyen
 * dogrudan oraya bakabilir. Kaynagindan teyit edemedigim hicbir arac listeye
 * alinmadi - eksik birakmak, uydurmaktan iyidir.
 *
 * Iki olcu kurali:
 * - Batarya KULLANILABILIR (useable/net) kapasite. Brut deger daha buyuk
 *   gorunur ama menzil ve sarj suresi hesaplarinin istedigi bu degil; Togg
 *   T10X'in bruto 88.5 kWh, kullanilabiliri 85.
 * - AC gucu STANDART sarj cihazinin degeri. Bazi araclarda daha yuksek bir
 *   cihaz opsiyon; opsiyonu yazmak cogu kullanici icin yanlis olurdu.
 *
 * Yeni arac eklerken ayni kalibi izle: kaynak sayfayi ac, uc degeri oradan
 * oku, baglantiyi satira yaz.
 */
export const extraVariants: EvVariant[] = [
  // --- Togg ---
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
    // Kaynak AWD'de standart cihazi 22 kW veriyor; RWD'de 11 kW.
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
    make: 'Togg',
    model: 'T10F',
    year: 2025,
    trim: 'Long Range RWD',
    batteryKwh: 85,
    acKw: 11,
    dcKw: 180,
    source: 'https://ev-database.org/car/3305/TOGG-T10F-Long-Range-RWD',
  },
  {
    make: 'Togg',
    model: 'T10F',
    year: 2025,
    trim: 'Long Range AWD',
    batteryKwh: 85,
    acKw: 11,
    dcKw: 180,
    source: 'https://ev-database.org/car/3306/TOGG-T10F-Long-Range-AWD',
  },

  // --- Kia ---
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
    make: 'Kia',
    model: 'Niro EV',
    year: 2022,
    trim: null,
    batteryKwh: 64.8,
    acKw: 11,
    dcKw: 94,
    source: 'https://ev-database.org/car/1666/Kia-Niro-EV',
  },
  {
    make: 'Kia',
    model: 'EV3',
    year: 2024,
    trim: 'Long Range',
    batteryKwh: 78,
    acKw: 11,
    dcKw: 128,
    source: 'https://www.evspecs.org/tech-specs/kia/ev3/long-range',
  },

  // --- Opel ---
  {
    make: 'Opel',
    model: 'Mokka Electric',
    year: 2024,
    trim: null,
    batteryKwh: 50.8,
    // Standart cihaz 7.4 kW; 11 kW bazi pazarlarda opsiyon.
    acKw: 7.4,
    dcKw: 107,
    source: 'https://ev-database.org/car/3051/Opel-Mokka-Electric',
  },
  {
    make: 'Opel',
    model: 'Astra Electric',
    year: 2023,
    trim: null,
    batteryKwh: 50.8,
    acKw: 11,
    dcKw: 100,
    source: 'https://www.evspecs.org/tech-specs/opel/astra-electric/astra-electric',
  },
  {
    make: 'Opel',
    model: 'Corsa Electric',
    year: 2023,
    trim: '50 kWh',
    batteryKwh: 46,
    // Kaynak: standart 7.4 kW, 11 kW opsiyon.
    acKw: 7.4,
    dcKw: 100,
    source: 'https://www.evspecs.org/tech-specs/opel/corsa-electric/50-kwh',
  },
];
