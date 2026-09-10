/**
 * Turkce yerel bicimlendirme.
 * Intl yerine elle bicimlendiriyoruz: Hermes'te Intl davranisi platforma gore
 * degisebiliyor, bu fonksiyonlar her yerde ayni ciktiyi veriyor.
 */

const withComma = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

/** 12.49 -> "₺12,49" */
export function formatPrice(value: number, digits = 2): string {
  return `₺${withComma(value, digits)}`;
}

/** 1.2 -> "1,2 km" */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${withComma(km, 1)} km`;
}

/** 24.8 -> "24,8 kWh" */
export function formatEnergy(kwh: number): string {
  return `${withComma(kwh, 1)} kWh`;
}

/** 32.4 -> "32,4 kW" */
export function formatPower(kw: number): string {
  return `${withComma(kw, 1)} kW`;
}

/** 1662 -> "27:42" */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
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
