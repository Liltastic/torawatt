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

  /**
   * Marka turkuazi: halka, grafik, harita, cerceve ve odak vurgusu. Uzerine
   * BEYAZ yazi konmaz (2.57:1) - dolgular icin primaryStrong var.
   */
  primary: '#0FB5A3',
  primaryDark: '#0C8F82',
  primarySoft: '#DCF6EF',
  /** primarySoft zeminli bir seyin basili hali; uzerinde primaryText 4.7:1. */
  primarySoftPressed: '#D2F1E8',
  /**
   * Beyaz yazi/ikon tasiyan turkuaz dolgu: birincil buton, secili cip, bant,
   * rozet. Beyazla 4.88:1 (AA); markanin tonuna AA'yi gecen en yakin deger.
   */
  primaryStrong: '#0A7F74',
  /** primaryStrong'un basili hali; beyazla 6.5:1. */
  primaryStrongPressed: '#086A5F',
  /** Beyaz metnin uzerine oturdugu koyu turkuaz zemin (giris/kayit hero'su). */
  heroDark: '#0B3B35',
  /** Acik zeminde LINK/vurgu metni: primaryDark 3.8:1'de kaliyordu, bu 5.4:1 (AA). */
  primaryText: '#0A7468',
  /** KOYU zeminde (giris/kayit fotografi) link ve vurgu metni; perde uzerinde 7.2:1. */
  primaryOnDark: '#53D9C6',

  // Parlak durum renkleri (success/warning/danger) nokta, pin, cerceve ve
  // grafik icin. Acik zeminde METIN olarak okunmuyorlardi ("Musait" rozeti
  // 2.0:1); metin icin *Text, beyaz yazili dolgu icin *Strong kullanilir.
  success: '#16C784',
  successSoft: '#E1FAEE',
  /** Acik zeminde yesil metin: beyaz 5.7, arka plan 5.4, successSoft 5.2. */
  successText: '#08764A',
  /** KOYU zeminde (sarj karti, mini sarj cubugu) "tamamlandi" vurgusu. */
  successOnDark: '#7BF0B8',
  warning: '#FF8A3D',
  warningSoft: '#FFECDD',
  /** Acik zeminde turuncu metin: beyaz 5.8, arka plan 5.5, warningSoft 5.1. */
  warningText: '#A34C0B',
  /** KOYU zeminde "baglaniyor" vurgusu. */
  warningOnDark: '#FFC58F',
  danger: '#FF4D6D',
  dangerSoft: '#FFE2E9',
  /** Acik zeminde kirmizi metin (hata satiri, cikis): beyaz 5.7, arka plan 5.4, dangerSoft 4.7. */
  dangerText: '#C0294A',
  /** Beyaz yazili kirmizi dolgu (yikici buton): 5.3:1; danger beyazla 3.2:1'de kaliyordu. */
  dangerStrong: '#C92E4A',
  dangerStrongPressed: '#B4233F',
  /** KOYU zeminde hata metni; danger perde uzerinde 3.9:1'de kaliyor, bu 5.8:1. */
  dangerOnDark: '#FF8FA3',

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

/**
 * Rozet METNI: statusSoftColors zemini uzerinde hepsi 4.5:1'in ustunde.
 * statusColors ile yazildiginda "Musait" 2.0:1, "Dolu" 2.9:1'de kaliyordu.
 */
export const statusTextColors: Record<BadgeStatus, string> = {
  AVAILABLE: colors.successText,
  PARTIAL: colors.warningText,
  OCCUPIED: colors.warningText,
  FULL: colors.dangerText,
  FAULTED: colors.dangerText,
  OFFLINE: colors.textSecondary,
  UNKNOWN: colors.textSecondary,
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
