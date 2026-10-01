/**
 * Sagdan acilan detay paneli.
 *
 * Neden ayri sayfa degil: yonetici bir satira bakarken listedeki yerini
 * kaybetmemeli. Panel kapandiginda tablo aradigi satirla, ayni kaydirma
 * konumunda duruyor.
 */
import { useEffect, type ReactNode } from 'react';

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Esc ile kapanmali: panel acikken klavyeyi kullanan birinin elini fareye
  // atmasi gerekmesin.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="drawer__scrim" onClick={onClose} aria-label="Kapat" type="button" />
      <aside className="drawer__panel">
        <header className="drawer__head">
          <div style={{ minWidth: 0 }}>
            <div className="drawer__title">{title}</div>
            {subtitle && <div className="drawer__sub">{subtitle}</div>}
          </div>
          <button className="rowbtn" onClick={onClose} type="button">
            Kapat
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__foot">{footer}</footer>}
      </aside>
    </div>
  );
}

/** Detay panelindeki etiket/deger satiri. */
export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="field-row">
      <span className="field-row__label">{label}</span>
      <span className="field-row__value">{value}</span>
    </div>
  );
}

/** Detay panelindeki bolum basligi. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="drawer__section">
      <h3 className="drawer__sectionTitle">{title}</h3>
      {children}
    </section>
  );
}
