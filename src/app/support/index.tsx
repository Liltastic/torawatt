import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card } from '@/components';
import { ApiError, supportApi } from '@/services/api';
import { colors, radius, spacing, typography } from '@/theme';

const MIN_MESSAGE_LENGTH = 10;

const FAQ_ITEMS = [
  {
    question: 'Rezervasyonum ne zaman düşer?',
    answer:
      'Seçtiğin başlangıç saatinden itibaren soket 15 dakika sana ayrılır. Bu süre içinde gelip "Geldim" demezsen rezervasyon otomatik düşer ve soket serbest kalır.',
  },
  {
    question: 'Ödeme yöntemleri gerçek mi?',
    answer:
      'Hayır, şu an demo aşamasında. Eklediğin kart bilgileri hiçbir yere kaydedilmiyor; gerçek bir ödeme sağlayıcısı bağlandığında bu bölüm güncellenecek.',
  },
  {
    question: 'Favorilerim ve geçmişim nerede saklanıyor?',
    answer:
      'Hesabına bağlı olarak sunucuda saklanıyor. Farklı bir cihazdan aynı hesapla giriş yaptığında hepsini görürsün.',
  },
  {
    question: 'Hesabımı nasıl silerim?',
    answer: 'Profil → Ayarlar → Hesabı sil yolunu izleyebilirsin. Bu işlem geri alınamaz.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number>();

  const [message, setMessage] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      setError(`Mesaj en az ${MIN_MESSAGE_LENGTH} karakter olmalı.`);
      return;
    }

    setError(undefined);
    setSending(true);
    try {
      await supportApi.send(message.trim());
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Mesaj gönderilemedi.');
    } finally {
      setSending(false);
    }
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
          <Text style={styles.headerTitle}>Yardım ve destek</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Sıkça sorulan sorular</Text>
          <Card style={styles.card}>
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = expanded === index;
              return (
                <Pressable
                  key={item.question}
                  accessibilityRole="button"
                  onPress={() => setExpanded(isOpen ? undefined : index)}
                  style={[styles.faqRow, index < FAQ_ITEMS.length - 1 && styles.faqRowDivider]}>
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </View>
                  {isOpen && (
                    <Animated.Text entering={FadeInDown.duration(180)} style={styles.faqAnswer}>
                      {item.answer}
                    </Animated.Text>
                  )}
                </Pressable>
              );
            })}
          </Card>

          <Text style={styles.sectionTitle}>Bize yaz</Text>
          <Card style={styles.card}>
            {sent ? (
              <View style={styles.sentRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                <Text style={styles.sentText}>Mesajın ulaştı, en kısa sürede döneriz.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Mesajın</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Sorunu ya da önerini yaz..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  style={styles.textArea}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button
                  label="Gönder"
                  onPress={onSend}
                  loading={sending}
                  style={styles.sendButton}
                />
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

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
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xxl },
  card: { marginTop: spacing.lg, paddingVertical: spacing.xs },

  faqRow: { paddingVertical: spacing.md },
  faqRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { ...typography.bodyStrong, color: colors.text, flex: 1, marginRight: spacing.sm },
  faqAnswer: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  textArea: {
    ...typography.body,
    color: colors.text,
    minHeight: 110,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  sendButton: { marginTop: spacing.lg },

  sentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  sentText: { ...typography.body, color: colors.text, marginLeft: spacing.sm, flex: 1 },
});
