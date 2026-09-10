import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, FilterChip } from '@/components';
import { demoCardCatalog, usePaymentStore } from '@/store/payment';
import { colors, radius, shadows, spacing, typography } from '@/theme';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Odeme yontemleri (spec bolum 12) - demo. */
export default function PaymentMethodsScreen() {
  const router = useRouter();
  const methods = usePaymentStore((state) => state.methods);
  const addDemoCard = usePaymentStore((state) => state.addDemoCard);
  const remove = usePaymentStore((state) => state.remove);
  const setDefault = usePaymentStore((state) => state.setDefault);

  const [picking, setPicking] = useState(false);

  const confirmRemove = (id: string, label: string) =>
    Alert.alert('Kartı sil', `${label} kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove(id) },
    ]);

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

        {methods.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title="Kayıtlı kart yok"
            description="Akışı denemek için bir demo kart ekleyebilirsin."
            style={styles.empty}
          />
        ) : (
          methods.map((method) => (
            <Card key={method.id} style={styles.card}>
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

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${method.brand} kartını sil`}
                  hitSlop={10}
                  onPress={() => confirmRemove(method.id, `${method.brand} ···· ${method.last4}`)}>
                  <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>

              {method.isDefault ? (
                <View style={styles.defaultBadge}>
                  <Ionicons name="checkmark" size={13} color={colors.white} />
                  <Text style={styles.defaultText}>Varsayılan</Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDefault(method.id)}
                  style={({ pressed }) => [styles.makeDefault, pressed && styles.makeDefaultPressed]}>
                  <Text style={styles.makeDefaultText}>Varsayılan yap</Text>
                </Pressable>
              )}
            </Card>
          ))
        )}

        {picking && (
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Hangi demo kart?</Text>
            <View style={styles.pickerChips}>
              {demoCardCatalog.map((card, index) => (
                <FilterChip
                  key={card.last4}
                  label={`${card.brand} ···· ${card.last4}`}
                  onPress={() => {
                    addDemoCard(index);
                    setPicking(false);
                  }}
                  style={styles.pickerChip}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
        <Button
          label={picking ? 'Vazgeç' : 'Demo kart ekle'}
          variant={picking ? 'ghost' : 'primary'}
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

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
