import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Store'lar icin ortak kalicilik ayari.
 *
 * Bu yalnizca cihaz uzerinde bir onbellek: backend baglandiginda dogruluk
 * kaynagi sunucu olacak, buradaki kayitlar ise cevrimdisi acilista ilk
 * ekrani doldurmak icin kalacak (spec bolum 25).
 *
 * Hassas veri (token, kart) buraya YAZILMAMALI; onlar SecureStore'a ait
 * (spec bolum 26).
 */
export const storage = createJSONStorage(() => AsyncStorage);

/**
 * Kayitli veri sekli degistiginde bunu artir; eski kayitlar atilir.
 * Migration yazmak yerine sifirlamak, henuz veri gercek olmadigi icin yeterli.
 */
export const PERSIST_VERSION = 1;
