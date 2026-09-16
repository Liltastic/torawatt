import { StyleSheet, useColorScheme } from 'react-native';

import {
  darkColors,
  lightColors,
  statusColorsFor,
  statusSoftColorsFor,
  statusTextColorsFor,
  type BadgeStatus,
  type Palette,
} from './colors';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  statusColors: Record<BadgeStatus, string>;
  statusSoftColors: Record<BadgeStatus, string>;
  statusTextColors: Record<BadgeStatus, string>;
}

function buildTheme(scheme: ColorScheme, colors: Palette): Theme {
  return {
    scheme,
    colors,
    statusColors: statusColorsFor(colors),
    statusSoftColors: statusSoftColorsFor(colors),
    statusTextColors: statusTextColorsFor(colors),
  };
}

/** Iki tema da modul yuklenirken bir kez kuruluyor; hook'lar yalnizca birini seciyor. */
export const themes: Record<ColorScheme, Theme> = {
  light: buildTheme('light', lightColors),
  dark: buildTheme('dark', darkColors),
};

/**
 * Uygulamanin o anki temasi. Sistem temasini izliyor (app.json
 * userInterfaceStyle "automatic"); kullanici telefonun temasini degistirdiginde
 * useColorScheme yeni degeri verir ve bu hook'u kullanan her bilesen yeniden
 * cizilir - uygulamayi yeniden baslatmak gerekmez.
 */
export function useColorSchemeName(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  return themes[useColorSchemeName()];
}

export function useColors(): Palette {
  return useTheme().colors;
}

/**
 * Temaya bagli StyleSheet. Fabrika iki palet icin modul yuklenirken bir kez
 * calisir (iki hazir sayfa); donen hook o anki temanin sayfasini verir, render
 * sirasinda hicbir sey olusturmaz.
 *
 *   const useStyles = createThemedStyles((colors) => ({ root: { backgroundColor: colors.background } }));
 *   function Screen() { const styles = useStyles(); ... }
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: Palette) => T & StyleSheet.NamedStyles<any>,
): () => T {
  const sheets: Record<ColorScheme, T> = {
    light: StyleSheet.create(factory(lightColors)),
    dark: StyleSheet.create(factory(darkColors)),
  };
  return function useStyles(): T {
    return sheets[useColorSchemeName()];
  };
}
