import { forwardRef, useCallback, useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fireHaptic, type HapticKind } from '@/utils/haptics';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

// Yay yerine kisa bir timing egrisi kullaniyoruz: spring'in geri sekmesi
// (overshoot) butonlari "zipliyor/sallaniyor" hissettiriyordu. Basarken hizli
// kuculme, birakinca biraz daha yumusak donus - sicrama yok.
const PRESS_IN = { duration: 100, easing: Easing.out(Easing.quad) } as const;
const PRESS_OUT = { duration: 180, easing: Easing.out(Easing.quad) } as const;

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Basili tutuldugunda ulasilacak olcek; 1'e yakin degerler daha "hafif" hisseder. */
  scaleTo?: number;
  /** onPress tetiklendiginde calisacak titresim turu. Devre disi butonlarda tetiklenmez. */
  haptic?: HapticKind;
}

/**
 * Uygulama genelindeki dokunsal geri bildirim ve "basinca kucul" animasyonunun
 * tek kaynagi. Var olan bilesenler Pressable yerine bunu kullaniyor; boylece
 * her buton/kart ayni fiziksel hissi (yay sabitleri) ve titresim davranisini
 * paylasiyor.
 */
export const AnimatedPressable = forwardRef<View, AnimatedPressableProps>(function AnimatedPressable(
  { style, scaleTo = 0.97, haptic = 'tap', disabled, onPressIn, onPressOut, onPress, ...rest },
  ref,
) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  // Olcek animasyonu shared value uzerinden dondugu icin `pressed` state'i
  // yalnizca fonksiyon-stil cozumlemesinde okunuyor. Duz stil nesnesi verilen
  // kullanimlarda (cogunluk) state'i guncellemek her dokunusta gorsel karsiligi
  // olmayan iki React render'i uretiyordu.
  const usesPressedStyle = typeof style === 'function';

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withTiming(scaleTo, PRESS_IN);
      if (usesPressedStyle) setPressed(true);
      onPressIn?.(event);
    },
    [onPressIn, scale, scaleTo, usesPressedStyle],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withTiming(1, PRESS_OUT);
      if (usesPressedStyle) setPressed(false);
      onPressOut?.(event);
    },
    [onPressOut, scale, usesPressedStyle],
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled) fireHaptic(haptic);
      onPress?.(event);
    },
    [disabled, haptic, onPress],
  );

  const resolvedStyle = usesPressedStyle ? style({ pressed }) : style;

  return (
    <ReanimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[resolvedStyle, animatedStyle]}
      {...rest}
    />
  );
});
