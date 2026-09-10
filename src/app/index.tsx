import { Redirect } from 'expo-router';

/**
 * Giris noktasi. Auth eklendiginde burada oturum kontrolu yapilip
 * kullanici ya welcome'a ya da dogrudan haritaya yonlendirilecek.
 */
export default function Index() {
  return <Redirect href="/welcome" />;
}
