import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { colors, radius, spacing, typography } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
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
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Hesap oluştur</Text>
          <Text style={styles.subtitle}>Birkaç saniyede kaydol, aracını ve favorilerini kaydet.</Text>

          <View style={styles.form}>
            <TextField
              label="Ad (opsiyonel)"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              placeholder="Adın"
            />
            <TextField
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="ornek@eposta.com"
            />
            <TextField
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              placeholder="En az 8 karakter"
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button label="Hesap oluştur" onPress={onSubmit} loading={submitting} style={styles.submit} />

          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.replace('/login')}
            style={styles.switchLink}>
            <Text style={styles.switchText}>
              Zaten hesabın var mı? <Text style={styles.switchTextStrong}>Giriş yap</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },

  form: { marginTop: spacing.xxl },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  submit: { marginTop: spacing.xl },

  switchLink: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  switchText: { ...typography.body, color: colors.textSecondary },
  switchTextStrong: { color: colors.primaryDark, fontWeight: '700' },
});
