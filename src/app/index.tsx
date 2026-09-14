import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/auth';

/**
 * Giris noktasi. Oturum durumu (SecureStore token dogrulamasi) root
 * layout'ta zaten cozulmus oluyor (bkz. src/app/_layout.tsx) - burada
 * senkron olarak welcome/map'e yonlendirmek yeterli.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  return <Redirect href={status === 'authenticated' ? '/map' : '/welcome'} />;
}
