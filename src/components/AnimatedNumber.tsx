import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  /**
   * Sayiyi metne cevirir. Modul seviyesinde tanimli, KIMLIGI SABIT bir fonksiyon
   * olmali: her render'da yeni bir ok fonksiyonu verilirse gecis her seferinde
   * bastan baslar.
   */
  format: (value: number) => string;
  /** Bir degerden digerine gecis suresi. Sarj saniyede bir tikliyor; bundan kisa kalmali. */
  duration?: number;
}

/**
 * Deger degisince eski sayidan yenisine akarak gecen metin (sarj ekranindaki
 * kWh, tutar, guc ve yuzde).
 *
 * JS tarafinda sayiyor: metni UI thread'de degistirmenin tek yolu bir
 * TextInput'a animatedProps ile `text` basmak ve bunun yeni mimaride iOS'ta
 * calistigini cihazda dogrulayamiyoruz - takilsa sayilar donardi. Maliyet
 * kucuk tutuldu: yalnizca bu bilesen yeniden ciziliyor ve bicimlenmis metin
 * degismedikce hic ciziliyor (tek ondalikli bir kWh degeri bir gecisde yalnizca
 * birkac kez degisir).
 */
export function AnimatedNumber({ value, format, duration = 650, ...textProps }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState(() => format(value));
  // Ekranda o an gorunen sayi: yeni hedef gelince gecis tam buradan baslar,
  // yarim kalan bir gecis sicramadan devam eder.
  const shown = useRef(value);

  useEffect(() => {
    if (reduceMotion) {
      shown.current = value;
      return;
    }

    const from = shown.current;
    let startedAt: number | undefined;
    let frame = 0;

    const step = (now: number) => {
      startedAt ??= now;
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = from + (value - from) * eased;
      shown.current = current;
      const next = format(current);
      setText((previous) => (previous === next ? previous : next));
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, format, duration, reduceMotion]);

  return <Text {...textProps}>{reduceMotion ? format(value) : text}</Text>;
}
