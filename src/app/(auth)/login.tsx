import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AuthLayout, Button, TextField } from '@/components';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { createThemedStyles, spacing, typography, useColors } from '@/theme';

/**
 * Kayitli sifreyle otomatik giris.
 *
 * iOS (iCloud Anahtar Zinciri, Face ID/Touch ID sonrasi) ve Android (Google
 * Sifre Yoneticisi ya da Samsung Pass, parmak izi/yuz/PIN sonrasi) kayitli
 * bilgiyi alanlara TEK HAMLEDE yazar. Uygulamaya bu "otomatik dolduruldu" diye
 * bildirilmiyor; ayirt edebildigimiz tek sey sifrenin bir anda gelmesi.
 *
 * Bu yuzden: sifre alanina tek bir degisiklikte en az AUTOFILL_MIN_CHARS
 * karakter eklenirse giris kendiliginden baslar. Elle yazim her tusta bir
 * karakter ekler; hizli yazimda iki vurus tek olaya birlesebilir, dort
 * karakterlik esik bunu guvenle disarida birakir. Guvenli alanda klavye kelime
 * onerisi de sunmaz, yani baska bir kaynak yok. Yapistirma da ayni sekilde
 * gorunur ve o da otomatik girer - kullanicinin niyeti zaten bu.
 *
 * Kayit ekraninda BILEREK yok: orada tek hamlede gelen sifre sistemin "guclu
 * sifre" onerisi olur ve hesap, kullanici formu gozden gecirmeden acilirdi.
 */
const AUTOFILL_MIN_CHARS = 4;
/**
 * Sistem e-postayi ve sifreyi ayri olaylarla, sirasi platforma gore degisen
 * sekilde veriyor. Gondermeden once ikisinin de yerine oturmasini bekliyoruz.
 */
const AUTOFILL_SETTLE_MS = 350;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function LoginScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Zamanlayici geri cagrisi kuruldugu render'in state'ini gorur; son yazilan
  // degerleri buradan okuyoruz.
  const latest = useRef({ email: '', password: '' });
  // Klavyedeki "Git" tusu, buton ve otomatik giris ayni anda tetiklenirse tek
  // istek gitsin.
  const inFlight = useRef(false);
  const autoSubmitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(autoSubmitTimer.current), []);

  const submit = async (emailValue: string, passwordValue: string) => {
    if (inFlight.current) return;
    // Klavye kapansin ki hata satiri tam gorunen sayfada belirsin.
    Keyboard.dismiss();
    if (!emailValue.trim() || !passwordValue) {
      setError('E-posta ve şifre gerekli.');
      return;
    }

    inFlight.current = true;
    setError(undefined);
    setSubmitting(true);
    try {
      await login(emailValue.trim(), passwordValue);
      router.replace('/map');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Giriş başarısız.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const onSubmit = () => {
    clearTimeout(autoSubmitTimer.current);
    void submit(email, password);
  };

  const handleEmailChange = (value: string) => {
    latest.current.email = value;
    setEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    const previous = latest.current.password;
    latest.current.password = value;
    setPassword(value);

    if (value.length - previous.length < AUTOFILL_MIN_CHARS) return;

    clearTimeout(autoSubmitTimer.current);
    autoSubmitTimer.current = setTimeout(() => {
      const current = latest.current;
      // Bu arada kullanici sifreyi silmis ya da e-posta hic gelmemis olabilir.
      if (!EMAIL_PATTERN.test(current.email.trim())) return;
      if (current.password.length < AUTOFILL_MIN_CHARS) return;
      void submit(current.email, current.password);
    }, AUTOFILL_SETTLE_MS);
  };

  return (
    <AuthLayout
      source={require('../../../assets/images/auth/login-hero.jpg')}
      contentPosition="center"
      eyebrow="ELEKTRİKLİ ŞARJ AĞI"
      title="Tekrar hoş geldin."
      subtitle="Hesabınla giriş yap, kaldığın yerden devam et."
      onBack={() => router.back()}>
      <Animated.View entering={FadeInUp.delay(200).duration(380)}>
        <TextField
          onDark
          label="E-posta"
          leadingIcon="mail-outline"
          value={email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          placeholder="ornek@eposta.com"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
        />
        <TextField
          onDark
          ref={passwordInputRef}
          label="Şifre"
          leadingIcon="lock-closed-outline"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          secureToggle
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </Animated.View>

      {!!error && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={colors.dangerOnDark}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.delay(300).duration(380)}>
        <Button
          label="Giriş yap"
          onPress={onSubmit}
          loading={submitting}
          style={styles.submit}
          trailingIcon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
        />

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.replace('/register')}
          style={styles.switchLink}>
          <Text style={styles.switchText}>
            Hesabın yok mu? <Text style={styles.switchTextStrong}>Kayıt ol</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </AuthLayout>
  );
}

const useStyles = createThemedStyles((colors) => ({
  // Alanlar kendi 16dp alt paylarini tasir; satir son alanin 12dp altina oturur.
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 77, 109, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 143, 163, 0.45)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: -spacing.xs,
  },
  errorIcon: { marginRight: spacing.sm, marginTop: 1 },
  errorText: { ...typography.caption, color: colors.white, flex: 1 },

  // Hata satiri olsun olmasin sabit: altindaki hicbir sey kaymaz.
  submit: { marginTop: spacing.lg },

  switchLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  switchText: { ...typography.body, color: 'rgba(255, 255, 255, 0.82)' },
  switchTextStrong: { color: colors.primaryOnDark, fontWeight: '700' },
}));
