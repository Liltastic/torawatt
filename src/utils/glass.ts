import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

/**
 * iOS 26+ Liquid Glass yuzeyleri kullanilabilir mi.
 *
 * Yalnizca iOS: Android'de bu bayrak her zaman false ve o platform uygulamanin
 * kendi markali gorunumunu (beyaz yuzey, turkuaz vurgu) aynen koruyor.
 *
 * Iki kontrol birden: isLiquidGlassAvailable uygulamanin Liquid Glass tasarimini
 * kullanip kullanmadigini, isGlassEffectAPIAvailable ise API'nin gercekten var
 * oldugunu soyluyor - bazi iOS 26 betalarinda API eksik ve cam gorunumu kurmak
 * cokmeye yol aciyor (expo-glass-effect belgesi).
 *
 * Belgedeki bilinen sinir: bir cam gorunumun ya da ust gorunumlerinden birinin
 * opakligi 0 olursa cam hic cizilmiyor. Solarak giren/kaybolan yerlerde cam
 * stili gorunmezken 'none' yapilip gorununce geri aciliyor.
 */
export const GLASS_ENABLED =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
