import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button, FilterChip, TextField } from '@/components';
import { vehicleCatalog, type VehiclePreset } from '@/mocks/vehicleCatalog';
import { useVehicleStore } from '@/store/vehicles';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { connectorLabels, type ConnectorType } from '@/types/domain';

const CONNECTOR_OPTIONS: ConnectorType[] = ['TYPE_2', 'CCS2', 'CHADEMO', 'NACS'];

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
  maxAcKw: numeric(1, 50, '1 - 50 kW arası olmalı'),
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
  const router = useRouter();
  const addVehicle = useVehicleStore((state) => state.add);
  const [connectors, setConnectors] = useState<ConnectorType[]>(['CCS2', 'TYPE_2']);
  const [connectorError, setConnectorError] = useState<string>();

  const { control, handleSubmit, setValue, formState } = useForm<
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
      maxAcKw: '',
      maxDcKw: '',
      averageConsumptionKwhPer100Km: '',
    },
  });

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
    // Soket secimi zod semasinin disinda tutuluyor; kendi kontrolu var.
    if (connectors.length === 0) {
      setConnectorError('En az bir soket tipi seç');
      return;
    }

    // values zaten semadan gecmis halde: sayisal alanlar number.
    addVehicle({ ...values, connectors });
    router.back();
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

          <Text style={styles.sectionTitle}>Araç bilgileri</Text>

          <View style={styles.form}>
            <FormInput control={control} name="make" label="Marka" placeholder="Örn. Togg" />
            <FormInput control={control} name="model" label="Model" placeholder="Örn. T10X" />
            <FormInput
              control={control}
              name="modelYear"
              label="Model yılı"
              keyboardType="number-pad"
            />
            <FormInput
              control={control}
              name="batteryCapacityKwh"
              label="Batarya kapasitesi"
              suffix="kWh"
              keyboardType="decimal-pad"
            />
            <FormInput
              control={control}
              name="maxAcKw"
              label="Maksimum AC gücü"
              suffix="kW"
              keyboardType="decimal-pad"
            />
            <FormInput
              control={control}
              name="maxDcKw"
              label="Maksimum DC gücü"
              suffix="kW"
              keyboardType="decimal-pad"
            />
            <FormInput
              control={control}
              name="averageConsumptionKwhPer100Km"
              label="Ortalama tüketim"
              suffix="kWh/100km"
              keyboardType="decimal-pad"
            />
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
          {!!connectorError && <Text style={styles.connectorError}>{connectorError}</Text>}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
          <Button label="Aracı kaydet" onPress={onSubmit} loading={formState.isSubmitting} />
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
  ...rest
}: {
  control: Control<VehicleFormInput, unknown, VehicleFormOutput>;
  name: keyof VehicleFormInput;
  label: string;
  suffix?: string;
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
          onChangeText={onChange}
          onBlur={onBlur}
          error={fieldState.error?.message}
          {...rest}
        />
      )}
    />
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
  sectionHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

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
  presetBattery: { ...typography.caption, color: colors.primaryDark, marginTop: spacing.sm },

  form: { marginTop: spacing.lg },

  connectors: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
  connectorChip: { marginRight: spacing.sm, marginBottom: spacing.sm },
  connectorError: { ...typography.caption, color: colors.danger },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
