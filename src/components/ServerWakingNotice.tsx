import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { onServerWaking } from '@/services/api';
import { createThemedStyles, spacing, typography, useColors } from '@/theme';

/**
 * "Sunucu uyaniyor" notu.
 *
 * API Render'in ucretsiz katmaninda ve 15 dk istek almayinca uyuyor; uyanmasi
 * bir dakikayi, kotu gunde birkac dakikayi buluyor (bkz. services/api.ts
 * COLD_TIMEOUT_MS). Not olmadan kullanici yalnizca donen bir dugme goruyor ve
 * uygulamayi bozuk saniyor - ilk yayinda da tam olarak bu oldu.
 *
 * Yalnizca uyuyor saydigimiz sunucuya giden istek 10 saniyeyi asinca cikiyor;
 * normal bir istek sirasinda hic gorunmuyor.
 */
export function ServerWakingNotice() {
  const colors = useColors();
  const styles = useStyles();
  const [waking, setWaking] = useState(false);

  useEffect(() => onServerWaking(setWaking), []);

  if (!waking) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.row}>
      <Ionicons name="time-outline" size={16} color={colors.white} style={styles.icon} />
      <Text style={styles.text}>
        Sunucu uyanıyor, bu ilk açılışta bir dakikayı bulabilir. Bekle, sayfadan çıkma.
      </Text>
    </Animated.View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  // Hata satiriyla ayni gecerli olcular, farkli renk: bu bir ariza degil,
  // beklenen bir gecikme (bkz. (auth)/login.tsx errorRow).
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: -spacing.xs,
  },
  icon: { marginRight: spacing.sm, marginTop: 1 },
  text: { ...typography.caption, color: colors.white, flex: 1 },
}));
