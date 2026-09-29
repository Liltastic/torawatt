import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createThemedStyles, MIN_TOUCH_TARGET, radius, spacing, typography, useColors } from '@/theme';
import { haptics } from '@/utils/haptics';

import { Button } from './Button';
import { PickerWheel } from './PickerWheel';

interface PickerFieldProps {
  label: string;
  value?: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  /** Marka secilmeden model secilemiyor; sebebini de yaziyoruz. */
  disabled?: boolean;
  disabledHint?: string;
  error?: string;
}

/**
 * Listeden secim yapilan alan.
 *
 * Marka ve model elle yaziliyordu; ayni arac "Togg", "TOGG" ve "togg" olarak
 * uc ayri kayda donusebiliyordu ve yazim hatasi olan modelin gorseli hic
 * gelmiyordu (bkz. services/carImage). Liste gomulu oldugu icin acilis aninda.
 */
export function PickerField({
  label,
  value,
  placeholder,
  options,
  onSelect,
  disabled = false,
  disabledHint,
  error,
}: PickerFieldProps) {
  const colors = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  /**
   * iOS'ta tekerlek donerken secim aninda degismesin: kullanici listeyi
   * gezerken form her adimda guncellenirdi. Onaylayinca yaziyoruz.
   */
  const [draft, setDraft] = useState<string | undefined>(value);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    if (!needle) return options;
    return options.filter((option) => option.toLocaleLowerCase('tr').includes(needle));
  }, [options, query]);

  // Arama daralinca taslak secim listeden dusebiliyor; tekerlek o zaman hicbir
  // satiri secili gostermez ve "Sec" eski degeri yazardi.
  const wheelValue = draft && filtered.includes(draft) ? draft : filtered[0];

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const openSheet = () => {
    haptics.selection();
    setDraft(value ?? options[0]);
    setOpen(true);
  };

  const choose = (option: string) => {
    haptics.selection();
    onSelect(option);
    close();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} seç`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openSheet}
        style={({ pressed }) => [
          styles.field,
          !!error && styles.fieldError,
          disabled && styles.fieldDisabled,
          pressed && styles.fieldPressed,
        ]}>
        <Text
          style={[styles.value, !value && styles.valuePlaceholder]}
          numberOfLines={1}>
          {value || (disabled ? (disabledHint ?? placeholder) : placeholder)}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? colors.textTertiary : colors.textSecondary}
        />
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} animationType="slide" onRequestClose={close} transparent={false}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={10}
              onPress={close}
              style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Ara"
              placeholderTextColor={colors.textTertiary}
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.searchInput}
            />
          </View>

          {Platform.OS === 'ios' ? (
            // iPhone'da listeyi iOS'un kendi tekerlek secicisi ciziyor.
            // Arama kutusu tekerlegin icerigini daraltiyor; boylece 199
            // markalik liste de tek elle donerek gezilebiliyor.
            <View style={styles.wheelWrap}>
              <PickerWheel
                options={filtered}
                value={wheelValue}
                onChange={setDraft}
                style={styles.wheel}
              />

              <Button
                label="Seç"
                disabled={filtered.length === 0}
                onPress={() => choose(wheelValue)}
              />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              // 4600 model var; sanallastirma olmadan liste acilisi takiliyor.
              initialNumToRender={20}
              windowSize={10}
              ListEmptyComponent={<Text style={styles.empty}>Eşleşen kayıt yok</Text>}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => choose(item)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                    <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primaryText} />}
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },

  field: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldPressed: { backgroundColor: colors.surfaceMuted },
  fieldDisabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  fieldError: { borderColor: colors.dangerText },
  value: { ...typography.body, color: colors.text, flex: 1 },
  valuePlaceholder: { color: colors.textTertiary },
  error: { ...typography.caption, color: colors.dangerText, marginTop: spacing.xs },

  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sheetTitle: { ...typography.h3, color: colors.text, flex: 1 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.search,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { ...typography.body, color: colors.text, flex: 1, padding: 0 },

  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowText: { ...typography.body, color: colors.text, flex: 1 },
  rowTextSelected: { color: colors.primaryText, fontWeight: '600' },

  wheelWrap: { flex: 1, paddingHorizontal: spacing.xl },
  // iOS tekerleginin alisilmis yuksekligi.
  wheel: { height: 216, marginBottom: spacing.lg },

  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
}));
