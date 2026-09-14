import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Button, Logo } from '@/components';
import { colors, spacing, typography } from '@/theme';
import { getRunningUpdateLabel } from '@/utils/buildInfo';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.logoBlock}>
            <Logo width={220} />
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(140).duration(450)} style={styles.tagline}>
            Enerjine bağlan.
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(240).duration(450)} style={styles.subtitle}>
            Bul. Bağlan. Devam et. Elektrikli aracın için en yakın şarj noktası birkaç dokunuş
            uzağında.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInUp.delay(360).duration(450)} style={styles.actions}>
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
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'space-between',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { flex: 1, justifyContent: 'center' },
  logoBlock: { marginBottom: spacing.xxl + spacing.xs },
  tagline: { ...typography.h2, color: colors.text, marginBottom: spacing.md - 2 },
  subtitle: { ...typography.body, color: colors.textSecondary },

  actions: { paddingBottom: spacing.lg },
  secondaryAction: { marginTop: spacing.md },
  footer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
