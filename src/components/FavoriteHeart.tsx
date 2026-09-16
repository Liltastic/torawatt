import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

interface FavoriteHeartProps {
  active: boolean;
  size: number;
}

/**
 * Favori kalbi. Favoriye EKLENDIGI anda kisa bir sisip yerine oturma yapar;
 * cikarilirken sessiz kalir (vazgecmek kutlanacak bir sey degil). Ekran zaten
 * favori olan bir istasyonla acildiginda da oynamaz.
 *
 * Buton kendi basma olcegini (AnimatedPressable) ayrica uyguluyor; bu yalnizca
 * ikonu olcekliyor, ikisi ust uste binebilir.
 */
export function FavoriteHeart({ active, size }: FavoriteHeartProps) {
  const scale = useSharedValue(1);
  const wasActive = useRef(active);

  useEffect(() => {
    const becameActive = !wasActive.current && active;
    wasActive.current = active;
    if (!becameActive) return;

    scale.set(
      withSequence(
        withTiming(1.35, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0.92, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [active, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Ionicons
        name={active ? 'heart' : 'heart-outline'}
        size={size}
        color={active ? colors.danger : colors.text}
      />
    </Animated.View>
  );
}
