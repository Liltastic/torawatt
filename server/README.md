# TORA WATT API

Mobil uygulamanın backend'i. Express + TypeScript + Prisma + SQLite (dev).

## Kurulum

```bash
cd server
npm install
cp .env.example .env   # gerekirse PORT'u degistir
npx prisma migrate dev # veritabanini olusturur
npm run seed           # 11 ornek istasyonu yukler
npm run dev            # http://localhost:4000
```

## Kimlik dogrulama

Gercek bir login akisi henuz yok (spec bolum 22'deki `/auth/*` uclari
yapilmadi). Bunun yerine her mobil kurulum, SecureStore'da kalici rastgele
bir cihaz kimligi tutar ve bunu `x-device-id` basligiyla gonderir
(bkz. `src/lib/deviceId.ts` mobil tarafta, `src/middleware/deviceAuth.ts`
burada). Araclar, rezervasyonlar, gecmis ve odeme yontemleri bu kimlige
gore sahiplenilir.

Bu **gercek bir guvenlik mekanizmasi degildir** — baslik istemci tarafinda
taklit edilebilir. Gercek auth eklendiginde middleware, dogrulanmis bir
JWT'den kullanici id'si cikaracak sekilde degisecek; route kodlari
`req.ownerId` okudugu icin degismeyecek.

## Uclar

| Yontem | Yol | Aciklama |
|---|---|---|
| GET | `/stations` | Tum istasyonlar (herkese acik) |
| GET | `/stations/:id` | Tek istasyon |
| GET/POST | `/vehicles` | Kullanicinin araclari |
| POST | `/vehicles/:id/activate` | Araci aktif yap |
| DELETE | `/vehicles/:id` | Arac sil |
| GET/POST | `/reservations` | Rezervasyonlar |
| PATCH | `/reservations/:id` | Durum degistir (CONFIRMED/ARRIVED/CANCELLED) |
| GET/POST | `/charging-history` | Sarj gecmisi |
| GET/POST | `/payment-methods` | Demo kartlar |
| POST | `/payment-methods/:id/default` | Varsayilan yap |
| DELETE | `/payment-methods/:id` | Kart sil |

## Notlar

- SQLite'ta native dizi yok; `Station.amenities` ve `Vehicle.connectors`
  JSON-metin olarak saklanip `src/lib/serialize.ts` tarafindan cevriliyor.
- Rezervasyon `EXPIRED` durumu veritabaninda tutulmuyor, istekte hesaplaniyor
  (bkz. `effectiveStatus` in `src/lib/serialize.ts`). Sabit,
  mobil taraftaki `RESERVATION_GRACE_MINUTES` ile senkron tutulmali.
- Uretimde `DATABASE_URL`'i bir Postgres baglanti dizesine cevirip
  `schema.prisma`'da `provider`'i `postgresql` yapmak yeterli.
