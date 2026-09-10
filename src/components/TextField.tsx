import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Dogrulama hatasi; verildiginde alan kirmiziya doner. */
  error?: string;
  /** Birim etiketi, ornegin "kWh". */
  suffix?: string;
}

export function TextField({ label, error, suffix, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label}
          {...rest}
        />
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
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
  inputWrapError: { borderColor: colors.danger },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    // Android'de TextInput'un varsayilan dikey padding'i hizalamayi bozuyor.
    paddingVertical: 0,
  },
  suffix: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});
