import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { Button, FilterChip, PickerField, TextField } from '@/components';
import { carMakes, modelsForMake } from '@/data/carCatalog';
import { variantOptions, variantsFor, type EvVariantOption } from '@/data/evSpecs';
import { vehicleCatalog, type VehiclePreset } from '@/mocks/vehicleCatalog';
import { useCreateVehicle } from '@/queries/vehicles';
import { createThemedStyles, radius, shadows, spacing, typography, useColors } from '@/theme';
import { connectorLabels, type ConnectorType } from '@/types/domain';
import { haptics } from '@/utils/haptics';

const CONNECTOR_OPTIONS: ConnectorType[] = ['TYPE_2', 'CCS2', 'CHADEMO', 'NACS'];

/**
 * Marka/model degisince temizlenen alanlar (bkz. clearSpecs).
 *
 * Guc alanlari listede yok: onlar formda gorunmuyor ve bos degil SIFIR'a
 * donuyorlar.
 */
const SPEC_FIELDS = ['batteryCapacityKwh', 'averageConsumptionKwhPer100Km'] as const;

const CURRENT_YEAR = new Date().getFullYear();

/** Sayisal alanlar TextInput'tan metin gelir; once virgul normalize edilir. */
const numeric = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, 'Zorunlu alan')
    .transform((value) => Number(value.replace(',', '.')))
    .refine((value) => Number.isFinite(value) && value >= min && value <= max, { message });

const vehicleSchema = z.object({
  make: z.string().trim().min(1, 'Marka gerekli'),
  model: z.string().trim().min(1, 'Model gerekli'),
  modelYear: numeric(1990, CURRENT_YEAR + 2, `1990 - ${CURRENT_YEAR + 2} arası olmalı`),
  batteryCapacityKwh: numeric(5, 250, '5 - 250 kWh arası olmalı'),
  // Alt sinir 0: bilinmeyen modellerde soket gucu sinirlanmiyor demek
  // (bkz. services/tripPlanner effectivePowerKw). Kullanici bu alani gormuyor.
  maxAcKw: numeric(0, 50, '0 - 50 kW arası olmalı'),
  maxDcKw: numeric(0, 400, '0 - 400 kW arası olmalı'),
  averageConsumptionKwhPer100Km: numeric(5, 60, '5 - 60 kWh/100km arası olmalı'),
});

/**
 * Sema transform icerdigi icin giris (form alanlari: metin) ve cikis
 * (dogrulanmis: sayi) tipleri farkli; useForm'a ikisini birden veriyoruz.
 */
type VehicleFormInput = z.input<typeof vehicleSchema>;
type VehicleFormOutput = z.output<typeof vehicleSchema>;

