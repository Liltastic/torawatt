import { Image, type ImageContentPosition, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';

/**
 * Perde. Ust ucta durum cubugu simgeleri ve beyaz logo icin, alt ucta formun
 * ya da butonlarin tamami icin kontrast uretir; ortada fotografin nefes
 * almasina izin verir ve hafif turkuaza caler.
 *
 * Tek bir gradyan: ayri tonlama/perde katmanlari gorsel olarak ayni sonucu
 * verip her karede bir tam ekran beste daha ekliyordu.
 */
const SCRIM_COLORS = [
  'rgba(6, 34, 29, 0.62)',
  'rgba(10, 70, 63, 0.34)',
  'rgba(8, 44, 39, 0.86)',
  'rgba(6, 28, 24, 0.97)',
] as const;
const SCRIM_LOCATIONS = [0, 0.24, 0.56, 1] as const;

interface AuthBackdropProps {
  source: ImageSource | number;
  /** Fotografin gorunur kalan bolgesi (bkz. assets/images/auth/CREDITS.md). */
  contentPosition?: ImageContentPosition;
}

/**
 * Karsilama, giris ve kayit ekranlarinin ortak zemini: tam ekran fotograf ve
 * uzerindeki perde. Kaydirma alaninin DISINDA durur, hic kipirdamaz - klavye
 * acilinca yalnizca icerik kayar.
 */
export function AuthBackdrop({ source, contentPosition = 'center' }: AuthBackdropProps) {
  return (
    <>
      {/* Fotograf saydam durum cubugunun altina cizilir; simgeler acik renk olmali. */}
      <StatusBar style="light" />

      <Image
        source={source}
        contentFit="cover"
        contentPosition={contentPosition}
        transition={{ duration: 300, effect: 'cross-dissolve' }}
        priority="high"
        cachePolicy="memory-disk"
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}
