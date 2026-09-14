import Constants, { ExecutionEnvironment } from 'expo-constants';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * iOS 26'nin gercek native Liquid Glass malzemesi (expo-glass-effect) sadece
 * gercek bir development/production build'de calisir - Expo Go'da bu modulun
 * herhangi bir cagrisi (expo-notifications gibi) hemen fırlatir, cunku native
 * tarafta kayitli degil. Bu yuzden modulu statik `import` ETMIYORUZ: Expo
 * Go'daysak `require` hic calismiyor, native tarafin hic tetiklenmemesini
 * saglar. O ana kadar (Expo Go, Android, eski iOS) BlurView tabanli bir
 * yaklaşimla ayni gorsel hissi taklit ediyoruz.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GlassEffect: any = null;
let glassAvailable = false;

if (Platform.OS === 'ios' && !isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    GlassEffect = require('expo-glass-effect');
    glassAvailable = !!GlassEffect?.isLiquidGlassAvailable?.();
  } catch {
    glassAvailable = false;
  }
}

interface GlassSurfaceProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Gercek Liquid Glass varsa onu, yoksa BlurView yaklaşimini kullanan cam yuzey. */
export function GlassSurface({ style, children }: GlassSurfaceProps) {
  if (glassAvailable && GlassEffect) {
    const { GlassView } = GlassEffect;
    return (
      <GlassView glassEffectStyle="regular" style={style}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView intensity={68} tint="light" style={[styles.fallback, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  // Android'de BlurView bazi surumlerde zayif blurluyor; hafif beyaz katman
  // camsi hissi korur.
  fallback: { backgroundColor: 'rgba(255,255,255,0.38)' },
});