export default function AddVehicleScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const createVehicle = useCreateVehicle();
  const [connectors, setConnectors] = useState<ConnectorType[]>(['CCS2', 'TYPE_2']);
  const [connectorError, setConnectorError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  const { clearErrors, control, handleSubmit, setValue, formState } = useForm<
    VehicleFormInput,
    unknown,
    VehicleFormOutput
  >({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: '',
      model: '',
      modelYear: String(CURRENT_YEAR),
      batteryCapacityKwh: '',
      // Gorunmeyen alanlar hic gecersiz kalmasin: 0 "bilinmiyor" demek
      // (bkz. clearSpecs).
      maxAcKw: '0',
      maxDcKw: '0',
      averageConsumptionKwhPer100Km: '',
    },
  });

  // Model listesi secili markaya bagli. watch() yerine useWatch: watch bir
  // FONKSIYON donduruyor ve React Compiler bu bileseni memoize etmeyi tamamen
  // atliyor; useWatch degerin kendisini veriyor.
  const selectedMake = useWatch({ control, name: 'make' });
  const selectedModel = useWatch({ control, name: 'model' });

  // Her cizimde yeni dizi uretilmesin: PickerField listeyi kendi icinde
  // filtreliyor ve referans degisince o is bastan yapiliyor.
  const models = useMemo(() => modelsForMake(selectedMake), [selectedMake]);

  // Secilen modelin uretici verisiyle bilinen surumleri; yoksa alanlar elle
  // doldurulmaya devam ediyor (bkz. data/evSpecs).
  const variants = useMemo(
    () => variantOptions(variantsFor(selectedMake, selectedModel)),
    [selectedMake, selectedModel],
  );
  const [variantLabel, setVariantLabel] = useState<string>();

  /**
   * Gorunmeyen degerler (guc ve tuketim) hazir bir kaynaktan mi geldi?
   *
   * Geldiyse tuketim kutusu hic gosterilmiyor - kullanicinin dolduracagi bir
   * sey yok. Gelmediyse tek soru olarak kaliyor: menzil hesabi o degere
   * bakiyor ve yerine bir sayi uydurmak rota planlamasini sessizce yanlislar.
   */
  const [specsFromData, setSpecsFromData] = useState(false);

  // Secici metin listesi aliyor; her cizimde yeniden uretilmesin.
  const variantLabels = useMemo(() => variants.map((option) => option.label), [variants]);

  /**
   * Sayiyi elle degistiren kullanicinin aracinda artik o surum yazili degil;
   * kutu eski etiketi tasimaya devam etse degerlerle celisirdi.
   */
  const unsetVariant = () => {
    setVariantLabel(undefined);
    // Degerlerin sahibi artik kullanici; tuketimi de gorup duzeltebilsin.
    setSpecsFromData(false);
  };

  const applyVariant = (option: EvVariantOption) => {
    setVariantLabel(option.label);
    setSpecsFromData(true);
    setValue('batteryCapacityKwh', String(option.variant.batteryKwh), { shouldValidate: true });
    setValue('maxAcKw', String(option.variant.acKw), { shouldValidate: true });
    setValue('maxDcKw', String(option.variant.dcKw), { shouldValidate: true });
    setValue('averageConsumptionKwhPer100Km', String(option.variant.consumptionKwhPer100Km), {
      shouldValidate: true,
    });
    // Soket BILEREK doldurulmuyor: kaynak bunu bizim pazarimiz icin yanlis
    // verebiliyor (bkz. data/evSpecs).
  };

  /**
   * Marka ya da model degisti: batarya ve sarj degerleri artik BASKA bir araca
   * ait. Temizlenmezse onceki aracin sayilari ekranda kaliyor; dahasi kutular
   * dolu gorundugu icin kullanici degistirmesi gerektigini anlamiyor ve yanlis
   * kapasiteyle kaydediyor.
   *
   * Dogrulama bilerek calistirilmiyor: kullanici henuz dokunmadigi dort alani
   * kirmizi gormesin. Varsa eski hata da siliniyor.
   */
  const clearSpecs = () => {
    setVariantLabel(undefined);
    setSpecsFromData(false);
    for (const field of SPEC_FIELDS) setValue(field, '');
    // Guc alanlari formda GORUNMUYOR; bos kalsalar gorunmez bir dogrulama
    // hatasiyla kayit engellenirdi. 0 burada "bilinmiyor" demek: rota
    // planlayici soketin kendi gucunu tavan aliyor (bkz. services/tripPlanner).
    setValue('maxAcKw', '0');
    setValue('maxDcKw', '0');
    clearErrors([...SPEC_FIELDS]);
  };

  /**
   * Model secildi. Tek surumu bilinen araclarda secilecek bir sey yok, degerler
   * dogrudan yaziliyor; birden fazlaysa secim kullaniciya kaliyor.
   */
  const pickModel = (model: string) => {
    clearSpecs();
    const known = variantOptions(variantsFor(selectedMake, model));
    if (known.length === 1) applyVariant(known[0]);
  };

  const applyPreset = (preset: VehiclePreset) => {
    setValue('make', preset.make, { shouldValidate: true });
    setValue('model', preset.model, { shouldValidate: true });
    setValue('batteryCapacityKwh', String(preset.batteryCapacityKwh), { shouldValidate: true });
    setValue('maxAcKw', String(preset.maxAcKw), { shouldValidate: true });
    setValue('maxDcKw', String(preset.maxDcKw), { shouldValidate: true });
    setValue(
      'averageConsumptionKwhPer100Km',
      String(preset.averageConsumptionKwhPer100Km),
      { shouldValidate: true },
    );
    // Hazir ayar kendi sayilarini getiriyor; "Surum" kutusunda onceki aracin
    // surumu asili kalmasin - ama degerler tam oldugu icin tuketim de
    // sorulmuyor.
    setVariantLabel(undefined);
    setSpecsFromData(true);
    setConnectors(preset.connectors);
    setConnectorError(undefined);
  };

  const toggleConnector = (type: ConnectorType) => {
    setConnectorError(undefined);
    setConnectors((prev) =>
      prev.includes(type) ? prev.filter((c) => c !== type) : [...prev, type],
    );
  };

  const onSubmit = handleSubmit((values) => {
    // Erken return'un ustunde temizleniyor: aksi halde soket hatasiyla donen
    // denemede onceki gonderim hatasi ekranda asili kaliyordu.
    setSubmitError(undefined);

    // Soket secimi zod semasinin disinda tutuluyor; kendi kontrolu var.
    if (connectors.length === 0) {
      setConnectorError('En az bir soket tipi seç');
      haptics.error();
      return;
    }

    // values zaten semadan gecmis halde: sayisal alanlar number.
    createVehicle.mutate(
      { ...values, connectors },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          setSubmitError(err instanceof Error ? err.message : 'Araç kaydedilemedi');
          haptics.error();
        },
      },
    );
  });

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
          <Text style={styles.headerTitle}>Araç ekle</Text>
          {/* Basligi ortalamak icin denge bosluğu; buton gibi gorunmemeli. */}
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Hazır modeller</Text>
          <Text style={styles.sectionHint}>
            Seçince teknik değerler otomatik dolar; sonrasında düzenleyebilirsin.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presets}>
            {vehicleCatalog.map((preset) => (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                onPress={() => applyPreset(preset)}
                style={({ pressed }) => [styles.preset, pressed && styles.presetPressed]}>
                <Text style={styles.presetMake}>{preset.make}</Text>
                <Text style={styles.presetModel} numberOfLines={2}>
                  {preset.model}
                </Text>
                <Text style={styles.presetBattery}>{preset.batteryCapacityKwh} kWh</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Araç</Text>

          <View style={styles.group}>
            <Controller
              control={control}
              name="make"
              render={({ field, fieldState }) => (
                <PickerField
                  label="Marka"
                  value={field.value}
                  placeholder="Listeden seç"
                  options={carMakes}
                  error={fieldState.error?.message}
                  onSelect={(make) => {
                    if (make === field.value) return;
                    field.onChange(make);
                    // Marka degisince onceki model artik gecerli degil, onun
                    // teknik degerleri de.
                    setValue('model', '');
                    clearSpecs();
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="model"
              render={({ field, fieldState }) => (
                <PickerField
                  label="Model"
                  value={field.value}
                  placeholder="Listeden seç"
                  options={models}
                  disabled={!selectedMake}
                  disabledHint="Önce marka seç"
                  error={fieldState.error?.message}
                  onSelect={(model) => {
                    if (model === field.value) return;
                    field.onChange(model);
                    pickModel(model);
                  }}
                />
              )}
            />
            <FormInput
              control={control}
              name="modelYear"
              label="Model yılı"
              keyboardType="number-pad"
            />
          </View>

          <Text style={styles.sectionTitle}>Batarya</Text>
          <Text style={styles.sectionHint}>
            Menzil ve şarj süresi hesapları bu değerden çıkıyor.
          </Text>

          <View style={styles.group}>
            {variants.length > 0 && (
              <PickerField
                label="Sürüm"
                value={variantLabel}
                placeholder="Listeden seç"
                options={variantLabels}
                onSelect={(label) => {
                  const option = variants.find((item) => item.label === label);
                  if (option) applyVariant(option);
                }}
              />
            )}

            <FormInput
              control={control}
              name="batteryCapacityKwh"
              label="Batarya kapasitesi"
              suffix="kWh"
              keyboardType="decimal-pad"
              onEdit={unsetVariant}
            />

            {/*
              Tuketim yalnizca surum SECILI DEGILKEN soruluyor.

              Secili surumde deger uretici verisinden geliyor ve kullaniciya
              hic gosterilmiyor; bilinmeyen modellerde ise uygulama menzili
              hesaplayamaz, o yuzden tek soru olarak kaliyor. Gizli tutup
              uydurma bir sayi yazmak, rota planlamasini sessizce yanlislardi.
            */}
            {!specsFromData && (
              <>
                <FormInput
                  control={control}
                  name="averageConsumptionKwhPer100Km"
                  label="Ortalama tüketim"
                  suffix="kWh/100km"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.fieldNote}>
                  {variants.length > 0
                    ? 'Sürüm seçersen bu değer kendiliğinden dolar.'
                    : 'Bu model için üretici verimiz yok; menzil hesabı bu değere bakıyor.'}
                </Text>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>Soket tipleri</Text>
          <Text style={styles.sectionHint}>Aracının kabul ettiği fişleri seç.</Text>

          <View style={styles.connectors}>
            {CONNECTOR_OPTIONS.map((type) => (
              <FilterChip
                key={type}
                label={connectorLabels[type]}
                selected={connectors.includes(type)}
                onPress={() => toggleConnector(type)}
                style={styles.connectorChip}
              />
            ))}
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
          {/* Kayit hatasi butonun yaninda duruyor: kaydirilabilir alanin dibinde
              kalsa kullanici butona basarken onu hic gormuyordu. */}
          {/* Soket hatasi da buraya: ScrollView'in dibinde kalinca kullanici
              klavye acikken butona basiyor ve ekranda hicbir sey degismiyordu. */}
          {!!(submitError || connectorError) && (
            <Animated.View entering={FadeInDown.duration(220)} style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.dangerText} />
              <Text style={styles.errorText} numberOfLines={3}>
                {submitError ?? connectorError}
              </Text>
            </Animated.View>
          )}
          <Button
            label="Aracı kaydet"
            onPress={onSubmit}
            loading={formState.isSubmitting || createVehicle.isPending}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FormInput({
  control,
  name,
  label,
  suffix,
  onEdit,
  ...rest
}: {
  control: Control<VehicleFormInput, unknown, VehicleFormOutput>;
  name: keyof VehicleFormInput;
  label: string;
  suffix?: string;
  /** Degeri ELLE degistirdiginde: surum secimi artik gecerli degil. */
  onEdit?: () => void;
  placeholder?: string;
  keyboardType?: 'number-pad' | 'decimal-pad';
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <TextField
          label={label}
          suffix={suffix}
          value={value}
          onChangeText={(text) => {
            onEdit?.();
            onChange(text);
          }}
          onBlur={onBlur}
          error={fieldState.error?.message}
          {...rest}
        />
      )}
    />
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
  sectionHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

  group: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // Alanlar kendi alt paylarini tasiyor; kart ayrica pay eklemiyor.
    paddingBottom: 0,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  fieldNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },

  presets: { paddingTop: spacing.lg, paddingBottom: spacing.xs },
  preset: {
    width: 132,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  presetMake: { ...typography.caption, color: colors.textSecondary },
  presetModel: { ...typography.bodyStrong, color: colors.text, marginTop: 2 },
  presetBattery: { ...typography.caption, color: colors.primaryText, marginTop: spacing.sm },

  connectors: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
  connectorChip: { marginRight: spacing.sm, marginBottom: spacing.sm },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...typography.caption, color: colors.dangerText, flex: 1, marginLeft: spacing.sm },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
}));
