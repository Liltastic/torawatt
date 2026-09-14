import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, EmptyState } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';
import {
  ensureNotificationPermission,
  getNotificationPermissionStatus,
  notificationsAvailable,
} from '@/utils/notifications';

type PermissionState = 'checking' | 'granted' | 'denied' | 'undetermined';

export default function NotificationsScreen() {
  const router = useRouter();
  const [permission, setPermission] = useState<PermissionState>('checking');

  const refresh = useCallback(async () => {
    if (!notificationsAvailable) return;
    const status = await getNotificationPermissionStatus();
    setPermission(status.granted ? 'granted' : status.canAskAgain ? 'undetermined' : 'denied');
  }, []);

  useEffect(() => {
    refresh();
    // Kullanici sistem ayarlarindan izin degistirip geri donduginde guncel kalsin.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const onEnable = async () => {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      const status = await getNotificationPermissionStatus();
      await refresh();
      if (!status.canAskAgain) {
        Linking.openSettings();
      }
      return;
    }
    await refresh();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.headerButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {!notificationsAvailable ? (
        <EmptyState
          icon="construct-outline"
          title="Bu sürümde henüz yok"
          description="Bildirimler, Expo Go üzerinden çalışan bu geliştirme sürümünde desteklenmiyor. Uygulama gerçek bir build olarak yayınlandığında burada açılıp kapatılabilecek."
          style={styles.emptyState}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card style={styles.card}>
              <View style={styles.statusRow}>
                <Ionicons
                  name={permission === 'granted' ? 'notifications' : 'notifications-off-outline'}
                  size={22}
                  color={permission === 'granted' ? colors.success : colors.textSecondary}
                />
                <Text style={styles.statusText}>
                  {permission === 'granted'
                    ? 'Bildirimler açık'
                    : permission === 'denied'
                      ? 'Bildirimler kapalı'
                      : 'Henüz izin verilmedi'}
                </Text>
              </View>

              {permission !== 'granted' && (
                <Button
                  label={permission === 'denied' ? 'Ayarları aç' : 'Bildirimleri aç'}
                  variant="secondary"
                  size="md"
                  onPress={onEnable}
                  style={styles.action}
                />
              )}
            </Card>
          </Animated.View>

          <Text style={styles.sectionTitle}>Hangi bildirimleri alırsın?</Text>
          <Card style={styles.card}>
            <InfoRow
              icon="calendar-outline"
              title="Rezervasyon başladı"
              description="Seçtiğin başlangıç saatinde, soketin ne kadar süre sana ayrıldığını hatırlatır."
            />
            <InfoRow
              icon="time-outline"
              title="Süre azalıyor"
              description="Bekleme süren dolmadan 5 dakika önce, rezervasyonun düşmemesi için uyarır."
              last
            />
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({
  icon,
  title,
  description,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.infoIcon} />
      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
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
  headerTitle: { ...typography.h3, color: colors.text },
  headerSpacer: { width: 40, height: 40 },

  emptyState: { flex: 1 },

  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xxl },
  card: { marginTop: spacing.lg },

  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { ...typography.bodyStrong, color: colors.text, marginLeft: spacing.sm },
  action: { marginTop: spacing.md, alignSelf: 'flex-start' },

  infoRow: { flexDirection: 'row', paddingVertical: spacing.md },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { marginTop: 2 },
  infoText: { flex: 1, marginLeft: spacing.md },
  infoTitle: { ...typography.bodyStrong, color: colors.text },
  infoDescription: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
