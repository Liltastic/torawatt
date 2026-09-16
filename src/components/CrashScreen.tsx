import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createThemedStyles, monoFont, radius, spacing, typography, useColors } from '@/theme';

interface CrashScreenProps {
  /** Teknik hata mesaji; kullanici ekran goruntusu paylastiginda ise yarasin diye kucuk puntoyla. */
  message?: string;
  onRetry: () => void;
}

/**
 * Bir ekran cizilirken hata firlatinca uygulamanin yerine gecen ekran (bkz.
 * app/_layout.tsx ErrorBoundary). Hata bu ekran gorunmeden once kayda
 * gonderilmis oluyor.
 *
 * Bilerek yalnizca temel bilesenlerle yazildi: Button gibi uygulama
 * bilesenlerini kullansaydi ve hatanin kaynagi o bilesen olsaydi, bu ekran da
 * cizilemezdi.
 */
export function CrashScreen({ message, onRetry }: CrashScreenProps) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="auto" />

      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.dangerText} />
        </View>
        <Text style={styles.title}>Bir şeyler ters gitti</Text>
        <Text style={styles.text}>
          Bu ekranda beklenmedik bir hata oluştu ve kaydedildi. Tekrar denemek çoğu zaman sorunu
          çözer.
        </Text>
        {!!message && (
          <Text style={styles.detail} numberOfLines={3} selectable>
            {message}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <Ionicons name="refresh" size={18} color={colors.white} />
        <Text style={styles.buttonLabel}>Tekrar dene</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.xxl, textAlign: 'center' },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  detail: {
    ...typography.caption,
    fontFamily: monoFont,
    color: colors.textTertiary,
    marginTop: spacing.lg,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.primaryStrong,
    marginBottom: spacing.lg,
  },
  buttonPressed: { backgroundColor: colors.primaryStrongPressed },
  buttonLabel: { ...typography.body, fontWeight: '600', color: colors.white, marginLeft: spacing.sm },
}));
