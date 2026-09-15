import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Dogrulama hatasi; verildiginde alan kirmiziya doner. */
  error?: string;
  /** Birim etiketi, ornegin "kWh". */
  suffix?: string;
  /** Alanin solunda gosterilen ikon; odakta ana renge, hatada kirmiziya doner. */
  leadingIcon?: IconName;
  /**
   * secureTextEntry ile birlikte: sifreyi goster/gizle dugmesi ekler ve
   * gizlilik durumunu alan kendisi yonetir.
   */
  secureToggle?: boolean;
  /** Ust bilesenin odagi yonetebilmesi icin (ornegin "ileri" ile sonraki alana gecis). */
  ref?: Ref<TextInput>;
}

export function TextField({
  label,
  error,
  suffix,
  leadingIcon,
  secureToggle,
  secureTextEntry,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const secure = secureToggle ? hidden : secureTextEntry;
  const iconColor = error ? colors.danger : focused ? colors.primary : colors.textTertiary;

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setFocused(true);
    onFocus?.(event);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      {/* Odak ve hata yalnizca rengi degistirir; kenarlik kalinligi sabit, yani yerlesim oynamaz. */}
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, !!error && styles.inputWrapError]}>
        {!!leadingIcon && (
          <Ionicons name={leadingIcon} size={18} color={iconColor} style={styles.leadingIcon} />
        )}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label}
          secureTextEntry={secure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {secureToggle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            hitSlop={6}
            onPress={() => setHidden((value) => !value)}
            style={styles.eye}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputWrapFocused: { borderColor: colors.primary },
  inputWrapError: { borderColor: colors.danger },
  leadingIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    // Android'de TextInput'un varsayilan dikey padding'i hizalamayi bozuyor.
    paddingVertical: 0,
  },
  suffix: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm },
  // 44x44 dokunma hedefi; alanin ic bosluguna tasarak sagdaki 16dp'yi geri kazanir.
  eye: {
    width: 44,
    height: 44,
    marginRight: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});
