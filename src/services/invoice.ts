import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { colors } from '@/theme';
import type { ChargingHistoryDetail } from '@/types/domain';
import {
  formatDate,
  formatEnergy,
  formatMinutes,
  formatPrice,
  formatTime,
} from '@/utils/format';

/**
 * Sarj ozeti belgesi (spec bolum 13).
 *
 * ONEMLI: Bu bir DEMO belgesidir, resmi fatura DEGILDIR. Gercek fatura
 * mali muhur, fatura numarasi, vergi kimlik bilgileri ve e-Arsiv/e-Fatura
 * entegrasyonu gerektirir; onlari uydurmak yanlis olurdu. Belgenin uzerinde
 * ve dosya adinda demo oldugu acikca yaziyor.
 */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildHtml(item: ChargingHistoryDetail): string {
  const energyCost = item.energyKwh * item.pricePerKwh;
  const extras = item.cost - energyCost;

  const row = (label: string, value: string, strong = false) => `
    <tr class="${strong ? 'strong' : ''}">
      <td class="label">${escapeHtml(label)}</td>
      <td class="value">${escapeHtml(value)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 32px; }
  body {
    font-family: -apple-system, "Helvetica Neue", Roboto, sans-serif;
    color: ${colors.text};
    font-size: 13px;
  }
  .demo {
    background: ${colors.warningSoft};
    border: 1.5px solid ${colors.warning};
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 24px;
  }
  .demo b { display: block; font-size: 14px; margin-bottom: 3px; }
  .brand { font-size: 26px; font-weight: 800; letter-spacing: 1px; }
  .brand span { color: ${colors.primary}; }
  .sub { color: ${colors.textSecondary}; margin-top: 2px; }
  h2 { font-size: 14px; margin: 26px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 9px 0; border-bottom: 1px solid ${colors.border}; }
  td.label { color: ${colors.textSecondary}; }
  td.value { text-align: right; font-weight: 600; }
  tr.strong td { font-size: 16px; border-bottom: none; padding-top: 14px; }
  tr.strong td.value { color: ${colors.primaryDark}; font-weight: 800; }
  .foot { margin-top: 32px; color: ${colors.textTertiary}; font-size: 11px; line-height: 1.5; }
</style>
</head>
<body>
  <div class="demo">
    <b>DEMO BELGE — RESMİ FATURA DEĞİLDİR</b>
    Bu belge yalnızca uygulama geliştirme amacıyla üretilmiştir. Mali değeri yoktur,
    muhasebe veya vergi işlemlerinde kullanılamaz.
  </div>

  <div class="brand">TORA <span>WATT</span></div>
  <div class="sub">Şarj oturumu özeti</div>

  <h2>Oturum</h2>
  <table>
    ${row('İstasyon', item.stationName)}
    ${row('Soket', item.connectorLabel)}
    ${row('Tarih', formatDate(item.startedAt))}
    ${row('Başlangıç', formatTime(item.startedAt))}
    ${row('Bitiş', formatTime(item.endedAt))}
    ${row('Süre', formatMinutes(item.durationMinutes))}
  </table>

  <h2>Ücret dökümü</h2>
  <table>
    ${row('Alınan enerji', formatEnergy(item.energyKwh))}
    ${row('Birim fiyat', `${formatPrice(item.pricePerKwh)} / kWh`)}
    ${row('Enerji bedeli', formatPrice(energyCost))}
    ${row('Ek ücretler', extras > 0.005 ? formatPrice(extras) : 'Yok')}
    ${row('Toplam', formatPrice(item.cost), true)}
  </table>

  <div class="foot">
    Belge no: ${escapeHtml(item.id)}<br />
    Oluşturulma: ${escapeHtml(formatDate(new Date().toISOString()))}<br /><br />
    Gerçek fatura, faturalandırma servisi ve e-Arşiv entegrasyonu tamamlandığında
    bu ekrandan alınabilecek.
  </div>
</body>
</html>`;
}

/** Belgeyi PDF olarak uretip paylasim sayfasini acar. */
export async function shareInvoice(item: ChargingHistoryDetail): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: buildHtml(item) });

  // printToFileAsync dosyayi cache/Print/ altina rastgele bir adla koyuyor.
  // Android'in paylasim saglayicisi o alt klasoru okuyamiyor; ayrica kullanici
  // dosyanin demo oldugunu adindan da gorsun diye kok cache'e tasiyoruz.
  const target = new File(Paths.cache, `TORA-WATT-DEMO-${item.id}.pdf`);
  if (target.exists) target.delete();
  new File(uri).move(target);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(target.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Şarj özeti (demo)',
      UTI: 'com.adobe.pdf',
    });
  }
}
