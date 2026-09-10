import type { ChargerStatus } from '@/types/domain';

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

/** Istasyon pin ve soket durum renkleri (spec bolum 5). */
export const statusColors: Record<ChargerStatus, string> = {
  AVAILABLE: colors.success,
  OCCUPIED: colors.warning,
  FAULTED: colors.danger,
  OFFLINE: colors.neutral,
  UNKNOWN: colors.neutral,
};

export const statusSoftColors: Record<ChargerStatus, string> = {
  AVAILABLE: colors.successSoft,
  OCCUPIED: colors.warningSoft,
  FAULTED: colors.dangerSoft,
  OFFLINE: colors.neutralSoft,
  UNKNOWN: colors.neutralSoft,
};

export const statusLabels: Record<ChargerStatus, string> = {
  AVAILABLE: 'Müsait',
  OCCUPIED: 'Dolu',
  FAULTED: 'Arızalı',
  OFFLINE: 'Çevrimdışı',
  UNKNOWN: 'Bilinmiyor',
};
