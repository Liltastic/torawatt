import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  LinearTransition,
} from 'react-native-reanimated';

import { AnimatedPressable, Button, Card, EmptyState, FilterChip } from '@/components';
import { demoCardCatalog } from '@/mocks/paymentCatalog';
import {
  useAddPaymentMethod,
  usePaymentMethods,
  useRemovePaymentMethod,
  useSetDefaultPaymentMethod,
} from '@/queries/paymentMethods';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Odeme yontemleri (spec bolum 12) - demo. */
export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { data: methods, isLoading } = usePaymentMethods();
  const addPaymentMethod = useAddPaymentMethod();
  const remove = useRemovePaymentMethod();
  const setDefault = useSetDefaultPaymentMethod();

  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();

  // Backend ucretsiz katmanda uyudugu icin bu istekler gercekten basarisiz
  // olabiliyor; sessiz kalinca kullaniciya hicbir sey olmamis gibi gorunuyordu.
  const failWith = (fallback: string) => (err: unknown) => {
    setError(err instanceof Error ? err.message : fallback);
    haptics.error();
  };

  // Ayni demo kart iki kez eklenmesin: katalogda kalanlar gosteriliyor.
  const availableCards = demoCardCatalog.filter(
    (card) => !(methods ?? []).some((m) => m.brand === card.brand && m.last4 === card.last4),
  );

  const confirmRemove = (id: string, label: string) =>
    Alert.alert('Kartı sil', `${label} kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          setError(undefined);
          remove.mutate(id, { onError: failWith('Kart silinemedi') });
        },
      },
    ]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={10}
            haptic="tap"
            onPress={() => router.back()}
            style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Ödeme yöntemleri</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Ionicons name="construct-outline" size={18} color={colors.warning} />
          <Text style={styles.noticeText}>
            <Text style={styles.noticeStrong}>Yapım aşamasında. </Text>
            Buradaki kartlar tamamen sahtedir ve hiçbir ödeme alınmaz. Gerçek kart girişi, PCI
            uyumlu ödeme sağlayıcısı seçildikten sonra onun güvenli alanı üzerinden yapılacak;
            kart numarası hiçbir zaman uygulamada tutulmayacak.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.empty} />
        ) : !methods || methods.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title="Kayıtlı kart yok"
            description="Akışı denemek için bir demo kart ekleyebilirsin."
            style={styles.empty}
          />
        ) : (
          methods.map((method, index) => (
            <Animated.View
              key={method.id}
              entering={FadeInDown.delay(index * 60).duration(300)}
              exiting={FadeOutDown.duration(200)}
              layout={LinearTransition.duration(220)}>
              <Card style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.brandBox}>
                    <Ionicons name="card" size={18} color={colors.primaryDark} />
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardBrand}>
                      {method.brand} ···· {method.last4}
                    </Text>
                    <Text style={styles.cardExpiry}>
                      Son kullanma {pad2(method.expiryMonth)}/{String(method.expiryYear).slice(-2)}
                    </Text>
                  </View>

                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel={`${method.brand} kartını sil`}
                    hitSlop={10}
                    haptic="warning"
                    onPress={() => confirmRemove(method.id, `${method.brand} ···· ${method.last4}`)}>
                    <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                  </AnimatedPressable>
                </View>

                {method.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Ionicons name="checkmark" size={13} color={colors.white} />
                    <Text style={styles.defaultText}>Varsayılan</Text>
                  </View>
                ) : (
                  <AnimatedPressable
                    accessibilityRole="button"
                    haptic="selection"
                    onPress={() => {
                      setError(undefined);
                      setDefault.mutate(method.id, { onError: failWith('Varsayılan kart değiştirilemedi') });
                    }}
                    style={({ pressed }) => [styles.makeDefault, pressed && styles.makeDefaultPressed]}>
                    <Text style={styles.makeDefaultText}>Varsayılan yap</Text>
                  </AnimatedPressable>
                )}
              </Card>
            </Animated.View>
          ))
        )}

        {picking && (
          <Animated.View
            entering={FadeInUp.duration(280)}
            exiting={FadeOutDown.duration(180)}
            style={styles.picker}>
            <Text style={styles.pickerTitle}>Hangi demo kart?</Text>
            {availableCards.length === 0 ? (
              <Text style={styles.pickerEmpty}>Katalogdaki tüm demo kartlar zaten ekli.</Text>
            ) : (
              <View style={styles.pickerChips}>
                {availableCards.map((card) => (
                  <FilterChip
                    key={card.last4}
                    label={`${card.brand} ···· ${card.last4}`}
                    onPress={() => {
                      // Istek surerken ikinci dokunus ayni karti tekrar eklemesin.
                      if (addPaymentMethod.isPending) return;
                      setError(undefined);
                      addPaymentMethod.mutate(card, {
                        // Secici yalnizca kart gercekten eklenince kapaniyor;
                        // hata durumunda acik kalip tekrar denemeye izin veriyor.
                        onSuccess: () => setPicking(false),
                        onError: failWith('Kart eklenemedi'),
                      });
                    }}
                    style={styles.pickerChip}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
        {!!error && (
          <Animated.View entering={FadeInDown.duration(220)} style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText} numberOfLines={3}>
              {error}
            </Text>
          </Animated.View>
        )}
        <Button
          label={picking ? 'Vazgeç' : 'Demo kart ekle'}
          variant={picking ? 'ghost' : 'primary'}
          loading={addPaymentMethod.isPending}
          onPress={() => setPicking((p) => !p)}
        />
      </SafeAreaView>
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

  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.badge,
    backgroundColor: colors.warningSoft,
  },
  noticeText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  noticeStrong: { fontWeight: '700' },

  empty: { paddingVertical: spacing.lg },

  card: { marginBottom: spacing.md, padding: spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  brandBox: {
    width: 40,
    height: 40,
    borderRadius: radius.badge,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardBrand: { ...typography.bodyStrong, color: colors.text },
  cardExpiry: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },

  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.chip,
    backgroundColor: colors.primary,
  },
  defaultText: { ...typography.caption, color: colors.white, fontWeight: '700', marginLeft: 2 },
  makeDefault: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    backgroundColor: colors.primarySoft,
  },
  makeDefaultPressed: { backgroundColor: '#DCE6FF' },
  makeDefaultText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },

  picker: { marginTop: spacing.lg },
  pickerTitle: { ...typography.captionStrong, color: colors.textSecondary },
  pickerChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  pickerChip: { marginRight: spacing.sm, marginBottom: spacing.sm },
  pickerEmpty: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1, marginLeft: spacing.sm },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
