# TORA WATT — mağaza yayını (iç test)

Bu dosya App Store Connect ve Play Console'da doldurulacak alanların
hazır karşılıklarını tutuyor. Hedef: **iç test** (TestFlight iç testçiler +
Play iç test). Bu aşamada Apple incelemesi yok, Play incelemesi yok.

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
| Yaklaşık ve kesin konum | Yakındaki istasyonları ve mesafeyi göstermek | Sorgu olarak istasyon API'sine (`testmobileapi2.torasarj.net`); kendi sunucumuzda saklanmıyor |
| Uygulama etkileşimleri | Favoriler, rezervasyonlar, şarj geçmişi, araç bilgileri | torawatt-api.onrender.com |
| Cihaz veya diğer kimlikler | Hesap açmadan önce oluşturulan verinin yeni hesaba taşınması | aynı |
| Kilitlenme günlükleri / tanılama | Hata ayıklama | Sunucu loguna yazılır, veritabanına değil |

**Ödeme bilgisi toplanmıyor** — ödeme ekranındaki kartlar tamamen sahte,
gerçek kart numarası hiçbir zaman girilmiyor. Finansal veri işaretleme.

Verinin aktarımda şifrelendiğini (HTTPS) ve kullanıcının silme talebinde
bulunabileceğini işaretle.

## Apple — Uygulama Gizliliği

Play tablosunun karşılığı. Hiçbiri izleme (tracking) amaçlı değil,
"Uygulama İşlevselliği" seçilecek:

- İletişim Bilgileri → E-posta Adresi, Ad — kimliğe bağlı
- Konum → Kesin Konum — kimliğe bağlı **değil**
- Tanımlayıcılar → Kullanıcı Kimliği — kimliğe bağlı
- Kullanım Verileri → Ürün Etkileşimi — kimliğe bağlı
- Tanılama → Kilitlenme Verileri, Performans Verileri — kimliğe bağlı değil

"Verileriniz sizi izlemek için kullanılıyor mu?" → **Hayır**.

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
TORA şarj istasyonlarını haritada bul, soketlerini ve gücünü gör.
```

**Uzun açıklama**

```
TORA WATT, TORA şarj ağındaki istasyonları elektrikli aracınla bulmanı sağlar.

• Türkiye genelindeki TORA istasyonları haritada — 17 ilde 68 istasyon
• Her istasyonun soketleri: tip (Type 2, CCS2, CHAdeMO), güç ve soket numarası
• İstasyon künyesi: işletmeci, lisans numarası, dağıtım şirketi, erişim bilgisi
• Konumuna en yakın istasyonlar mesafeye göre sıralı
• Tek dokunuşla yol tarifi
• Favori istasyonlarını kaydet
• Aracını tanımla, uygun soketleri kolayca ayırt et

İstasyon bilgileri ulusal şarj ağı kataloğundan (EPDK) geliyor ve olduğu gibi
gösteriliyor; tahmin edilen hiçbir veri yok.
```

**Anahtar kelimeler (App Store, virgülle, en fazla 100 karakter)**

```
şarj,elektrikli araç,şarj istasyonu,EV,tora,elektrik,harita,soket,menzil
```

**Kategori:** Seyahat (birincil) / Yardımcı Programlar (ikincil)

## Ekran görüntüleri

Play iç test için en az 2 telefon görüntüsü, App Store için 6,9" iPhone
(1320×2868) görüntüleri gerekiyor. Önerilen sıra:

1. Harita, istasyon iğneleriyle
2. Açılan panelde istasyon listesi
3. İstasyon detayı — soketler ve künye
4. Favoriler
5. Araç profili

iOS görüntülerini kendi iPhone'undan TestFlight yapısıyla almak en doğrusu.

`play-feature-graphic.png` (1024×500) Play'in "Öne çıkan grafik" alanı için
bu klasörde hazır.

## Bilinen sınırlar (iç testte bilinçli bırakıldı)

- **Ödeme, şarj başlatma ve rezervasyon simülasyon.** Kartlar sahte, şarj
  ilerlemesi uygulama içinde üretiliyor, rezervasyon onayı taklit ediliyor.
  Halka açık yayına çıkmadan önce ya gerçek EVCS entegrasyonu yapılmalı ya
  da bu akışlar gizlenmeli — Apple 2.2 ve 4.2 bunları reddediyor.
- **İstasyon verisi test sunucusundan** (`testmobileapi2.torasarj.net`)
  geliyor. Yayın adresi belli olunca EAS ortam değişkeni güncellenip
  `eas update` ile mağazadaki sürüme de ulaştırılabilir.
- **Backend Render'ın ücretsiz katmanında.** 15 dk isteksiz kalınca uyuyor,
  uyanması ölçülen 22,5 saniye. Uygulama bunu biliyor (90 sn zaman aşımı +
  önden uyandırma isteği), ama ilk giriş yavaş görünür.
- **Gizlilik politikası konumdan söz etmiyor.** Sayfa mobil uygulamayı anıyor
  ama konum verisi geçmiyor; mağaza formlarında konum topladığımızı beyan
  ediyoruz. Halka açık yayından önce sayfaya şu anlamda bir paragraf eklenmeli:
  uygulama, yakındaki şarj istasyonlarını ve mesafeyi gösterebilmek için
  kullanıcının konumunu yalnızca uygulama açıkken işler, bu veriyi saklamaz.
