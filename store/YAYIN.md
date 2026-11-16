# TORA WATT — mağaza yayını

Bu dosya App Store Connect ve Play Console'da doldurulacak alanların
hazır karşılıklarını tutuyor. Hedef: önce iç test (TestFlight + Play iç test),
sonra halka açık App Store yayını.

Uygulamanın kapsamı: haritada örnek istasyonlar, soket durumları, rota planlama
ve üyelik. **Şarj başlatma, ödeme, rezervasyon ve faturalandırma yok.**

**Bu sürüm demo verilerle çalışıyor.** İstasyonlar uygulamanın içinde gömülü, adları
"Demo" ile başlıyor ve gerçek şarj noktalarını göstermiyor. Telefon, saat, widget
ve CarPlay aynı listeyi kullanıyor (`src/data/demoStations.ts`).

## Kimlik

| Alan | Değer |
| --- | --- |
| Uygulama adı | TORA WATT |
| Bundle ID / paket adı | `net.torasarj.torawatt` |
| Apple Takım Kimliği | `F6283R9BSX` (Tora Teknik Hizmetler İşletme A.Ş.) |
| Expo projesi | `@berat.polat/tora-watt` |
| Sürüm | 1.0.0 (yapı numarası EAS tarafından otomatik artırılıyor) |
| Güncelleme kanalı | `production` |
| Gizlilik politikası | https://torasarj.com/kvkk-aydinlatma-metni/ |
| Destek e-postası | info@torasarj.com |
| Destek URL'si (App Store zorunlu) | https://torasarj.com/iletisim/ |
| Telif hakkı (App Store zorunlu) | 2026 Tora Teknik Hizmetler İşletme A.Ş. |
| Üçüncü taraf içeriği | Evet, gerekli haklar var (harita: Mapbox/OpenStreetMap, araç görselleri) |
| Fiyat ve bölge | Ücretsiz, yalnızca Türkiye |

## Yapılacaklar

### iOS (TestFlight)

1. App Store Connect → Uygulamalar → **+** → Yeni Uygulama.
   Platform iOS, ad `TORA WATT`, birincil dil Türkçe, paket kimliği
   `net.torasarj.torawatt`, SKU `torawatt-ios`.
2. Terminalde derleme (Apple hesabına giriş soracak, Mac gerekmiyor):
   ```
   npx eas-cli build --platform ios --profile production
   ```
   EAS dağıtım sertifikasını ve profilini kendisi üretip saklar.
3. Yükleme:
   ```
   npx eas-cli submit --platform ios --latest
   ```
4. App Store Connect → TestFlight → İç Test Grubu oluştur, ekibi ekle.
   İç testçiler için inceleme gerekmiyor; yapı işlendikten sonra
   (10-30 dk) davet gider.

İhracat uyumluluğu sorusu `ITSAppUsesNonExemptEncryption: false` ile
önceden yanıtlandı; her yüklemede tekrar sorulmayacak.

### Android (Google Play)

1. Play Console → Uygulama oluştur. Ad `TORA WATT`, varsayılan dil Türkçe (tr-TR),
   uygulama türü "Uygulama", ücretsiz.
2. Derleme: `npx eas-cli build --platform android --profile production` (AAB üretir).
3. **İlk AAB elle yüklenir.** Google, API ile (`eas submit`) yüklemeye ancak ilk
   yüklemeden sonra izin veriyor: Test → Dahili test → Yeni sürüm oluştur → AAB'yi sürükle.
4. **Uygulama içeriği** formları (aşağıdaki cevaplar) doldurulmadan hiçbir sürüm
   yayına alınamıyor.
