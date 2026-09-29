export interface PickerWheelProps {
  options: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  style?: { height: number; marginBottom: number };
}

/**
 * iOS disindaki platformlarda tekerlek yok; PickerField zaten liste dalini
 * ciziyor (bkz. PickerField). Bu dosyanin var olmasinin sebebi paketleyici:
 * gercek tekerlek `@expo/ui`'nin SwiftUI baglamasini kullaniyor ve o modul
 * web'de `requireNativeViewManager` ile patliyordu - `eas update` disa
 * aktarimi web'i de kapsadigi icin yayin tamamen dusuyordu.
 *
 * Metro `.ios.tsx` varyantini yalnizca iOS'ta seciyor, dolayisiyla Android ve
 * web bu dosyayi alip `@expo/ui`'yi hic gormuyor.
 */
export function PickerWheel(_props: PickerWheelProps) {
  return null;
}
