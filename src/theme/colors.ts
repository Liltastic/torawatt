import type { ChargerStatus, StationAvailability } from '@/types/domain';

/**
 * TORA WATT renk tokenlari (spec bolum 17).
 * "Solar Fresh" yonu: canli turkuaz/yesil enerji paleti, eski donuk lacivert
 * yerine. Marka logosunun mavisi `location` olarak ayri tutuluyor - kullanici
 * konum noktasi ve birkaç vurguda bu maviyi koruyoruz, geri kalan her yerde
 * (buton, rozet, harita) turkuaz ana renk.
 */
export const colors = {
  background: '#F2FBF6',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF7F0',

  text: '#0F2A22',
  textSecondary: '#5B7268',
  textTertiary: '#93A79D',
  border: '#DCEFE4',

  primary: '#0FB5A3',
  primaryDark: '#0C8F82',
  primarySoft: '#DCF6EF',

  success: '#16C784',
  successSoft: '#E1FAEE',
  warning: '#FF8A3D',
  warningSoft: '#FFECDD',
  danger: '#FF4D6D',
  dangerSoft: '#FFE2E9',

  neutral: '#93A79D',
  neutralSoft: '#E9F3EE',

  /** Logonun mavisi; kullanici konum noktasi ve marka vurgularinda kullanilir. */
  location: '#2F7DFF',
  locationSoft: '#E3EDFF',

  black: '#050505',
  white: '#FFFFFF',
} as const;

/** Soket durumu ve istasyon uygunlugu ayni rozet/pin paletini paylasir. */
export type BadgeStatus = ChargerStatus | StationAvailability;

/** Istasyon pin ve soket durum renkleri (spec bolum 5). */
export const statusColors: Record<BadgeStatus, string> = {
  AVAILABLE: colors.success,
  PARTIAL: colors.warning,
  OCCUPIED: colors.warning,
  FULL: colors.danger,
  FAULTED: colors.danger,
  OFFLINE: colors.neutral,
  UNKNOWN: colors.neutral,
};

export const statusSoftColors: Record<BadgeStatus, string> = {
  AVAILABLE: colors.successSoft,
  PARTIAL: colors.warningSoft,
  OCCUPIED: colors.warningSoft,
  FULL: colors.dangerSoft,
  FAULTED: colors.dangerSoft,
  OFFLINE: colors.neutralSoft,
  UNKNOWN: colors.neutralSoft,
};

export const statusLabels: Record<BadgeStatus, string> = {
  AVAILABLE: 'Müsait',
  PARTIAL: 'Kısmen müsait',
  OCCUPIED: 'Dolu',
  FULL: 'Dolu',
  FAULTED: 'Arızalı',
  OFFLINE: 'Çevrimdışı',
  UNKNOWN: 'Bilinmiyor',
};
