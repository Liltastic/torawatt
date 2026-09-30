import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
  createThemedStyles,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  typography,
  useColors,
} from '@/theme';
import { haptics } from '@/utils/haptics';

import { PickerWheel } from './PickerWheel';

/** FlatList keyExtractor'i: secenekler zaten benzersiz metinler. */
const identity = (option: string) => option;

/**
 * Satirlar esit yukseklikte (bkz. styles.row); FlatList'in olcum icin
 * beklemesine gerek yok.
 */
const ROW_HEIGHT = MIN_TOUCH_TARGET + 1;
const itemLayout = (_data: unknown, index: number) => ({
  length: ROW_HEIGHT,
  offset: ROW_HEIGHT * index,
  index,
});

/**
 * Tek satir. Kendi basina memo: liste yuz satiri asiyor ve secim degistiginde
 * hepsinin yeniden cizilmesi gereksiz.
 */
const PickerRow = memo(function PickerRow({
  option,
  selected,
  onPress,
}: {
  option: string;
  selected: boolean;
  onPress: (option: string) => void;
}) {
  const colors = useColors();
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(option)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
        {option}
      </Text>
      {selected && <Ionicons name="checkmark" size={18} color={colors.primaryText} />}
    </Pressable>
  );
});

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
 * gelmiyordu (bkz. services/carImage).
 *
 * Secim ekran DEGISTIRMIYOR: altta bir sayfa aciliyor, ustunde Vazgec/Sec
 * cubugu var ve arkadaki form gorunur kaliyor. iPhone'da liste iOS'un kendi
 * tekerlek secicisiyle donuyor, Android'de satira dokunarak seciliyor
 * (bkz. PickerWheel).
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
   * Tekerlek donerken secim aninda degismesin: kullanici listeyi gezerken
   * form her satirda guncellenirdi. "Sec"e basinca yaziliyor.
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

  // Secili kayit listenin ortasinda kaliyorsa sayfa onu gostererek acilsin;
  // 199 markanin arasinda kullanici kendi secimini aramak zorunda kalmasin.
  const initialIndex = value ? Math.max(options.indexOf(value), 0) : 0;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const openSheet = () => {
    haptics.selection();
    setDraft(value ?? options[0]);
    setOpen(true);
  };

  const choose = (option: string | undefined) => {
    if (!option) return;
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
        <Text style={[styles.value, !value && styles.valuePlaceholder]} numberOfLines={1}>
          {value || (disabled ? (disabledHint ?? placeholder) : placeholder)}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? colors.textTertiary : colors.textSecondary}
        />
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} animationType="none" onRequestClose={close} transparent>
        {/*
          RN Modal ayri bir native pencerede aciliyor ve SafeAreaView orada
          guvenli alani olcemeyip sifir donduruyor. Kutuphanenin onerdigi
          cozum modal icine kendi saglayicisini koymak.
        */}
        <SafeAreaProvider>
          <View style={styles.backdropWrap}>
            {/*
              Perde YERINDE beliriyor, sayfa asagidan kayiyor. Modal'in kendi
              "slide" animasyonu seffaf modda ikisini birden kaydiriyor ve
              ekranda yukari cikan koyu bir dikdortgen olusuyordu.
            */}
            <Animated.View
              entering={FadeIn.duration(180)}
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                onPress={close}
                style={styles.backdrop}
              />
            </Animated.View>

            <Animated.View entering={SlideInDown.duration(260)}>
              <SafeAreaView edges={['bottom']} style={styles.sheet}>
                <View style={styles.toolbar}>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={close}
                    style={styles.toolbarButton}>
                    <Text style={styles.toolbarCancel}>Vazgeç</Text>
                  </Pressable>

                  <Text style={styles.toolbarTitle} numberOfLines={1}>
                    {label}
                  </Text>

                  {/*
                    "Sec" yalnizca tekerlekli tarafta gerekiyor: Android'de
                    satira dokunmak zaten secim demek.
                  */}
                  {Platform.OS === 'ios' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !wheelValue }}
                      disabled={!wheelValue}
                      hitSlop={8}
                      onPress={() => choose(wheelValue)}
                      style={styles.toolbarButton}>
                      <Text style={[styles.toolbarDone, !wheelValue && styles.toolbarDisabled]}>
                        Seç
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.toolbarButton} />
                  )}
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

                {filtered.length === 0 ? (
                  <Text style={styles.empty}>Eşleşen kayıt yok</Text>
                ) : Platform.OS === 'ios' ? (
                  <PickerWheel
                    options={filtered}
                    value={wheelValue}
                    onChange={setDraft}
                    style={styles.wheel}
                  />
                ) : (
                  /*
                    ScrollView degil FlatList: liste 199 markayi ve Toyota gibi
                    markalarda 179 modeli tasiyor. ScrollView hepsini birden
                    cizdigi icin sayfa ancak yuzlerce satir yerlestikten sonra
                    aciliyor ve acilis animasyonu takiliyordu. FlatList yalnizca
                    gorunen pencereyi ciziyor.
                  */
                  <FlatList
                    data={filtered}
                    style={styles.list}
                    keyExtractor={identity}
                    // Satir yuksekligi sabit (bkz. styles.row): olcum
                    // beklemeden yerlesiyor ve secili satira atlayabiliyoruz.
                    getItemLayout={itemLayout}
                    initialScrollIndex={initialIndex}
                    initialNumToRender={12}
                    windowSize={9}
                    removeClippedSubviews
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <PickerRow option={item} selected={item === value} onPress={choose} />
                    )}
                  />
                )}
              </SafeAreaView>
            </Animated.View>
          </View>
        </SafeAreaProvider>
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

  // Sayfa degismiyor: perde ustte, secim sayfasi altta.
  backdropWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },

  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarButton: { minWidth: 64, justifyContent: 'center' },
  toolbarTitle: { ...typography.bodyStrong, color: colors.text, flex: 1, textAlign: 'center' },
  toolbarCancel: { ...typography.body, color: colors.textSecondary },
  toolbarDone: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'right',
  },
  toolbarDisabled: { color: colors.textTertiary },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.search,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: { ...typography.body, color: colors.text, flex: 1, padding: 0 },

  /** iOS tekerleginin alisilmis yuksekligi. */
  wheel: { height: 216, marginTop: spacing.sm },
  /** Sayfanin ekranin yarisini gecmemesi icin; arkadaki form gorunur kalsin. */
  list: { maxHeight: 280, marginTop: spacing.sm },

  row: {
    // getItemLayout bu yuksekligi varsayiyor (bkz. ROW_HEIGHT): minHeight
    // olsaydi uzun bir model adi satiri buyutur ve liste kayarken konumlar
    // kayardi.
    height: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowText: { ...typography.body, color: colors.text, flex: 1 },
  rowTextSelected: { color: colors.primaryText, fontWeight: '600' },

  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
}));
