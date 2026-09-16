import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackdrop, Button, Logo } from '@/components';
import { colors, spacing, typography } from '@/theme';
import { getRunningUpdateLabel } from '@/utils/buildInfo';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <AuthBackdrop
        source={require('../../../assets/images/auth/welcome-hero.jpg')}
        contentPosition="center"
      />

      {/* Icerik alt yariya toplaniyor: fotografin ust yarisi (sarj eden kisi)
          acik kaliyor, metin ise perdenin en koyu bolgesine oturuyor. */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.spacer} />

        <Animated.View entering={FadeInDown.delay(120).duration(460)}>
          <View accessibilityRole="image" accessibilityLabel="TORA WATT">
            <Logo width={208} color={colors.white} accentColor={colors.primary} />
          </View>

          <Text style={styles.tagline} maxFontSizeMultiplier={1.3}>
            Enerjine bağlan.
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            Bul. Bağlan. Devam et. Elektrikli aracın için en yakın şarj noktası birkaç dokunuş
            uzağında.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(320).duration(420)} style={styles.actions}>
          <Button label="Hadi başlayalım" onPress={() => router.push('/register')} />
          <Button
            label="Zaten hesabım var"
            variant="secondary"
            style={styles.secondaryAction}
            onPress={() => router.push('/login')}
          />
          <Text style={styles.footer}>TORA WATT · {getRunningUpdateLabel()}</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.heroDark },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  spacer: { flex: 1 },

  tagline: { ...typography.h1, color: colors.white, marginTop: spacing.xxl },
  subtitle: { ...typography.body, color: 'rgba(255, 255, 255, 0.84)', marginTop: spacing.md },

  actions: { paddingTop: spacing.xxxl, paddingBottom: spacing.lg },
  secondaryAction: { marginTop: spacing.md },
  footer: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.62)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
