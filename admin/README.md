# TORA WATT Yönetim Paneli

Şarj ağını web üzerinden yöneten panel. Backend **Go**, arayüz **React +
[React Cupertino UI](https://react-cupertino-ui.pro/)** (MIT). İkisi tek bir
binary'de: arayüz derlenip Go'nun içine gömülüyor, dağıtımda yanına hiçbir şey
koymak gerekmiyor.

![Panel](docs/admin-panel.png)

![Analiz](docs/admin-analiz.png)

![İstasyon detayı](docs/admin-istasyon-detay.png)

## Hızlı başlangıç

**PowerShell** (Windows'un varsayılanı). Bu sürümde `&&` bir komut ayracı
değil, o yüzden satırlar ayrı ayrı yazılıyor:

```powershell
# 1. Arayüzü derle (çıktı doğrudan backend'in gömdüğü klasöre yazılır)
cd admin\web
npm install
npm run build

# 2. Binary'yi üret
cd ..\backend
go build -o toraadmin.exe ./cmd/toraadmin

# 3. Çalıştır - veritabanı vermezsen örnek veriyle açılır
$env:ADMIN_PASSWORD = "güçlü-bir-parola"
.\toraadmin.exe
```

**Git Bash / Linux / macOS**:

```bash
cd admin/web && npm install && npm run build
cd ../backend && go build -o toraadmin ./cmd/toraadmin
ADMIN_PASSWORD="güçlü-bir-parola" ./toraadmin
```

Panel `http://localhost:8090` adresinde. Giriş: `admin@torawatt.local` ve
verdiğin parola.

## Gerçek veriye bağlamak

`DATABASE_URL` verildiği anda panel örnek veriyi bırakıp mobil uygulamanın
veritabanını okur; alt çubuktaki **"Demo veri"** rozeti **"Canlı veri"**
olur.

Bağlantı dizesi zaten `server/.env` içinde duruyor; elle kopyalamaya gerek yok:

```powershell
# admin\backend klasöründeyken
$env:DATABASE_URL = (Get-Content ..\..\server\.env |
  Where-Object { $_ -like 'DATABASE_URL=*' }) -replace '^DATABASE_URL=', '' -replace '^"|"$', ''
$env:ADMIN_PASSWORD = "..."
.\toraadmin.exe
```

```bash
export DATABASE_URL=$(grep '^DATABASE_URL=' ../../server/.env | cut -d= -f2- | tr -d '"')
ADMIN_PASSWORD="..." ./toraadmin
```

Açılışta logda `veritabanina baglaniliyor...` görürsün; `DATABASE_URL yok` yazıyorsa
değişken boş kalmış demektir.

Şema değişikliği **gerekmiyor**: panel mobil uygulamanın mevcut tablolarını
(`User`, `Station`, `Connector`, `Vehicle`, `Reservation`,
`ChargingHistoryEntry`, `Campaign`, `SupportRequest`) okuyor ve yazıyor. Yeni
tablo eklenmedi, migration çalıştırmıyor.

## Ayarlar

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `ADMIN_PASSWORD` | — | Zorunlu (ya da `ADMIN_PASSWORD_HASH`). Düz parola açılışta bcrypt'lenir. |
| `ADMIN_PASSWORD_HASH` | — | Üretimde tercih edilen yol: parolayı ortamda düz tutmamak için. |
| `ADMIN_EMAIL` | `admin@torawatt.local` | Giriş e-postası. |
| `DATABASE_URL` | boş | Boşsa örnek veri. |
| `ADMIN_ADDR` | `:8090` | Dinlenen adres. |
| `ADMIN_JWT_SECRET` | rastgele | Verilmezse her yeniden başlatmada oturumlar düşer. |
| `ADMIN_SESSION_HOURS` | `12` | Oturum süresi. |
| `ADMIN_DEV_PROXY` | boş | Arayüzü Vite'tan servis eder (aşağıya bak). |

## Geliştirme

İki süreç: Go API'yi, Vite arayüzü verir ve anlık yeniler.

```powershell
# 1. terminal
cd admin\backend
$env:ADMIN_PASSWORD = "dev"
go run ./cmd/toraadmin

# 2. terminal
cd admin\web
npm run dev                     # http://localhost:5180
```

Vite `/api` isteklerini 8090'a geçiriyor, yani arayüzde çalışırken Go'yu
yeniden derlemek gerekmiyor.

## Neler yönetiliyor

| Bölüm | Yapılabilenler |
| --- | --- |
| **Panel** | Enerji, oturum, ciro, doluluk; dönem grafiği (7/30/90 gün), en yoğun istasyonlar, yaklaşan rezervasyonlar |
| **Analiz** | İstasyona, soket tipine ve günün saatine göre kırılım; günlük ciro eğrisi; oturum başına ortalama enerji/ciro/süre |
| **İstasyonlar** | **Ekleme ve düzenleme**, detay paneli (konum, toplam enerji/ciro, son oturumlar), **soket ekleme/düzenleme/silme** (tip, güç, fiyat, durum), istasyon silme |
| **Kullanıcılar** | Detay paneli (araçları, son rezervasyonları, son şarj oturumları, toplam harcama), hesap silme |
| **Rezervasyonlar** | Duruma göre süzme, durum ilerletme (onayla / geldi / tamamla / iptal) |
| **Şarj oturumları** | Geçmiş kayıtlar, enerji ve ciro toplamı |
| **Araçlar** | Salt okunur liste (kullanıcının kendi kaydı; teknik değerleri yönetim değiştirmez) |
| **Kampanyalar** | Ekleme, düzenleme, yayından kaldırma, silme |
| **Destek** | Talep listesi (şemada durum alanı yok, salt okunur) |

Her tabloda ortak olanlar:

- **Sıralama** — başlığa tıklayınca sunucu tarafında sıralanır, yani "en çok
  harcayan kullanıcı" sorusu yalnızca görünen sayfanın içinde değil, **tüm
  kayıtlar** arasında cevaplanır.
- **Sayfalama** — 50'şer kayıt; arama ya da sıralama değişince başa döner.
- **CSV dışa aktarım** — ekrandaki aramayı uygular, sayfalamayı uygulamaz:
  "dışa aktar" diyen biri görünen 50 satırı değil aramasına uyan her kaydı
  bekler. Excel için UTF-8 BOM ve noktalı virgül ayracı ile.
- **Detay paneli** — satıra tıklayınca sağdan açılır; liste yerini kaybetmez.

**Ctrl/Cmd + K** her yerden genel aramayı açar: tek kutudan istasyon, kullanıcı
ve bölüm aranır.

## Tasarım

Yerleşim referans tasarımla aynı: sol simge rayı, dört ölçü kartı, geniş
grafik + vurgulu kart, üç kart, sağda profil/takvim/planlananlar, altta sekme
çubuğu. Değişen tek şey renkler — turuncu vurgu yerine markanın turkuazı
(`#0FB5A3`), tokenlar mobil uygulamanın `src/theme/colors.ts` dosyasıyla aynı
değerleri taşıyor. Açık/koyu tema sol alttaki düğmeyle değişiyor.

Grafikler el yazımı SVG (`web/src/components/charts.tsx`): üç sade grafik için
bir grafik kütüphanesinin varsayılanlarıyla boğuşmak yerine tasarımı birebir
veren ~150 satır.

## Güvenlik notları

- Oturum bileti **HttpOnly** çerezde; sayfadaki betikler okuyamıyor.
- Yanlış e-postada da bcrypt karşılaştırması çalışıyor — cevap süresi
  "bu e-posta kayıtlı mı" sorusunu ele vermesin diye.
- JWT'de algoritma sabitlenmiş (`HS256`), `alg: none` kabul edilmiyor.
- Beklenmeyen hataların metni istemciye **gönderilmiyor** (şema/sorgu
  sızdırabilir), sunucu loguna tam haliyle düşüyor.
- CSP, `X-Frame-Options: DENY`, `nosniff` başlıkları her yanıtta.

Panel dış dünyaya açılacaksa TLS'in arkasına koyulmalı: çerez `Secure`
bayrağını yalnızca TLS varken alıyor.

## Bilinen sınırlar

- Tek yönetici hesabı var ve ortam değişkeninden geliyor. Birden fazla
  yönetici için `AdminUser` tablosu ve bir migration gerekir; mobil uygulamayla
  ortak veritabanına izinsiz tablo eklememek için bilerek yapılmadı.
- Destek taleplerinde "çözüldü" işareti yok; şemada alan bulunmuyor.
- Arayüz kütüphanesinin bazı paketleri derin içe aktarma kullanıyor ve
  Rollup bunu çözemiyor; `web/vite.config.ts` içinde takma ad var, kütüphane
  düzelttiğinde kaldırılabilir.
