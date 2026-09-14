import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { colors, radius, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
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
          <Text style={styles.title}>Tekrar hoş geldin</Text>
          <Text style={styles.subtitle}>Hesabınla giriş yap, kaldığın yerden devam et.</Text>

          <View style={styles.form}>
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
              autoComplete="password"
              placeholder="••••••••"
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button label="Giriş yap" onPress={onSubmit} loading={submitting} style={styles.submit} />

          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.replace('/register')}
            style={styles.switchLink}>
            <Text style={styles.switchText}>
              Hesabın yok mu? <Text style={styles.switchTextStrong}>Kayıt ol</Text>
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
