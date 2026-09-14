import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { BottomTabBarProps } from 'expo-router/tabs';

import { colors, radius, shadows, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

import { GlassSurface } from './GlassSurface';

/** Yuzen hapin yuksekligi; disaridan (screen icerigi icin) bir sey degismesi gerekmez -
 * bu bilesenin kendi kok konteynerinin normal akis yuksekligi zaten bu alani ayirtiyor. */
const BAR_HEIGHT = 56;
const BAR_GAP = 10;
const INDICATOR_SIZE = 48;

/**
 * iOS 26 "Liquid Glass" estetiginde yuzen, hap seklinde sekme cubugu.
 * Aktif sekmenin arkasinda konumu/genisligi container'a gore hesaplanan bir
 * "blob" yumusakca kayarak gecer (react-native-reanimated ile).
 */
export function GlassTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const activeIndex = useSharedValue(state.index);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, { damping: 20, stiffness: 220, mass: 0.6 });
  }, [state.index, activeIndex]);

  const itemWidth = rowWidth / Math.max(state.routes.length, 1);

  const indicatorStyle = useAnimatedStyle(() => {
    if (!rowWidth) return { opacity: 0 };
    const x = activeIndex.value * itemWidth + (itemWidth - INDICATOR_SIZE) / 2;
    return { opacity: 1, transform: [{ translateX: x }] };
  });

  const onRowLayout = (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { height: insets.bottom + BAR_GAP + BAR_HEIGHT }]}>
      <GlassSurface style={[styles.bar, { marginBottom: insets.bottom + BAR_GAP }]}>
        <Animated.View
          style={[styles.indicator, { width: INDICATOR_SIZE, height: INDICATOR_SIZE }, indicatorStyle]}
        />
        <View style={styles.row} onLayout={onRowLayout}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const tintColor = isFocused ? colors.primaryDark : colors.textTertiary;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                haptics.selection();
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={typeof options.title === 'string' ? options.title : route.name}
                onPress={onPress}
                style={styles.item}>
                {options.tabBarIcon?.({ focused: isFocused, color: tintColor, size: 22 })}
                {!!options.title && (
                  <Text style={[styles.label, { color: tintColor }]} numberOfLines={1}>
                    {options.title}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: spacing.xl, justifyContent: 'flex-end' },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radius.chip,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    ...Platform.select({
      ios: shadows.sheet,
      android: { elevation: 8 },
    }),
  },
  row: { flex: 1, flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - INDICATOR_SIZE) / 2,
    borderRadius: radius.chip,
    backgroundColor: colors.primarySoft,
  },
});
