import type { ChargerStatus, StationAvailability } from '@/types/domain';

/**
 * TORA WATT renk tokenlari (spec bolum 17).
 * "Solar Fresh" yonu: canli turkuaz/yesil enerji paleti, eski donuk lacivert
 * yerine. Marka logosunun mavisi `location` olarak ayri tutuluyor - kullanici
 * konum noktasi ve birkaç vurguda bu maviyi koruyoruz, geri kalan her yerde
 * (buton, rozet, harita) turkuaz ana renk.
 *
 * Iki palet var ve anahtarlari birebir ayni: bilesenler rengi hicbir zaman
 * modulden dogrudan almiyor, o anki temaya gore useColors / createThemedStyles
 * uzerinden aliyor (bkz. theme/theme.ts). Boylece sistem temasi degisince
 * ekranlar uygulama yeniden baslamadan guncelleniyor.
 */
export const lightColors = {
  background: '#F2FBF6',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF7F0',
  /**
   * surfaceMuted bir cukurun ustune kabarik oturan secili parca (segment
   * secicinin kayan zemini). Acik temada surface'in kendisi; koyu temada
   * surface cukurdan KOYU kaldigi icin secim icine gomulmus gibi okunuyordu.
   */
  surfaceRaised: '#FFFFFF',

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
  /** Beyaz metnin uzerine oturdugu koyu turkuaz zemin (sarj karti, mini sarj cubugu). */
  heroDark: '#0B3B35',
  /** Acik zeminde LINK/vurgu metni: primaryDark 3.8:1'de kaliyordu, bu 5.4:1 (AA). */
  primaryText: '#0A7468',
  /** KOYU zeminde (giris/kayit fotografi, sarj karti) link ve vurgu metni; perde uzerinde 7.2:1. */
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
  /** Dolgu ustundeki yazi/ikon (buton, bant). Temadan bagimsiz olarak beyaz kalir. */
  white: '#FFFFFF',
};

export type Palette = typeof lightColors;

/**
 * Koyu tema: turkuaza calan neredeyse siyah zeminler. Olculen kontrastlar:
 * text zeminlerde 13.5-16.4, textSecondary 7.2-9.0, textTertiary 5.2+,
 * primaryText arka planda 10.4 ve primarySoft uzerinde 7.7, her *Text kendi
 * *Soft zemininde 7.4+. Beyaz yazili dolgular (primaryStrong, dangerStrong)
 * acik temayla ayni: 4.9 ve 5.3. Odak cercevesi primaryStrong yuzeyde 3.5.
 */
export const darkColors: Palette = {
  background: '#0A1512',
  surface: '#111F1B',
  surfaceMuted: '#172823',
  // Cukurdan 1.32:1 acik; uzerinde text 10.23.
  surfaceRaised: '#263D36',

  text: '#E7F3EE',
  textSecondary: '#A3B9B0',
  textTertiary: '#7D938A',
  border: '#243832',

  primary: '#1CC4B1',
  primaryDark: '#16A393',
  primarySoft: '#10332D',
  primarySoftPressed: '#15403A',
  primaryStrong: '#0A7F74',
  primaryStrongPressed: '#086A5F',
  // Koyu zeminden ayrissin diye acik temadakinden bir ton acik.
  heroDark: '#0F4A42',
  primaryText: '#4FD6C3',
  primaryOnDark: '#53D9C6',

  success: '#2DD68F',
  successSoft: '#0E2F22',
  successText: '#5BE3A6',
  successOnDark: '#7BF0B8',
  warning: '#FF9A57',
  warningSoft: '#3A2413',
  warningText: '#FFB47F',
  warningOnDark: '#FFC58F',
  danger: '#FF6B85',
  dangerSoft: '#3D1821',
  dangerText: '#FF94A8',
  dangerStrong: '#C92E4A',
  dangerStrongPressed: '#B4233F',
  dangerOnDark: '#FF8FA3',

  neutral: '#7F968C',
  neutralSoft: '#1C2A26',

  location: '#5A9BFF',
  locationSoft: '#152440',

  black: '#050505',
  white: '#FFFFFF',
};

/** Soket durumu ve istasyon uygunlugu ayni rozet/pin paletini paylasir. */
export type BadgeStatus = ChargerStatus | StationAvailability;

/** Istasyon pin ve soket durum renkleri (spec bolum 5). */
export function statusColorsFor(colors: Palette): Record<BadgeStatus, string> {
  return {
    AVAILABLE: colors.success,
    PARTIAL: colors.warning,
    OCCUPIED: colors.warning,
    FULL: colors.danger,
    FAULTED: colors.danger,
    OFFLINE: colors.neutral,
    UNKNOWN: colors.neutral,
  };
}

export function statusSoftColorsFor(colors: Palette): Record<BadgeStatus, string> {
  return {
    AVAILABLE: colors.successSoft,
    PARTIAL: colors.warningSoft,
    OCCUPIED: colors.warningSoft,
    FULL: colors.dangerSoft,
    FAULTED: colors.dangerSoft,
    OFFLINE: colors.neutralSoft,
    UNKNOWN: colors.neutralSoft,
  };
}

/**
 * Rozet METNI: statusSoftColors zemini uzerinde iki temada da 4.5:1'in ustunde.
 * statusColors ile yazildiginda "Musait" 2.0:1, "Dolu" 2.9:1'de kaliyordu.
 */
export function statusTextColorsFor(colors: Palette): Record<BadgeStatus, string> {
  return {
    AVAILABLE: colors.successText,
    PARTIAL: colors.warningText,
    OCCUPIED: colors.warningText,
    FULL: colors.dangerText,
    FAULTED: colors.dangerText,
    OFFLINE: colors.textSecondary,
    UNKNOWN: colors.textSecondary,
  };
}

export const statusLabels: Record<BadgeStatus, string> = {
  AVAILABLE: 'Müsait',
  PARTIAL: 'Kısmen müsait',
  OCCUPIED: 'Dolu',
  FULL: 'Dolu',
  FAULTED: 'Arızalı',
  OFFLINE: 'Çevrimdışı',
  UNKNOWN: 'Bilinmiyor',
};

/**
 * '#RRGGBB' -> 'rgba(r, g, b, alpha)'. Temanin bir rengini saydam kullanmak
 * icin (gecis maskeleri, harita atfi). React Native'e bagli olmadigi icin
 * burada: harita HTML'i ve onu denetleyen Node betigi de kullaniyor.
 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
