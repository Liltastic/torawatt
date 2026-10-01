/** Bicimleyiciler. Hepsi tr-TR: binlik ayraci nokta, ondalik virgul. */

const number0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

export const formatNumber = (value: number) => number0.format(value);
export const formatDecimal = (value: number) => number1.format(value);

/**
 * Buyuk sayilari kisaltir: olcu kartlarinda 37.193 yerine "37,2 B" duruyor,
 * boylece dort kart ayni genislikte kaliyor ve sayi tasmiyor.
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${number1.format(value / 1_000_000)} M`;
  if (Math.abs(value) >= 10_000) return `${number1.format(value / 1000)} B`;
  return number0.format(Math.round(value));
}

export const formatMoney = (value: number) => `${money.format(Math.round(value))} TL`;

/**
 * Konum icin dort ondalik: bir ondalik yaklasik 11 km'ye denk geliyor ve
 * "41, 29,1" gibi bir deger istasyonun yerini anlatmiyor.
 */
const coord = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export const formatCoord = (value: number) => coord.format(value);

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

/** "3 gun once", "2 saat once" - destek ve oturum listelerinde. */
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return minutes <= 0 ? 'birazdan' : `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return hours <= 0 ? `${-hours} sa sonra` : `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return days <= 0 ? `${-days} gün sonra` : `${days} gün önce`;
}

export const CONNECTOR_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Müsait',
  OCCUPIED: 'Dolu',
  FAULTED: 'Arızalı',
  OFFLINE: 'Çevrimdışı',
  UNKNOWN: 'Bilinmiyor',
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  CONFIRMED: 'Onaylandı',
  ARRIVED: 'Geldi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
  EXPIRED: 'Süresi doldu',
};

/** Durum -> rozet rengi. Bilinmeyen deger notr kaliyor. */
export function statusTone(status: string): 'ok' | 'busy' | 'bad' | 'idle' | 'info' {
  switch (status) {
    case 'AVAILABLE':
    case 'COMPLETED':
    case 'CONFIRMED':
      return 'ok';
    case 'OCCUPIED':
    case 'PENDING':
      return 'busy';
    case 'FAULTED':
    case 'CANCELLED':
      return 'bad';
    case 'ARRIVED':
      return 'info';
    default:
      return 'idle';
  }
}
