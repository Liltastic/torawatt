import type { Station } from '@/types/domain';

import { formatDate } from './format';

export interface InfoRowData {
  label: string;
  value: string;
}

/**
 * Katalog istasyonunun kunyesi (bkz. services/evcs.ts). Kendi
 * istasyonlarimizda bos doner; ekranlar bu satirlari adresin altina ekler.
 * Bos alanlar hic yazilmiyor: "Belirtilmemis" satirlari kunyeyi okunmaz
 * yapiyordu.
 */
export function catalogInfoRows(station: Station): InfoRowData[] {
  const catalog = station.catalog;
  if (!catalog) return [];

  const rows: InfoRowData[] = [];
  const push = (label: string, value?: string) => {
    if (value) rows.push({ label, value });
  };

  push('İl', catalog.province);
  // Marka adi zaten baslikta; burada kaydin sahibi olan tuzel kisi.
  push('Ticari unvan', catalog.operatorLegalName);
  push('İstasyon no', catalog.stationNo);
  push('Lisans no', catalog.licenseNo);
  push('Dağıtım şirketi', catalog.distributionCompany);
  push(
    'Erişim',
    catalog.publicAccess == null
      ? undefined
      : catalog.publicAccess
        ? 'Herkese açık'
        : 'Sınırlı (site/kurum içi)',
  );
  push(
    'Yenilenebilir enerji',
    catalog.greenEnergy == null ? undefined : catalog.greenEnergy ? 'Evet' : 'Hayır',
  );
  push('Katalog kaydı', catalog.lastSeenAt ? formatDate(catalog.lastSeenAt) : undefined);

  return rows;
}
