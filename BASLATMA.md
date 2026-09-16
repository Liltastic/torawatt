# TORA WATT'ı çalıştırma

Sistem üç parçadan oluşuyor: **emülatör**, **Metro** (paket sunucusu) ve
**uygulama**. Backend bunlara dahil değil — `torawatt-api.onrender.com`
adresinde kendi başına çalışıyor, lokalde bir şey başlatmana gerek yok.

## En kısa yol

PowerShell aç:

```powershell
cd "C:\Users\Akin\Documents\mobil app gelistirme ilk deneme\tora-watt"
npm start
```

Metro açılır ve bir QR kod basar. Sonra aynı terminalde:

- **`a`** tuşu → Android emülatöründe açar. Emülatör kapalıysa Expo onu kendisi
  başlatır, Expo Go'yu açar ve paketi yükler. İlk yükleme 30-60 saniye sürer.
- **QR kod** → iPhone'daki Expo Go ile okut. Telefon ve bilgisayar aynı Wi-Fi
  ağında olmalı.

Terminalde işine yarayacak diğer tuşlar: `r` yeniden yükle, `j` hata ayıklayıcıyı
aç, `Ctrl+C` Metro'yu kapat.

## Emülatörü elle başlatmak

`a` tuşu emülatörü bulamazsa kendin başlat:

```powershell
Start-Process "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd","voltla"
```

Hazır olup olmadığını kontrol et:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Çıktıda `emulator-5554   device` görmelisin. Açılışı bitene kadar bir süre
`offline` yazabilir, normal.

## iPhone'da test

İki yol var.

**Canlı geliştirme.** Metro açıkken QR'ı Expo Go ile okut. Bu makinede iki ağ
adresi var (`192.168.108.143` gerçek Wi-Fi, `172.26.16.1` sanal adaptör); Metro
yanlışını seçerse telefon bağlanamaz. O durumda terminalde `s` ile bağlantı
türünü değiştir ya da `npx expo start --tunnel` ile başlat.

**Yayınlanmış sürüm.** Metro gerekmez, telefon her yerde çalışır:

```powershell
npx eas-cli update --branch production --environment production --message "ne değişti"
```

Sonra Expo Go'yu tamamen kapatıp yeniden aç.

## Kapatmak

- Metro: terminalde `Ctrl+C`.
- Emülatör: pencereyi kapat, ya da

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" emu kill
```

## Takılırsa

| Belirti | Çözüm |
| --- | --- |
| `Port 8081 already in use` | `netstat -ano \| findstr :8081` ile PID'i bul, `taskkill /PID <pid> /F` |
| `adb devices` boş, `offline` ya da `authorizing` | `adb kill-server` sonra `adb start-server`; düzelmezse emülatörü kapatıp `-no-snapshot-load` ile aç |
| Emülatör hiç açılmıyor | Görev yöneticisinde `qemu-system-x86_64` sürecini bitir, tekrar dene |
| Uygulama "Sunucu yanıt vermedi" diyor | API Render'ın ücretsiz katmanında ve 15 dakika sonra uyuyor; ilk istek 30-90 saniye sürebilir |
| Paket yüklenmiyor, ekran boş | Metro'yu `npx expo start --clear` ile yeniden başlat |

## Notlar

- Emülatördeki **Expo Go**'da senin hesabın açık.
- Emülatörde ayrıca `com.voltla.app` adlı eski bir derleme duruyor. Açılışta
  "rooted device" uyarısı veriyor ve OK'a basınca kapanıyor; onu kullanma,
  Expo Go yeterli. Proje `expo-dev-client` kullanmıyor.
- `.env` yalnızca lokal Metro'yu besler. Yayınlanan sürümler EAS ortam
  değişkenlerini kullanır; yeni bir `EXPO_PUBLIC_*` eklersen `eas env:set` ile
  oraya da eklemen gerekir, yoksa telefonda boş gelir.
- Yayınlamadan önce `npm run verify` (tip kontrolü + harita betiği kontrolü).
