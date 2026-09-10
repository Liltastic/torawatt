/**
 * DEMO kart katalogu (spec bolum 12).
 *
 * Bunlar tamamen uydurma kartlar; hicbir zaman gercek kart verisi
 * icermeyecekler. PCI uyumlu saglayici secildiginde bu dosya silinip
 * gercek kart girisi saglayicinin kendi guvenli SDK/webview'i uzerinden
 * yapilacak (bkz. src/app/payment/methods.tsx uyarisi).
 */
export interface DemoCard {
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

export const demoCardCatalog: DemoCard[] = [
  { brand: 'Visa', last4: '4242', expiryMonth: 12, expiryYear: 2029 },
  { brand: 'Mastercard', last4: '5454', expiryMonth: 8, expiryYear: 2028 },
  { brand: 'Troy', last4: '9792', expiryMonth: 3, expiryYear: 2030 },
];
