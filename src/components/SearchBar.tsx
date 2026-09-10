import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  containerStyle?: StyleProp<ViewStyle>;
  /** Sagda gosterilecek aksiyon (ornegin filtre butonu). */
  trailing?: React.ReactNode;
}

export function SearchBar({ containerStyle, trailing, ...rest }: SearchBarProps) {
  return (
    <View style={[styles.container, shadows.card, containerStyle]}>
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

const styles = StyleSheet.create({
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
  input: {
    flex: 1,
    marginLeft: spacing.md,
    ...typography.body,
    color: colors.text,
    // Android'de TextInput'un varsayilan dikey padding'i hizalamayi bozuyor.
    paddingVertical: 0,
  },
});
