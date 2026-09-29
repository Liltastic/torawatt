import { Image } from 'expo-image';
import { View } from 'react-native';

import { useCarImage } from '@/queries/carImage';
import { createThemedStyles, radius, spacing } from '@/theme';
import type { Vehicle } from '@/types/domain';

/**
 * Aracin katalog gorseli (bkz. services/carImage).
 *
 * Gorsel KOZMETIK: gelmezse, anahtar tanimli degilse ya da servis o modeli
 * tanimiyorsa bilesen hic cizilmiyor ve kart yazilarla duruyor. Bu yuzden
 * yukleme gostergesi de yok - bos bir cerceve yanip sonmektense gorsel
 * geldiginde yerini almasi daha sakin duruyor.
 *
 * Saydam zeminli render geldigi icin kartin kendi yuzeyi arkada kaliyor;
 * ayri bir arka plan vermiyoruz.
 */
export function VehiclePhoto({
  vehicle,
}: {
  vehicle: Pick<Vehicle, 'make' | 'model' | 'modelYear'>;
}) {
  const styles = useStyles();
  const { data: url } = useCarImage(vehicle);

  if (!url) return null;

  return (
    <View style={styles.frame}>
      <Image
        source={url}
        style={styles.image}
        contentFit="contain"
        transition={220}
        accessibilityLabel={`${vehicle.make} ${vehicle.model}`}
        // Imza bir gun gecerli, URL o sure boyunca ayni kaliyor; disk
        // onbellegi ayni araci her acilista yeniden indirmeyi onluyor.
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const useStyles = createThemedStyles(() => ({
  frame: {
    height: 128,
    marginTop: spacing.md,
    borderRadius: radius.button,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
}));
