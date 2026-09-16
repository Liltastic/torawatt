import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

const TRACK_PADDING = 3;
const SLIDE = { duration: 260, easing: Easing.out(Easing.cubic) } as const;

/**
 * Istasyon detayindaki sekme benzeri bolum secici (spec disi, referans tasarimdan).
 *
 * Secili zemin tek bir parca: secim degisince eskisinden yenisine
 * altindan kayar, yazi renkleri de ona gore gecis yapar. Onceden zemin her
 * segmentin kendi stiliydi ve bir kareden digerine zipliyordu. Yalnizca
 * transform ve renk canlaniyor; genislik olculene kadar (ilk kare) zemin
 * eskisi gibi secili segmentin kendisine cizilir ki bos bir kare gorunmesin.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const styles = useStyles();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [segmentWidth, setSegmentWidth] = useState(0);
  const position = useSharedValue(selectedIndex);

  useEffect(() => {
    position.set(withTiming(selectedIndex, SLIDE));
  }, [selectedIndex, position]);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setSegmentWidth((event.nativeEvent.layout.width - TRACK_PADDING * 2) / options.length);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * segmentWidth }],
  }));

  const measured = segmentWidth > 0;

  return (
    <View style={[styles.track, style]} onLayout={onTrackLayout}>
      {measured && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: segmentWidth }, indicatorStyle]}
        />
      )}

      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <AnimatedPressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            haptic="selection"
            scaleTo={0.97}
            onPress={() => onChange(option.value)}
            style={[styles.segment, !measured && selected && styles.segmentSelected]}>
            <SegmentLabel label={option.label} index={index} position={position} />
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

/** Zemin ustune geldikce koyulasan etiket; zeminle ayni degerden besleniyor. */
function SegmentLabel({
  label,
  index,
  position,
}: {
  label: string;
  index: number;
  position: SharedValue<number>;
}) {
  const colors = useColors();
  const styles = useStyles();
  const labelStyle = useAnimatedStyle(() => {
    const closeness = 1 - Math.min(1, Math.abs(position.value - index));
    return { color: interpolateColor(closeness, [0, 1], [colors.textSecondary, colors.text]) };
  });

  return <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>;
}

const useStyles = createThemedStyles((colors) => ({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.button,
    padding: TRACK_PADDING,
  },
  // Golge yalnizca iOS'ta: Android'de elevation cizim sirasini degistirip
  // zemini etiketlerin USTUNE cikarirdi.
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radius.button - TRACK_PADDING,
    backgroundColor: colors.surfaceRaised,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.button - TRACK_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.surfaceRaised,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
}));
