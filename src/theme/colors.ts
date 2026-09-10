import type { ChargerStatus, StationAvailability } from '@/types/domain';

/**
 * TORA WATT renk tokenlari (spec bolum 17).
 * Erisilebilirlik testleri sonrasi kesinlesecek baslangic degerleri.
 */
export const colors = {
  background: '#EEF2FF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8FC',

  text: '#0B0D12',
  textSecondary: '#687080',
  textTertiary: '#9AA1AF',
  border: '#E7EAF0',

  primary: '#2F6BFF',
  primaryDark: '#1650E8',
  primarySoft: '#EAF0FF',

  success: '#18B968',
  successSoft: '#E6F7EF',
  warning: '#F4A62A',
  warningSoft: '#FEF4E4',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',

  neutral: '#9AA1AF',
  neutralSoft: '#F0F2F6',

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
