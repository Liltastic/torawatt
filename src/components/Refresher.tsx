import { RefreshControl, type RefreshControlProps } from 'react-native';

import { colors } from '@/theme';

/**
 * Listelerin "asagi cekip yenile" kontrolu. Tek yerde toplandi ki gostergenin
 * rengi her ekranda ayni olsun; iOS tintColor, Android colors + arka plan
 * kullaniyor.
 *
 * Kullanimi: <ScrollView refreshControl={<Refresher refreshing onRefresh />} />
 *
 * DIKKAT - geri kalan tum proplar RefreshControl'e iletilmek ZORUNDA. Android'de
 * ScrollView bu elemani React.cloneElement ile kopyalayip kendi yerel kaydirma
 * gorunumunu ona CHILDREN olarak veriyor (ve bir style ekliyor). Yalnizca
 * refreshing/onRefresh'i ileten bir sarmalayici children'i yutuyor ve listenin
 * tamami ekrandan kayboluyordu - ilk surumde tam olarak bu oldu.
 */
export function Refresher(props: RefreshControlProps) {
  return (
    <RefreshControl
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      {...props}
    />
  );
}
