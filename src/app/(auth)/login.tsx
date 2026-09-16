import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AuthLayout, Button, TextField } from '@/components';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    // Klavye kapansin ki hata satiri tam gorunen sayfada belirsin.
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/map');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Giriş başarısız.');
    } finally {
      setSubmitting(false);
    }
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
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          placeholder="ornek@eposta.com"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          onDark
          ref={passwordRef}
          label="Şifre"
          leadingIcon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
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

const styles = StyleSheet.create({
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
});
