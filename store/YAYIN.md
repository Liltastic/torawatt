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

### Android (Play iç test)

1. Play Console → Uygulama oluştur. Ad `TORA WATT`, dil Türkçe,
   uygulama türü "Uygulama", ücretsiz.
2. **Uygulama içeriği** bölümündeki formlar (aşağıdaki cevaplar) doldurulmadan
   hiçbir sürüm yayına alınamıyor.
3. Servis hesabı anahtarı: Play Console → Kurulum → API erişimi →
   Google Cloud projesinde servis hesabı oluştur, JSON anahtarı indir,
   Play Console'da "Sürümleri yönet" yetkisi ver. JSON'u depoya **koyma**;
   `eas.json` içindeki `submit.production.android.serviceAccountKeyPath`
   alanına yerel yolunu yaz ya da yükleme sırasında yolu ver.
4. Yükleme:
   ```
   npx eas-cli submit --platform android --latest
   ```
   `eas.json` zaten `track: internal` diyor.

## Play — Veri güvenliği formu

Toplanan her şey uygulamanın çalışması için; reklam yok, veri satışı yok,
üçüncü taraf analitik yok. Hepsi için "Aktarılıyor mu? Evet",
"Kullanıcı silebilir mi? Evet" (Ayarlar → Hesabımı sil).

| Veri türü | Neden | Nereye gidiyor |
| --- | --- | --- |
| E-posta adresi | Hesap oluşturma ve giriş | torawatt-api.onrender.com |
| Ad | İsteğe bağlı profil adı | aynı |
| Arama geçmişi | Rota için yazılan adres | OpenStreetMap servisleri (Nominatim, OSRM); saklanmıyor |
| Uygulama etkileşimleri | Favoriler, araç bilgileri | torawatt-api.onrender.com |
| Cihaz veya diğer kimlikler | Hesap açmadan önce oluşturulan verinin yeni hesaba taşınması | aynı |
| Kilitlenme günlükleri / tanılama | Hata ayıklama | Sunucu loguna yazılır, veritabanına değil |

**Ödeme bilgisi toplanmıyor**, uygulamada ödeme yok. Finansal veri işaretleme.

**Konum toplanmıyor**: mesafe hesabı cihazda yapılıyor, konum hiçbir sunucuya
gönderilmiyor.

Verinin aktarımda şifrelendiğini (HTTPS) ve kullanıcının silme talebinde
bulunabileceğini işaretle.

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

Demo hesap gerekmiyor, uygulama üye olmadan açılıyor. Notlar alanına:

```
This build runs on built-in sample data. Stations whose names start with "Demo"
and their connector statuses are examples and do not represent real chargers.
The app does not start charging sessions or take payments. No login is required:
choose "Üye olmadan devam et" on the first screen.
```

## İçerik derecelendirme

Her iki konsolda da: şiddet yok, cinsellik yok, küfür yok, kumar yok,
kullanıcılar arası iletişim yok, kullanıcı içeriği paylaşımı yok.
Konum paylaşımı sorusuna **evet** (uygulama kullanıcının konumunu
kendisine gösteriyor, başkalarıyla paylaşmıyor). Beklenen sonuç:
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

**Kategori:** Seyahat (birincil) / Yardımcı Programlar (ikincil)

## Ekran görüntüleri

Play iç test için en az 2 telefon görüntüsü gerekiyor. App Store'un zorunlu tuttuğu
iPhone yuvası "Dynamic Island (medium display)", kabul ettiği ölçü 1206×2622; uygulamada
saat olduğu için bir de Apple Watch görüntüsü isteniyor. Hazır dosyalar:
`screenshots/iphone-orta-ekran/` (zorunlu yuva), `screenshots/` kökündeki 1320×2868
kopyalar (isteğe bağlı "large display" yuvası) ve `4-apple-watch.png` (416×496).

`play-feature-graphic.png` (1024×500) Play'in "Öne çıkan grafik" alanı için
bu klasörde hazır.

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
- **Android widget'ı** (`plugins/android/ToraWidgetProvider.kt`) hâlâ test sunucusundaki
  gerçek kataloğu okuyor. Android yayınından önce demo listeye alınmalı.
