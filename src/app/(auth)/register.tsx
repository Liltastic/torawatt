import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_HERO_SMALL, AuthHero, Button, TextField, useAuthKeyboard } from '@/components';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;
const SUBTITLE = 'Birkaç saniyede kaydol, aracını ve favorilerini kaydet.';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const register = useAuthStore((s) => s.register);
  const { kb, onFieldFocus, onScrollBeginDrag } = useAuthKeyboard();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    // Klavye kapansin ki hero geri acilsin ve hata satiri tam gorunen sayfada belirsin.
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }

    setError(undefined);
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
      router.replace('/map');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kayıt başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Fotograf saydam durum cubugunun altina cizilir; simgeler acik renk olmali. */}
      <StatusBar style="light" />

      <AuthHero
        source={require('../../../assets/images/auth/register-hero.jpg')}
        contentPosition="center"
        eyebrow="YENİ HESAP"
        title="Hesap oluştur."
        subtitle={SUBTITLE}
        onBack={() => router.back()}
        kb={kb}
      />

      {/* KeyboardAvoidingView BILEREK yok: iOS'ta alt dolgusunu JavaScript
          tarafinda animasyonluyor, yani klavye her acilip kapandiginda kare
          basina bir yerlesim hesabi daha cikiyordu - hero'nun kendi yukseklik
          animasyonuyla ust uste. automaticallyAdjustKeyboardInsets ayni isi
          UIScrollView'in icinde yapiyor. Android'de zaten adjustResize
          pencereyi kucultuyor, bu prop orada yok sayiliyor. */}
      <ScrollView
        style={styles.flex}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        onScrollBeginDrag={onScrollBeginDrag}>
        {AUTH_HERO_SMALL && <Text style={styles.smallSubtitle}>{SUBTITLE}</Text>}

        <Animated.View entering={FadeInUp.delay(200).duration(380)}>
          <TextField
            label="Ad (opsiyonel)"
            leadingIcon="person-outline"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            placeholder="Adın"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
            onFocus={onFieldFocus}
          />
          <TextField
            ref={emailRef}
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
            onFocus={onFieldFocus}
          />
          <TextField
            ref={passwordRef}
            label="Şifre"
            leadingIcon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
            placeholder="En az 8 karakter"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            onFocus={onFieldFocus}
          />
        </Animated.View>

        {!!error && (
          <Animated.View
            entering={FadeInDown.duration(220)}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(300).duration(380)}>
          <Button
            label="Hesap oluştur"
            onPress={onSubmit}
            loading={submitting}
            style={styles.submit}
            trailingIcon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
          />

          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.replace('/login')}
            style={styles.switchLink}>
            <Text style={styles.switchText}>
              Zaten hesabın var mı? <Text style={styles.switchTextStrong}>Giriş yap</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  smallSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },

  // Alanlar kendi 16dp alt paylarini tasir; satir son alanin 12dp altina oturur.
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: -spacing.xs,
  },
  errorIcon: { marginRight: spacing.sm, marginTop: 1 },
  errorText: { ...typography.caption, color: colors.text, flex: 1 },

  // Hata satiri olsun olmasin sabit: altindaki hicbir sey kaymaz.
  submit: { marginTop: spacing.lg },

  switchLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  switchText: { ...typography.body, color: colors.textSecondary },
  switchTextStrong: { color: colors.primaryText, fontWeight: '700' },
});
