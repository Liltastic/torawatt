import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, TextField } from '@/components';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const [name, setName] = useState(user?.name ?? '');
  const [nameStatus, setNameStatus] = useState<string>();
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [passwordStatus, setPasswordStatus] = useState<string>();
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const onSaveName = async () => {
    if (!name.trim()) return;
    setNameStatus(undefined);
    setNameSaving(true);
    try {
      await updateProfile(name.trim());
      setNameStatus('Kaydedildi.');
    } catch (err) {
      setNameStatus(err instanceof ApiError ? err.message : 'Kaydedilemedi.');
    } finally {
      setNameSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError('Her iki alan da gerekli.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }

    setPasswordError(undefined);
    setPasswordStatus(undefined);
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordStatus('Şifre güncellendi.');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Şifre güncellenemedi.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Hesabı sil',
      'Hesabın, araçların, favorilerin ve şarj geçmişin kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabı sil',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              router.replace('/welcome');
            } catch (err) {
              setDeleting(false);
              Alert.alert('Hata', err instanceof ApiError ? err.message : 'Hesap silinemedi.');
            }
          },
        },
      ],
    );
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
          <Text style={styles.headerTitle}>Ayarlar</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Hesap bilgileri</Text>
          <Card style={styles.card}>
            <TextField label="Ad" value={name} onChangeText={setName} placeholder="Adın" />
            <Text style={styles.emailLabel}>{user?.email}</Text>
            {!!nameStatus && <Text style={styles.status}>{nameStatus}</Text>}
            <Button
              label="Kaydet"
              variant="secondary"
              size="md"
              onPress={onSaveName}
              loading={nameSaving}
              style={styles.cardAction}
            />
          </Card>

          <Text style={styles.sectionTitle}>Şifre değiştir</Text>
          <Card style={styles.card}>
            <TextField
              label="Mevcut şifre"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextField
              label="Yeni şifre"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder={`En az ${MIN_PASSWORD_LENGTH} karakter`}
            />
            {!!passwordError && <Text style={styles.error}>{passwordError}</Text>}
            {!!passwordStatus && <Text style={styles.status}>{passwordStatus}</Text>}
            <Button
              label="Şifreyi güncelle"
              variant="secondary"
              size="md"
              onPress={onChangePassword}
              loading={passwordSaving}
              style={styles.cardAction}
            />
          </Card>

          <Text style={styles.sectionTitle}>Tehlikeli bölge</Text>
          <Card style={styles.card}>
            <Text style={styles.dangerText}>
              Hesabını silmek; araçlarını, favorilerini, rezervasyonlarını ve şarj geçmişini kalıcı
              olarak kaldırır.
            </Text>
            <Button
              label="Hesabı sil"
              variant="danger"
              size="md"
              onPress={onDeleteAccount}
              loading={deleting}
              style={styles.cardAction}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
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
  card: { marginTop: spacing.lg },
  cardAction: { marginTop: spacing.md, alignSelf: 'flex-start' },

  emailLabel: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.sm },
  status: { ...typography.caption, color: colors.successText, marginTop: spacing.sm },
  error: { ...typography.caption, color: colors.dangerText, marginTop: spacing.sm },

  dangerText: { ...typography.body, color: colors.textSecondary },
}));