5. Üretime çıkış: hesap 13 Kasım 2023'ten sonra açılmış **kişisel** bir geliştirici
   hesabıysa önce en az 12 test kullanıcısıyla 14 gün kesintisiz kapalı test gerekiyor.
   Kuruluş (D-U-N-S'li şirket) hesabında bu şart yok.
6. Sonraki yüklemeler için servis hesabı: Play Console → Kurulum → API erişimi →
   Google Cloud projesinde servis hesabı oluştur, JSON anahtarı indir, "Sürümleri yönet"
   yetkisi ver. JSON'u depoya **koyma**; yolu `eas.json` içindeki
   `submit.production.android.serviceAccountKeyPath` alanına yaz ya da yükleme sırasında ver.
   Sonra: `npx eas-cli submit --platform android --latest` (`track: internal`).

## Play — Mağaza kaydı

| Alan | Değer |
| --- | --- |
| Uygulama adı | TORA WATT |
| Kısa açıklama | aşağıda "Kısa açıklama" |
| Tam açıklama | aşağıda "Uzun açıklama (Play)" |
| Uygulama simgesi (512×512) | `play/icon-512.png` |
| Öne çıkan görsel (1024×500, saydamlıksız) | `play/feature-graphic.jpg` |
| Telefon ekran görüntüleri (en az 2, oran en fazla 2:1) | `play/screenshots/` |
| Uygulama kategorisi | Haritalar ve Navigasyon |
| E-posta | info@torasarj.com |
| Web sitesi | https://torasarj.com |
| Gizlilik politikası | https://torasarj.com/kvkk-aydinlatma-metni/ |

**Uygulama erişimi:** "Tüm işlevler ya da bazıları kısıtlı" seç, talimat ekle:
ad `Demo hesap`, kullanıcı adı `appreview@torasarj.com`, şifre Play Console'a yazılır
(depoda yok), not: "İlk ekranda 'Zaten hesabım var'a dokunun. Harita ve istasyon
detayları için giriş gerekmez; rota, araç ve favoriler için gerekir."

**Reklamlar:** Hayır. **Reklam kimliği:** Kullanmıyor (pakette `AD_ID` izni yok).
**Hedef kitle:** 18 ve üzeri, çocuklara yönelik değil.
**Haber uygulaması / sağlık / finans özellikleri / devlet uygulaması:** Hayır, hiçbiri.

## Play — Veri güvenliği formu

Reklam yok, veri satışı yok, üçüncü taraf analitik yok. Hepsi için amaç
"Uygulama işlevselliği"; hesapla ilgili olanlar için ayrıca "Hesap yönetimi".

| Play kategorisi → veri türü | Ne | Paylaşılıyor mu | Zorunlu mu |
| --- | --- | --- | --- |
| Kişisel bilgiler → E-posta adresi | Hesap ve giriş | Hayır | Evet |
| Kişisel bilgiler → Ad | Profil adı | Hayır | İsteğe bağlı |
| Kişisel bilgiler → Kullanıcı kimlikleri | Hesap kimliği | Hayır | Evet |
| Mesajlar → Diğer uygulama içi mesajlar | Destek formundan gönderilen mesajlar | Hayır | İsteğe bağlı |
| Uygulama etkinliği → Diğer kullanıcı tarafından oluşturulan içerik | Araç kayıtları, favoriler | Hayır | İsteğe bağlı |
| Uygulama etkinliği → Uygulama içi arama geçmişi | Rota için yazılan adres; OpenStreetMap Nominatim'e gidiyor, saklanmıyor ("geçici olarak işleniyor": Evet) | Evet (Nominatim) | İsteğe bağlı |
| Cihaz veya diğer kimlikler | Hesap açılmadan önceki verinin hesaba taşınması | Hayır | Evet |
| Uygulama bilgileri ve performansı → Kilitlenme günlükleri, Diğer tanılama verileri | Hata kaydı; sunucu günlüğüne yazılıyor, veritabanına değil | Hayır | Evet |

**Konum toplanmıyor**: mesafe cihazda hesaplanıyor, konum hiçbir sunucuya gitmiyor
(rota başlangıcı ve varışı yazılan adreslerden geliyor). **Ödeme bilgisi yok.**

Güvenlik bölümü: veriler aktarımda şifreleniyor (HTTPS) → Evet. Kullanıcı verilerinin
silinmesini isteyebilir → Evet. **Hesap silme URL'si zorunlu**: aşağıdaki "Hesap silme
sayfası" metni web'de yayınlanmalı ve adresi bu alana yazılmalı.

## Hesap silme sayfası (Play zorunlu)

Google, hesap açılabilen uygulamalardan uygulama yüklü olmadan da silme talebi
yapılabilen bir web sayfası istiyor. Sayfa uygulama ya da geliştirici adını ve
adımları açıkça göstermeli. Yayınlanacak metin:

```
TORA WATT — Hesap ve veri silme

TORA WATT uygulaması Tora Teknik Hizmetler İşletme A.Ş. tarafından geliştirilir. Hesabını ve ona bağlı verileri iki yolla silebilirsin.

Uygulamadan
Profil > Ayarlar > Hesabı sil adımlarını izle ve onayla. Hesabın hemen silinir.

Uygulama olmadan
Hesabına kayıtlı e-posta adresinden info@torasarj.com adresine "TORA WATT hesap silme" konulu bir e-posta gönder. Talebini en geç 30 gün içinde yerine getirir ve sonucu e-postayla bildiririz.

Silinen veriler
E-posta adresin, adın, şifren, kayıtlı araçların, favori istasyonların ve destek mesajların.

Saklanan veriler
Uygulama hata kayıtları sunucu günlüklerinde, barındırma hizmetinin saklama süresi boyunca kalır ve sonra otomatik olarak silinir.
```

## Apple — Uygulama Gizliliği

Play tablosunun karşılığı. Hiçbiri izleme (tracking) amaçlı değil,
"Uygulama İşlevselliği" seçilecek:

- İletişim Bilgileri → E-posta Adresi, Ad — kimliğe bağlı
- Kullanıcı İçeriği → Müşteri Desteği — kimliğe bağlı (destek mesajları)
- Arama Geçmişi — kimliğe bağlı **değil** (rota için yazılan adresler)
- Tanımlayıcılar → Kullanıcı Kimliği, Cihaz Kimliği — kimliğe bağlı
- Kullanıcı İçeriği → Diğer Kullanıcı İçeriği — kimliğe bağlı (araç kayıtları, favoriler)
- Teşhis → Kaza Verileri — kimliğe bağlı (hata kaydı kullanıcı kimliğini taşıyor)

Konum listeye girmiyor: cihazdan çıkmıyor.

"Verileriniz sizi izlemek için kullanılıyor mu?" → **Hayır**.

## Apple — İnceleme notu (App Review Information)

Apple 1.0.0 (14) için Guideline 2.1 kapsamında bu bilgileri istedi (2026-11-10). Aynı metin
hem App Review yanıtına hem Notes alanına giriyor. Demo hesabın şifresi depoda tutulmuyor,
App Store Connect'te "Sign-In Information" alanında duruyor.

```
1. Screen recording
Attached. It was captured on a physical iPhone running the latest iOS version and begins with launching the app. It shows the map and station details without an account, then registration, route planning, login and account deletion. The app has no paid content and no content shared between users, so it has no reporting or blocking flow.

2. Purpose and target audience
TORA WATT is for electric vehicle drivers in Türkiye. It helps them find charging stations on a map and see each connector's type, power and status. Members can also save their vehicle and favorite stations, and plan a route with charging stops based on the vehicle's battery and consumption.

This version runs on built-in sample data. Stations whose names start with "Demo" and their connector statuses are examples and do not represent real chargers. The app states this in the station details and in Help. The app does not start charging sessions, sell energy or take payments.

3. Setup and access
No setup is required and login is optional.
- Without an account: on the first screen, tap "Üye olmadan devam et". The "Harita" tab opens.
- Station details: tap a map pin or a list row.
- Demo account: on the first screen, tap "Zaten hesabım var" and sign in.
  Email: appreview@torasarj.com
  Password: <App Store Connect, Sign-In Information>
  This account already has a vehicle and a favorite station.
- Route planning (needs an account with a vehicle): open the "Rota" tab, fill in "Nereden" and "Nereye", then tap "Rotayı planla".
- Account deletion: Profil > Ayarlar > Hesabı sil. Please test this with a new account (first screen > "Hadi başlayalım") so the demo account stays available.
After a period of inactivity, the first server request can take about 30 seconds. The sign-in and registration screens show a waiting notice during this time.

4. External services
- Render: hosts our backend API (accounts, vehicles, favorites, support messages, error reports)
- Mapbox, and OpenFreeMap with MapLibre GL JS loaded from unpkg.com: map styles and tiles, selectable in the app
- OSRM public server and OpenStreetMap Nominatim: route calculation and address search
- carimagesapi.com: vehicle images
- Expo EAS Update: delivery of app updates
The app does not use third-party sign-in, payment processors, advertising, analytics or AI services. Vehicle specifications in the built-in catalog are compiled from public sources.

5. Regional differences
The app works the same in all regions, with no region-specific features or content. The interface is in Turkish and the sample stations are located in Türkiye.

6. Regulated activities and third-party material
The app does not sell energy, operate charging sessions or process payments, so this version does not provide a regulated service. Map data comes from the providers listed above under their terms, and vehicle images come from carimagesapi.com under its API terms. Vehicle makes and models are shown only so users can identify their own car.
```

## İçerik derecelendirme

Her iki konsolda da: şiddet yok, cinsellik yok, küfür yok, kumar yok,
kullanıcılar arası iletişim yok, kullanıcı içeriği paylaşımı yok.
Kullanıcının konumunu başka kullanıcılarla paylaşıyor mu sorusuna **hayır**
(konum yalnızca kullanıcının kendi ekranında gösteriliyor). Beklenen sonuç:
PEGI 3 / Everyone / 3+.

Hedef kitle: 18+ (şarj hizmeti, çocuklara yönelik değil).

## Mağaza metinleri

**Kısa açıklama (Play, en fazla 80 karakter)**

```
Şarj istasyonu bulma deneyimini örnek verilerle dene.
```

**Tanıtım metni (App Store, en fazla 170 karakter)**

```
Şarj istasyonlarını haritada bul, soketlerin tipini, gücünü ve durumunu gör. Bu sürüm örnek verilerle çalışır, gösterilen istasyonlar gerçek değildir.
```

**Uzun açıklama**

```
TORA WATT, elektrikli aracın için şarj istasyonu bulma deneyimini örnek verilerle gösterir.

Bu sürümdeki istasyonlar ve soket durumları ÖRNEK VERİDİR, gerçek şarj noktalarını göstermez. "Demo" ile başlayan noktalara şarj etmek için gitme.

HARİTA VE LİSTE
• İstasyonları haritada ve konumuna göre sıralı listede gör
• Müsait, hızlı, 7/24 açık ve aracına uygun istasyonları filtrele

SOKET BİLGİLERİ
• Soket tipi: Type 2, CCS2, CHAdeMO, NACS
• Güç sınıfı: AC, DC ve yüksek güçlü şarj
• Soket durumu: müsait, dolu, arızalı, çevrimdışı

ÜYELİK
• Harita ve istasyon detayları için üyelik gerekmez
• Üye olursan aracını kaydedebilir, istasyonları favorilerine ekleyebilir ve şarj molalarıyla rota planlayabilirsin
• Hesabını istediğin zaman uygulama içinden silebilirsin

APPLE WATCH VE WIDGET
• En yakın örnek istasyonu saatinde ve ana ekranında gör

TORA WATT üzerinden şarj başlatılmaz ve ödeme alınmaz.
```

**Anahtar kelimeler (App Store, virgülle, en fazla 100 karakter)**

```
şarj,elektrikli araç,şarj istasyonu,EV,rota,harita,soket,menzil,Type 2,CCS
```

**Uzun açıklama (Play)**: yukarıdaki metnin aynısı, yalnızca "APPLE WATCH VE WIDGET"
bölümü yerine şu iki satır:

```
WIDGET
• En yakın örnek istasyonu ana ekranında gör
```

**Kategori:** App Store'da Seyahat (birincil) / Yardımcı Programlar (ikincil),
Play'de Haritalar ve Navigasyon.

## Ekran görüntüleri

**App Store:** zorunlu iPhone yuvası "Dynamic Island (medium display)", kabul ettiği ölçü
1206×2622; uygulamada saat olduğu için bir de Apple Watch görüntüsü isteniyor. Hazır
dosyalar: `screenshots/iphone-orta-ekran/` (zorunlu yuva), `screenshots/` kökündeki
1320×2868 kopyalar (isteğe bağlı "large display" yuvası) ve `4-apple-watch.png` (416×496).

**Google Play:** `play/` klasörü. `icon-512.png` uygulama simgesi, `feature-graphic.jpg`
öne çıkan görsel (1024×500, saydamlıksız; `play-feature-graphic.png` bunun saydam
kaynağı), `screenshots/` altında Android derlemesinden alınmış dört telefon görüntüsü
(1080×1920, JPEG): karşılama, harita listesi, istasyon detayı, rota. Play en az iki
görüntü istiyor ve uzun kenar kısa kenarın iki katını geçemiyor; iPhone görüntüleri bu
yüzden Play'e yüklenemez.

## Bilinen sınırlar

- **Apple büyük ihtimalle reddeder.** Madde 2.2 demo ve deneme sürümlerini App Store'a
  kabul etmiyor, TestFlight'a yönlendiriyor; 4.2 de asgari işlev istiyor. TestFlight iç
  test için engel yok. Halka açık yayın için gerçek istasyon verisi gerekir.
- **Demo adlar ve uyarılar çıkarılmamalı.** Gerçek gibi görünen sahte istasyon, sürücüyü
  olmayan bir şarj noktasına yollar ve Apple'a yanlış beyan olur.
- **Rota servisleri** (`src/services/routing.ts`) herkese açık demo/topluluk sunucuları.
- **Backend Render'ın ücretsiz katmanında.** 15 dk isteksiz kalınca uyuyor,
  uyanması ölçülen 22,5 saniye. Harita bundan etkilenmiyor, ama giriş ve üyelik
  ilk istekte yavaş.
- **Android widget'ı** (`plugins/android/ToraWidgetProvider.kt`) da gömülü demo listeyi
  kullanıyor, ağ isteği yok. Liste değişirse telefon, iOS hedefleri ve bu dosya birlikte
  güncellenmeli.
