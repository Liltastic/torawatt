import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type Ref } from 'react';
import { Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';

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
  /**
   * Koyu bir zeminin (giris/kayit ekranlarindaki tam ekran fotograf) uzerinde
   * kullanildiginda: beyaz metin, saydam alan, acik kenarlik.
   */
  onDark?: boolean;
  /** Ust bilesenin odagi yonetebilmesi icin (ornegin "ileri" ile sonraki alana gecis). */
  ref?: Ref<TextInput>;
}

export function TextField({
  label,
  error,
  suffix,
  leadingIcon,
  secureToggle,
  onDark,
  secureTextEntry,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const colors = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const secure = secureToggle ? hidden : secureTextEntry;

  const dangerColor = onDark ? colors.dangerOnDark : colors.dangerText;
  const iconColor = error
    ? dangerColor
    : focused
      ? onDark
        ? colors.primary
        : colors.primaryStrong
      : onDark
        ? 'rgba(255, 255, 255, 0.62)'
        : colors.textTertiary;

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
      <Text style={[styles.label, onDark && styles.labelOnDark]}>{label}</Text>

      {/* Odak ve hata yalnizca rengi degistirir; kenarlik kalinligi sabit, yani yerlesim oynamaz. */}
      <View
        style={[
          styles.inputWrap,
          onDark && styles.inputWrapOnDark,
          focused && (onDark ? styles.inputWrapFocusedOnDark : styles.inputWrapFocused),
          !!error && (onDark ? styles.inputWrapErrorOnDark : styles.inputWrapError),
        ]}>
        {!!leadingIcon && (
          <Ionicons name={leadingIcon} size={18} color={iconColor} style={styles.leadingIcon} />
        )}
        <TextInput
          ref={ref}
          style={[styles.input, onDark && styles.inputOnDark]}
          placeholderTextColor={onDark ? 'rgba(255, 255, 255, 0.62)' : colors.textTertiary}
          accessibilityLabel={label}
          secureTextEntry={secure}
          // Goz ikonuyla sifre gorunur yapilinca alan siradan bir metin alanina
          // donuyor ve klavye kelime onerisi sunup sifreyi "ogrenebiliyordu".
          // Oneriye dokunmak birden cok karakteri tek hamlede ekledigi icin giris
          // ekranindaki otomatik doldurma algisini da yanlis tetiklerdi.
          // iOS autoCorrect/spellCheck'i dinliyor. Android dinlemiyor (olculdu:
          // Gboard kapaliyken de oneri gosterdi); orada standart yol gorunur
          // sifre klavye tipi - klavyeler onu sifre sayip oneri ve ogrenmeyi kapatir.
          autoCorrect={secureToggle ? false : undefined}
          spellCheck={secureToggle ? false : undefined}
          keyboardType={
            secureToggle && !hidden && Platform.OS === 'android' ? 'visible-password' : undefined
          }
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {!!suffix && <Text style={[styles.suffix, onDark && styles.labelOnDark]}>{suffix}</Text>}
        {secureToggle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            hitSlop={6}
            onPress={() => setHidden((value) => !value)}
            style={styles.eye}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={onDark ? 'rgba(255, 255, 255, 0.78)' : colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {!!error && <Text style={[styles.error, { color: dangerColor }]}>{error}</Text>}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  labelOnDark: { color: 'rgba(255, 255, 255, 0.78)' },
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
  // Saydam BEYAZ degil, saydam KOYU: alanin kontrasti fotografin altindaki
  // bolgeye gore degismesin, acik bir zemine denk geldiginde sinirlari
  // kaybolmasin.
  inputWrapOnDark: {
    backgroundColor: 'rgba(7, 30, 26, 0.58)',
    borderColor: 'rgba(255, 255, 255, 0.34)',
  },
  // Odak cercevesi beyaz alanda en az 3:1 olmali: parlak turkuaz 2.6'da kaliyordu.
  inputWrapFocused: { borderColor: colors.primaryStrong },
  // Fotograf perdesinin uzerinde parlak turkuaz zaten yuksek kontrastli.
  inputWrapFocusedOnDark: { borderColor: colors.primary },
  inputWrapError: { borderColor: colors.danger },
  inputWrapErrorOnDark: { borderColor: colors.dangerOnDark },
  leadingIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    // Android'de TextInput'un varsayilan dikey padding'i hizalamayi bozuyor.
    paddingVertical: 0,
  },
  inputOnDark: { color: colors.white },
  suffix: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm },
  // 44x44 dokunma hedefi; alanin ic bosluguna tasarak sagdaki 16dp'yi geri kazanir.
  eye: {
    width: 44,
    height: 44,
    marginRight: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { ...typography.caption, marginTop: spacing.xs },
}));
