/**
 * Turkce yerel bicimlendirme.
 * Intl yerine elle bicimlendiriyoruz: Hermes'te Intl davranisi platforma gore
 * degisebiliyor, bu fonksiyonlar her yerde ayni ciktiyi veriyor.
 */

const withComma = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

/** 1.2 -> "1,2 km" */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${withComma(km, 1)} km`;
}

/** 24.8 -> "24,8 kWh" */
export function formatEnergy(kwh: number): string {
  return `${withComma(kwh, 1)} kWh`;
}

const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "10 Eylül 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14:30" */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "10 Eylül 2026, 14:30" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** 214 -> "3 sa 34 dk", 32 -> "32 dk" */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} sa ${rest} dk` : `${rest} dk`;
}
