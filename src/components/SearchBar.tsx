import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { createThemedStyles, radius, shadows, spacing, typography, useColors } from '@/theme';
import { GLASS_ENABLED } from '@/utils/glass';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  containerStyle?: StyleProp<ViewStyle>;
  /** Sagda gosterilecek aksiyon (ornegin filtre butonu). */
  trailing?: React.ReactNode;
  /**
   * Haritanin ustunde: iOS 26+'da zemin Liquid Glass olur. Android'de ve eski
   * iOS'ta hicbir sey degismez, markali beyaz yuzey kalir.
   */
  glass?: boolean;
}

export function SearchBar({ containerStyle, trailing, glass = false, ...rest }: SearchBarProps) {
  const colors = useColors();
  const styles = useStyles();
  const useGlass = glass && GLASS_ENABLED;

  return (
    <View style={[styles.container, useGlass ? styles.containerGlass : shadows.card, containerStyle]}>
      {useGlass && (
        <GlassView pointerEvents="none" glassEffectStyle="regular" style={styles.glass} />
      )}
      <Ionicons name="search" size={19} color={colors.textSecondary} />
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        {...rest}
      />
      {trailing}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.search,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Cam kendi derinligini ve kenarini ciziyor: dolgu, kenarlik ve golge kalkar.
  containerGlass: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.search,
  },
  input: {
    flex: 1,
    marginLeft: spacing.md,
    ...typography.body,
    color: colors.text,
    // Android'de TextInput'un varsayilan dikey padding'i hizalamayi bozuyor.
    paddingVertical: 0,
  },
}));
