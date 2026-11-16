import { Router } from 'express';

/**
 * Hesap ve veri silme sayfasi.
 *
 * Google Play, hesap acilabilen uygulamalardan uygulama yuklu olmadan da silme
 * talebi yapilabilen bir web sayfasi istiyor ve adresini Veri guvenligi formuna
 * yazdiriyor. Sayfa uygulamanin ya da gelistiricinin adini ve adimlari acikca
 * gostermeli. Metin store/YAYIN.md'deki "Hesap silme sayfasi" bolumuyle ayni;
 * biri degisirse digeri de guncellenmeli.
 *
 * Silinen veriler auth.ts'teki DELETE /auth/me islemiyle birebir eslesmeli.
 */
export const accountDeletionRouter = Router();

const PAGE = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TORA WATT — Hesap ve veri silme</title>
<style>
  :root { --bg: #f2fbf6; --card: #ffffff; --text: #10231c; --muted: #4b5f57; --accent: #0b7d70; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0d1714; --card: #15231e; --text: #e8f3ee; --muted: #a6bab2; --accent: #4fd1bf; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 8px; }
  h2 { font-size: 1.1rem; margin: 28px 0 8px; }
  p, li { color: var(--muted); }
  section { background: var(--card); border-radius: 16px; padding: 4px 20px 16px; margin-top: 16px; }
  a { color: var(--accent); }
  strong { color: var(--text); }
  hr { border: 0; border-top: 1px solid rgba(127,127,127,.25); margin: 32px 0; }
</style>
</head>
<body>
<main>
  <h1>TORA WATT — Hesap ve veri silme</h1>
  <p>TORA WATT uygulaması Tora Teknik Hizmetler İşletme A.Ş. tarafından geliştirilir. Hesabını ve ona bağlı verileri iki yolla silebilirsin.</p>

  <section>
    <h2>Uygulamadan</h2>
    <p><strong>Profil &gt; Ayarlar &gt; Hesabı sil</strong> adımlarını izle ve onayla. Hesabın hemen silinir.</p>
  </section>

  <section>
    <h2>Uygulama olmadan</h2>
    <p>Hesabına kayıtlı e-posta adresinden <a href="mailto:info@torasarj.com?subject=TORA%20WATT%20hesap%20silme">info@torasarj.com</a> adresine <strong>"TORA WATT hesap silme"</strong> konulu bir e-posta gönder. Talebini en geç 30 gün içinde yerine getirir ve sonucu e-postayla bildiririz.</p>
  </section>

  <section>
    <h2>Silinen veriler</h2>
    <p>E-posta adresin, adın, şifren, kayıtlı araçların, favori istasyonların ve destek mesajların.</p>
    <h2>Saklanan veriler</h2>
    <p>Uygulama hata kayıtları sunucu günlüklerinde, barındırma hizmetinin saklama süresi boyunca kalır ve sonra otomatik olarak silinir.</p>
  </section>

  <hr>

  <h2>English</h2>
  <p>TORA WATT is developed by Tora Teknik Hizmetler İşletme A.Ş. To delete your account and its data, open <strong>Profil &gt; Ayarlar &gt; Hesabı sil</strong> in the app, or email <a href="mailto:info@torasarj.com?subject=TORA%20WATT%20account%20deletion">info@torasarj.com</a> from your registered address with the subject "TORA WATT account deletion". We complete requests within 30 days. Deleted: email, name, password, saved vehicles, favorite stations and support messages. App error logs stay in server logs for the hosting provider's retention period and are then deleted automatically.</p>
</main>
</body>
</html>
`;

accountDeletionRouter.get('/', (_req, res) => {
  res.type('html').set('Cache-Control', 'public, max-age=3600').send(PAGE);
});
