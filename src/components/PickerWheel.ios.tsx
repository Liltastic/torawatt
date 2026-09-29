import { Host, Picker, Text as NativeText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import type { PickerWheelProps } from './PickerWheel';

/**
 * iOS'un kendi tekerlek secicisi.
 *
 * `@expo/ui` SDK 56'dan beri Expo Go'da da var, yani gelistirme akisi
 * degismiyor. Yalnizca iOS'ta yukleniyor: Metro bu `.ios.tsx` dosyasini
 * yalnizca iPhone icin seciyor, Android ve web yanindaki stub'i aliyor
 * (bkz. PickerWheel.tsx - gerekcesi orada).
 */
export function PickerWheel({ options, value, onChange, style }: PickerWheelProps) {
  return (
    <Host style={style}>
      <Picker
        selection={value}
        onSelectionChange={(selected) => onChange(String(selected))}
        modifiers={[pickerStyle('wheel')]}>
        {options.map((option) => (
          <NativeText key={option} modifiers={[tag(option)]}>
            {option}
          </NativeText>
        ))}
      </Picker>
    </Host>
  );
}
