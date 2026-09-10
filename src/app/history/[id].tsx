import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState } from '@/components';
import { shareInvoice } from '@/services/invoice';
import { useHistoryStore } from '@/store/history';
import { colors, radius, spacing, typography } from '@/theme';
import {
  formatDate,
  formatEnergy,
  formatMinutes,
  formatPrice,
  formatTime,
} from '@/utils/format';

/** Sarj gecmisi detayi / makbuz (spec bolum 13). */
export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useHistoryStore((state) => state.findById(id));
  const [sharing, setSharing] = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={styles.root}>
        <Header onBack={() => router.back()} />
        <EmptyState
          icon="receipt-outline"
          title="Kayıt bulunamadı"
          description="Bu şarj kaydı silinmiş olabilir."
          action={<Button label="Geri dön" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const energyCost = item.energyKwh * item.pricePerKwh;
  const extras = item.cost - energyCost;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <Header onBack={() => router.back()} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.total}>{formatPrice(item.cost)}</Text>
        <Text style={styles.station}>{item.stationName}</Text>
        <Text style={styles.date}>{formatDate(item.startedAt)}</Text>

        <Card style={styles.card}>
          <Row label="Soket" value={item.connectorLabel} />
          <Row label="Başlangıç" value={formatTime(item.startedAt)} />
          <Row label="Bitiş" value={formatTime(item.endedAt)} />
          <Row label="Süre" value={formatMinutes(item.durationMinutes)} last />
        </Card>

        <Text style={styles.sectionTitle}>Ücret dökümü</Text>
        <Card style={styles.card}>
          <Row label="Alınan enerji" value={formatEnergy(item.energyKwh)} />
          <Row label="Tarife" value={`${formatPrice(item.pricePerKwh)} / kWh`} />
          <Row label="Enerji bedeli" value={formatPrice(energyCost)} />
          <Row
            label="Ek ücretler"
            value={extras > 0.005 ? formatPrice(extras) : 'Yok'}
          />
          <Row label="Toplam" value={formatPrice(item.cost)} emphasis last />
        </Card>

        <View style={styles.notice}>
          <Ionicons name="construct-outline" size={16} color={colors.warning} />
          <Text style={styles.noticeText}>
            Belge bir demodur, resmi fatura değildir. Gerçek fatura, faturalandırma servisi ve
            e-Arşiv entegrasyonu tamamlanınca buradan alınabilecek.
          </Text>
        </View>

        <Button
          label="Şarj özetini indir"
          variant="secondary"
          loading={sharing}
          style={styles.invoice}
          onPress={async () => {
            setSharing(true);
            try {
              await shareInvoice(item);
            } catch (error) {
              // Sentry baglandiginda bu buraya raporlanacak (spec bolum 19).
              console.error('Fatura olusturulamadi', error);
              Alert.alert('Belge oluşturulamadı', 'Lütfen tekrar dene.');
            } finally {
              setSharing(false);
            }
          }}
        />
      </ScrollView>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        hitSlop={10}
        onPress={onBack}
        style={styles.headerButton}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function Row({
  label,
  value,
  emphasis = false,
  last = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

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

  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  total: { fontSize: 40, lineHeight: 46, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  station: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
  date: { ...typography.body, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xxl },
  card: { marginTop: spacing.lg, paddingVertical: spacing.xs },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.bodyStrong, color: colors.text },
  rowValueEmphasis: { ...typography.h3, color: colors.primaryDark },

  notice: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xl },
  noticeText: { ...typography.caption, color: colors.textSecondary, flex: 1, marginLeft: spacing.sm },

  invoice: { marginTop: spacing.lg },
});
