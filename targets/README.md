# Apple hedefleri — Watch, complication, widget, CarPlay

TORA WATT'ın telefon dışındaki yüzleri. Hepsi **native Swift**; hiçbiri JS
tarafına native modül sokmuyor, dolayısıyla **Expo Go çalışmaya devam ediyor**.

| Hedef | Yer | Ne yapar |
| --- | --- | --- |
| Saat uygulaması | `targets/watch/` | En yakın TORA istasyonları, detay, harita, yol tarifi |
| Kadran complication'ı | `targets/watch-complication/` | Saat kadranında en yakın istasyon ve mesafe |
| iPhone widget'ı | `targets/widget/` | Ana ekran ve kilit ekranı |
| CarPlay | `plugins/carplay/` | Araç ekranında harita + istasyonlar (bkz. aşağıda) |

## Neden hepsi veriyi kendisi çekiyor

Dördü de EVCS kataloğuna **doğrudan** bağlanıyor; telefonun JS tarafından veri
almıyorlar. Sebebi mimari değil, bir kısıt: paylaşılan veri için JS'e native bir
modül girmesi gerekirdi ve o an Expo Go uygulamayı açamaz hale gelir. Bu yüzden
her hedefin kendi küçük istemcisi var (`EvcsClient`, `EvcsFeed`, `WatchFeed`,
`CarPlayFeed`) — dördü de aynı uca, aynı başlıklarla gidiyor.

Bunun bedeli dosya tekrarı. Tek kaynağa indirmek ortak bir Swift paketi kurmayı
gerektiriyor; dört küçük dosya için kurulması gereken fazla makine.

## Saat uygulaması

watchOS 10+ (Series 4 ve sonrası). Ekran düzeni iki katmanlı: en üstte **en
yakın** istasyon dolu bir kartta, altında diğerleri ince satırlarda. Bilekteki
bakış bir saniye sürüyor ve o bir saniyede sorulan soru hep aynı — "en yakını
nerede, kaç kilometre?".

- Güç sınıfı renkle anlatılıyor (≥150 kW turkuaz, ≥50 yeşil, ≥22 turuncu, altı
  gri), böylece sayıyı okumadan hızlı/yavaş ayrımı yapılabiliyor.
- Detayda CarPlay'siz tek önemli eylem var: **Yol tarifi**, Apple Haritalar'ı
  açıyor. Telefonu cebinden çıkarmadan yola koyulmayı sağlıyor.
- Harita, adres satırını okumaktan hızlı anlatıyor: hangi yönde, ne kadar uzakta.
- Liste yenilenince kadran complication'ı da tazeleniyor.

## CarPlay — iki ayrı koşul

**Kod her derlemede projeye giriyor ve derleniyor.** Kullanılmasa bile
derlenmesi önemli: yoksa aylarca dokunulmamış, hiç derlenmemiş bir Swift yığını
birikir ve izin geldiği gün çalışmaz.

**Sahne tanımı ve entitlement yalnızca `TORA_CARPLAY=1` ile ekleniyor.** Sebebi
teknik değil, idari:

> `com.apple.developer.carplay-charging` **Apple'ın yazılı onayına** bağlı.
> Başvuru: <https://developer.apple.com/contact/carplay/> — kategori olarak
> "EV charging" seçilecek.

Onay gelmeden entitlement'i profile koymak imzalamayı düşürür; bayrak bu yüzden
var. Onay geldiğinde yapılacak tek şey EAS ortamına `TORA_CARPLAY=1` eklemek.

**İlk CarPlay'li derlemede doğrulanacak:** eklenti `UIApplicationSceneManifest`
içine yalnızca CarPlay rolünü yazıyor, telefon sahnesine dokunmuyor. Expo'nun
uygulama delegesi pencereyi klasik yoldan kurduğu için burada uydurulacak bir
`UISceneDelegate` adı telefon arayüzünü açılmaz hale getirirdi. Telefon tarafının
hâlâ açıldığı ilk derlemede görülmeli.

### Araç ekranı tasarımı

Sürücü bir şeye en fazla birkaç saniye bakabilir. Bu yüzden tek bir harita
şablonu var (`CPPointOfInterestTemplate` — Apple'ın tam bu iş için tasarladığı
şablon) ve her istasyonun **tek** birincil eylemi: yol tarifi. Arama, süzgeç,
ayar yok; sürerken kimse onları kullanamaz. Liste beş dakikada bir kendini
yeniliyor, çünkü araç hareket halinde ve mesafeler durduğu yerde kalmamalı.

## Derleme

Hedefler `@bacons/apple-targets` ile projeye giriyor; `targets/*` altındaki her
klasör kendiliğinden bulunuyor. CarPlay ise `plugins/withToraCarPlay.js` ile ana
hedefe ekleniyor (dosyalar kopyalanıyor **ve** pbxproj'a kaydediliyor — Xcode
yalnızca kayıtlı dosyaları derler).

```bash
npx eas-cli build --platform ios --profile production
```

**Yeni bir hedef eklendiğinde ilk derleme etkileşimli olmalı:** EAS o hedef için
Apple hesabında App ID ve provisioning profile oluşturuyor, bu da oturum
istiyor. `--non-interactive` ile çalıştırılırsa "Credentials are not set up"
hatasıyla durur.
