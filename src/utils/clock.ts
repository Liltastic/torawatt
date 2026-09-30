import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Belirli araliklarla yenilenen "su an" (ms).
 *
 * Cizim sirasinda dogrudan Date.now() cagirmak React Compiler acisindan SAF
 * OLMAYAN bir islem: derleyici bileseni bagimliliklarina gore onbellege aliyor,
 * Date.now()'un ise bagimliligi yok. Deger ilk cizimde donup kalabiliyor -
 * geri sayim duruyor, "15 dakika sonra" dakikalar once demeye basliyor. Zamani
 * state'e tasiyinca gercek bir bagimlilik oluyor ve ekran gercekten yenileniyor.
 *
 * Uygulama arkaya atildiginda sistem zamanlayicilari kisitliyor; one gelince
 * bir sonraki tigi beklemeden guncelliyoruz ki kullanici eski bir saat
 * gormesin.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
