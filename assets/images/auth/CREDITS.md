# Karşılama / giriş / kayıt ekranı arka plan görselleri

| Dosya | Kaynak | Fotoğrafçı | Lisans |
| --- | --- | --- | --- |
| `welcome-hero.jpg` | Unsplash, fotoğraf cBHAhaGK_zU (https://unsplash.com/photos/cBHAhaGK_zU) | JUICE | Unsplash License (ticari kullanım serbest, atıf zorunlu değil) |
| `login-hero.jpg` | Pexels, fotoğraf 11554746 (https://www.pexels.com/photo/11554746/) | Daniel Andraski | Pexels License (ticari kullanım serbest, atıf zorunlu değil) |
| `register-hero.jpg` | Unsplash, fotoğraf N2Td7KpIvYc (https://unsplash.com/photos/N2Td7KpIvYc) | Precious Madubuike | Unsplash License (ticari kullanım serbest, atıf zorunlu değil) |

Üçü de 1080×2160 JPEG (telefon oranı), 210-300 KB. Ekranın tamamını kaplarlar:
`expo-image` + `contentFit="cover"` + `contentPosition="center"`, üzerinde tek
bir koyu turkuaz gradyan (bkz. `src/components/AuthBackdrop.tsx`).

Seçim ölçütleri: rakip bir şarj ağının logosu ya da okunabilir yabancı metni
olmayacak, plaka görünmeyecek, gradyanın altında beyaz metin okunur kalacak
kadar koyu bölgeler bulunacak. Reddedilen adaylar arasında EnBW, Mercedes ve
EVNEX markalı şarj üniteleri vardı.
