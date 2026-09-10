import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#EEF2FF',
  surface: '#FFFFFF',
  text: '#0B0D12',
  textSecondary: '#687080',
  border: '#E7EAF0',
  primary: '#2F6BFF',
  primaryDark: '#1650E8',
  primarySoft: '#EAF0FF',
};

export default function WelcomeScreen() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <View style={styles.logoBlock}>
            <View style={styles.accentBar} />
            <Text style={styles.wordmarkTop}>TORA</Text>
            <Text style={styles.wordmarkBottom}>W A T T</Text>
          </View>

          <Text style={styles.tagline}>Enerjine bağlan.</Text>
          <Text style={styles.subtitle}>
            Bul. Bağlan. Devam et. Elektrikli aracın için en yakın şarj noktası birkaç dokunuş
            uzağında.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardBadge}>KURULUM TAMAM</Text>
          <Text style={styles.cardTitle}>Proje çalışıyor 🎉</Text>
          <Text style={styles.cardBody}>
            Expo + React Native + TypeScript + Expo Router hazır. Bu ekranı düzenlemek için{' '}
            <Text style={styles.code}>src/app/index.tsx</Text> dosyasını aç.
          </Text>
          <Text style={styles.platform}>Platform: {Platform.OS}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => setMessage('Buton çalışıyor — akışlar henüz bağlı değil.')}>
            <Text style={styles.primaryButtonText}>Hadi başlayalım</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={() => setMessage('Giriş ekranı henüz yok.')}>
            <Text style={styles.secondaryButtonText}>Zaten hesabım var</Text>
          </Pressable>

          <Text style={styles.footer}>{message ?? 'TORA WATT · v0.1.0 · dev build'}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 32,
  },
  logoBlock: {
    marginBottom: 28,
  },
  accentBar: {
    width: 56,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginBottom: 8,
  },
  wordmarkTop: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.text,
  },
  wordmarkBottom: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 6,
    color: colors.text,
    marginTop: 2,
  },
  tagline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 24,
  },
  cardBadge: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    color: colors.text,
  },
  platform: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textSecondary,
  },
  actions: {
    paddingBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: '#DCE6FF',
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
  },
});
