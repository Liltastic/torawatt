import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** 4 px tabanli grid (spec bolum 17). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  card: 22,
  button: 16,
  search: 18,
  badge: 10,
  chip: 999,
} as const;

/** Dokunma hedefi minimumu (spec bolum 36). */
export const MIN_TOUCH_TARGET = 44;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B0D12',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  })!,
  sheet: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B0D12',
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -4 },
    },
    android: { elevation: 12 },
    default: {},
  })!,
} as const;

/** Tipografi olcegi (spec bolum 17). */
export const typography = {
  h1: { fontSize: 32, lineHeight: 36, fontWeight: '700' },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  captionStrong: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});
