package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Postgres, mobil uygulamanin kullandigi veritabanini okuyan kaynak.
//
// TABLO ADLARI: Prisma model adlarini oldugu gibi tablo adi yapiyor ve
// alanlari camelCase birakiyor (bkz. server/prisma/schema.prisma). Postgres
// tirnaksiz tanimlayicilari kucuk harfe cevirdigi icin buradaki her tablo ve
// sutun adi cift tirnak icinde yazilmak ZORUNDA.
//
// DIZILER: sema SQLite'tan tasindigi icin amenities ve connectors gibi
// alanlar gercek dizi degil, JSON METNI. Okurken cozuyoruz.
type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(ctx context.Context, url string) (*Postgres, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_URL cozulemedi: %w", err)
	}
	// Panel tek kullanicili bir arac; havuzu kucuk tutmak Neon'un baglanti
	// butcesini mobil uygulamaya birakiyor.
	cfg.MaxConns = 4
	cfg.MaxConnIdleTime = 2 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("havuz kurulamadi: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("veritabanina ulasilamadi: %w", err)
	}
	return &Postgres{pool: pool}, nil
}

func (p *Postgres) Close() { p.pool.Close() }

// jsonStrings, JSON metni olarak saklanan dizileri cozer. Bozuk ya da bos
// deger tabloyu dusurmesin diye hata yerine bos dizi donuyor.
func jsonStrings(raw string) []string {
	if raw == "" {
		return nil
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func limitOf(q Query) (int, int) {
	limit := q.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	return limit, q.Offset
}

// like, arama kutusunu ILIKE kalibina cevirir.
func like(search string) string { return "%" + search + "%" }

func (p *Postgres) Users(ctx context.Context, q Query) (Page[User], error) {
	limit, offset := limitOf(q)
	const query = `
		SELECT u."id", u."email", COALESCE(u."name", ''), u."createdAt",
		       (SELECT COUNT(*) FROM "Vehicle" v WHERE v."ownerId" = u."id"),
		       (SELECT COUNT(*) FROM "ChargingHistoryEntry" h WHERE h."ownerId" = u."id"),
		       (SELECT COALESCE(SUM(h."energyKwh"), 0) FROM "ChargingHistoryEntry" h WHERE h."ownerId" = u."id"),
		       COUNT(*) OVER ()
		  FROM "User" u
		 WHERE ($1 = '' OR u."email" ILIKE $2 OR COALESCE(u."name", '') ILIKE $2)
		 ORDER BY u."createdAt" DESC
		 LIMIT $3 OFFSET $4`

	rows, err := p.pool.Query(ctx, query, q.Search, like(q.Search), limit, offset)
	if err != nil {
		return Page[User]{}, err
	}
	defer rows.Close()

	page := Page[User]{Items: []User{}}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.Vehicles, &u.Sessions, &u.EnergyKwh, &page.Total); err != nil {
			return Page[User]{}, err
		}
		u.EnergyKwh = round1(u.EnergyKwh)
		page.Items = append(page.Items, u)
	}
	return page, rows.Err()
}

func (p *Postgres) DeleteUser(ctx context.Context, id string) error {
	tag, err := p.pool.Exec(ctx, `DELETE FROM "User" WHERE "id" = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// stationsWithConnectors, istasyonlari ve soketlerini IKI sorguda okur.
//
// Tek JOIN sorgusu istasyonu soket sayisi kadar tekrarlar ve sayfalama
// bozulurdu (LIMIT satiri sayar, istasyonu degil). Once sayfa kadar istasyon
// aliniyor, sonra yalnizca onlarin soketleri.
func (p *Postgres) stationsWithConnectors(ctx context.Context, where string, args []any, limit, offset int) (Page[Station], error) {
	query := fmt.Sprintf(`
		SELECT "id", "name", "address", "operator", "latitude", "longitude", "amenities", COUNT(*) OVER ()
		  FROM "Station" %s
		 ORDER BY "name" ASC
		 LIMIT $%d OFFSET $%d`, where, len(args)+1, len(args)+2)

	rows, err := p.pool.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return Page[Station]{}, err
	}
	defer rows.Close()

	page := Page[Station]{Items: []Station{}}
	index := map[string]int{}
	ids := []string{}
	for rows.Next() {
		var s Station
		var amenities string
		if err := rows.Scan(&s.ID, &s.Name, &s.Address, &s.Operator, &s.Latitude, &s.Longitude, &amenities, &page.Total); err != nil {
			return Page[Station]{}, err
		}
		s.Amenities = jsonStrings(amenities)
		s.Connectors = []Connector{}
		index[s.ID] = len(page.Items)
		ids = append(ids, s.ID)
		page.Items = append(page.Items, s)
	}
	if err := rows.Err(); err != nil {
		return Page[Station]{}, err
	}
	if len(ids) == 0 {
		return page, nil
	}

	connRows, err := p.pool.Query(ctx, `
		SELECT "id", "stationId", "type", "powerKw", "status", "pricePerKwh", "idleFeePerMin"
		  FROM "Connector" WHERE "stationId" = ANY($1) ORDER BY "powerKw" DESC`, ids)
	if err != nil {
		return Page[Station]{}, err
	}
	defer connRows.Close()

	for connRows.Next() {
		var c Connector
		if err := connRows.Scan(&c.ID, &c.StationID, &c.Type, &c.PowerKw, &c.Status, &c.PricePerKwh, &c.IdleFeePerMin); err != nil {
			return Page[Station]{}, err
		}
		if i, ok := index[c.StationID]; ok {
			page.Items[i].Connectors = append(page.Items[i].Connectors, c)
		}
	}
	return page, connRows.Err()
}

func (p *Postgres) Stations(ctx context.Context, q Query) (Page[Station], error) {
	limit, offset := limitOf(q)
	where := `WHERE ($1 = '' OR "name" ILIKE $2 OR "address" ILIKE $2 OR "operator" ILIKE $2)`
	return p.stationsWithConnectors(ctx, where, []any{q.Search, like(q.Search)}, limit, offset)
}

func (p *Postgres) Station(ctx context.Context, id string) (Station, error) {
	page, err := p.stationsWithConnectors(ctx, `WHERE "id" = $1`, []any{id}, 1, 0)
	if err != nil {
		return Station{}, err
	}
	if len(page.Items) == 0 {
		return Station{}, ErrNotFound
	}
	return page.Items[0], nil
}

func (p *Postgres) SaveStation(ctx context.Context, s Station) (Station, error) {
	amenities, err := json.Marshal(s.Amenities)
	if err != nil {
		return Station{}, err
	}
	if s.ID == "" {
		s.ID = fmt.Sprintf("st_%d", time.Now().UnixNano())
	}
	_, err = p.pool.Exec(ctx, `
		INSERT INTO "Station" ("id", "name", "address", "operator", "latitude", "longitude", "amenities")
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT ("id") DO UPDATE SET
			"name" = EXCLUDED."name", "address" = EXCLUDED."address",
			"operator" = EXCLUDED."operator", "latitude" = EXCLUDED."latitude",
			"longitude" = EXCLUDED."longitude", "amenities" = EXCLUDED."amenities"`,
		s.ID, s.Name, s.Address, s.Operator, s.Latitude, s.Longitude, string(amenities))
	if err != nil {
		return Station{}, err
	}
	return p.Station(ctx, s.ID)
}

func (p *Postgres) DeleteStation(ctx context.Context, id string) error {
	tag, err := p.pool.Exec(ctx, `DELETE FROM "Station" WHERE "id" = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) SetConnectorStatus(ctx context.Context, id, status string) error {
	tag, err := p.pool.Exec(ctx, `UPDATE "Connector" SET "status" = $2 WHERE "id" = $1`, id, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) Vehicles(ctx context.Context, q Query) (Page[Vehicle], error) {
	limit, offset := limitOf(q)
	rows, err := p.pool.Query(ctx, `
		SELECT v."id", v."ownerId", COALESCE(u."email", ''), v."make", v."model", v."modelYear",
		       v."batteryCapacityKwh", v."isActive", COUNT(*) OVER ()
		  FROM "Vehicle" v LEFT JOIN "User" u ON u."id" = v."ownerId"
		 WHERE ($1 = '' OR v."make" ILIKE $2 OR v."model" ILIKE $2 OR COALESCE(u."email", '') ILIKE $2)
		 ORDER BY v."createdAt" DESC LIMIT $3 OFFSET $4`,
		q.Search, like(q.Search), limit, offset)
	if err != nil {
		return Page[Vehicle]{}, err
	}
	defer rows.Close()

	page := Page[Vehicle]{Items: []Vehicle{}}
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(&v.ID, &v.OwnerID, &v.OwnerEmail, &v.Make, &v.Model, &v.ModelYear,
			&v.BatteryCapacityKwh, &v.IsActive, &page.Total); err != nil {
			return Page[Vehicle]{}, err
		}
		page.Items = append(page.Items, v)
	}
	return page, rows.Err()
}

func (p *Postgres) Reservations(ctx context.Context, q Query) (Page[Reservation], error) {
	limit, offset := limitOf(q)
	rows, err := p.pool.Query(ctx, `
		SELECT r."id", r."ownerId", COALESCE(u."email", ''), r."stationName", r."connectorLabel",
		       r."startsAt", r."durationMinutes", r."status", COUNT(*) OVER ()
		  FROM "Reservation" r LEFT JOIN "User" u ON u."id" = r."ownerId"
		 WHERE ($1 = '' OR r."stationName" ILIKE $2 OR COALESCE(u."email", '') ILIKE $2)
		   AND ($3 = '' OR r."status" = $3)
		 ORDER BY r."startsAt" DESC LIMIT $4 OFFSET $5`,
		q.Search, like(q.Search), q.Status, limit, offset)
	if err != nil {
		return Page[Reservation]{}, err
	}
	defer rows.Close()

	page := Page[Reservation]{Items: []Reservation{}}
	for rows.Next() {
		var r Reservation
		if err := rows.Scan(&r.ID, &r.OwnerID, &r.OwnerEmail, &r.StationName, &r.ConnectorLabel,
			&r.StartsAt, &r.DurationMinutes, &r.Status, &page.Total); err != nil {
			return Page[Reservation]{}, err
		}
		page.Items = append(page.Items, r)
	}
	return page, rows.Err()
}

func (p *Postgres) SetReservationStatus(ctx context.Context, id, status string) error {
	tag, err := p.pool.Exec(ctx, `UPDATE "Reservation" SET "status" = $2 WHERE "id" = $1`, id, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) Sessions(ctx context.Context, q Query) (Page[Session], error) {
	limit, offset := limitOf(q)
	rows, err := p.pool.Query(ctx, `
		SELECT h."id", h."ownerId", COALESCE(u."email", ''), h."stationName", h."connectorLabel",
		       h."startedAt", h."endedAt", h."durationMinutes", h."energyKwh", h."pricePerKwh", h."cost",
		       COUNT(*) OVER ()
		  FROM "ChargingHistoryEntry" h LEFT JOIN "User" u ON u."id" = h."ownerId"
		 WHERE ($1 = '' OR h."stationName" ILIKE $2 OR COALESCE(u."email", '') ILIKE $2)
		 ORDER BY h."startedAt" DESC LIMIT $3 OFFSET $4`,
		q.Search, like(q.Search), limit, offset)
	if err != nil {
		return Page[Session]{}, err
	}
	defer rows.Close()

	page := Page[Session]{Items: []Session{}}
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.OwnerID, &s.OwnerEmail, &s.StationName, &s.ConnectorLabel,
			&s.StartedAt, &s.EndedAt, &s.DurationMinutes, &s.EnergyKwh, &s.PricePerKwh, &s.Cost,
			&page.Total); err != nil {
			return Page[Session]{}, err
		}
		page.Items = append(page.Items, s)
	}
	return page, rows.Err()
}

func (p *Postgres) Campaigns(ctx context.Context, q Query) (Page[Campaign], error) {
	limit, offset := limitOf(q)
	rows, err := p.pool.Query(ctx, `
		SELECT "id", "title", "description", "discountLabel", "validUntil", "isActive", COUNT(*) OVER ()
		  FROM "Campaign"
		 WHERE ($1 = '' OR "title" ILIKE $2 OR "description" ILIKE $2)
		 ORDER BY "createdAt" DESC LIMIT $3 OFFSET $4`,
		q.Search, like(q.Search), limit, offset)
	if err != nil {
		return Page[Campaign]{}, err
	}
	defer rows.Close()

	page := Page[Campaign]{Items: []Campaign{}}
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.DiscountLabel, &c.ValidUntil, &c.IsActive, &page.Total); err != nil {
			return Page[Campaign]{}, err
		}
		page.Items = append(page.Items, c)
	}
	return page, rows.Err()
}

func (p *Postgres) SaveCampaign(ctx context.Context, c Campaign) (Campaign, error) {
	if c.ID == "" {
		c.ID = fmt.Sprintf("cmp_%d", time.Now().UnixNano())
	}
	_, err := p.pool.Exec(ctx, `
		INSERT INTO "Campaign" ("id", "title", "description", "discountLabel", "validUntil", "isActive")
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT ("id") DO UPDATE SET
			"title" = EXCLUDED."title", "description" = EXCLUDED."description",
			"discountLabel" = EXCLUDED."discountLabel", "validUntil" = EXCLUDED."validUntil",
			"isActive" = EXCLUDED."isActive"`,
		c.ID, c.Title, c.Description, c.DiscountLabel, c.ValidUntil, c.IsActive)
	if err != nil {
		return Campaign{}, err
	}
	return c, nil
}

func (p *Postgres) DeleteCampaign(ctx context.Context, id string) error {
	tag, err := p.pool.Exec(ctx, `DELETE FROM "Campaign" WHERE "id" = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) Support(ctx context.Context, q Query) (Page[SupportRequest], error) {
	limit, offset := limitOf(q)
	rows, err := p.pool.Query(ctx, `
		SELECT s."id", s."ownerId", COALESCE(u."email", ''), s."message", s."createdAt", COUNT(*) OVER ()
		  FROM "SupportRequest" s LEFT JOIN "User" u ON u."id" = s."ownerId"
		 WHERE ($1 = '' OR s."message" ILIKE $2 OR COALESCE(u."email", '') ILIKE $2)
		 ORDER BY s."createdAt" DESC LIMIT $3 OFFSET $4`,
		q.Search, like(q.Search), limit, offset)
	if err != nil {
		return Page[SupportRequest]{}, err
	}
	defer rows.Close()

	page := Page[SupportRequest]{Items: []SupportRequest{}}
	for rows.Next() {
		var s SupportRequest
		if err := rows.Scan(&s.ID, &s.OwnerID, &s.OwnerEmail, &s.Message, &s.CreatedAt, &page.Total); err != nil {
			return Page[SupportRequest]{}, err
		}
		page.Items = append(page.Items, s)
	}
	return page, rows.Err()
}

// Overview, panoyu besleyen ozetler.
//
// Hesap Go tarafinda yapiliyor, SQL'de degil: gunluk kovalar, onceki donemle
// karsilastirma ve bos gunlerin sifirla doldurulmasi demo kaynagiyla BIREBIR
// ayni kodu paylasiyor (bkz. buildOverview), yani iki kaynak ayni sayiyi
// veriyor. Okunan satir sayisi donemle sinirli oldugu icin bu ucuz.
func (p *Postgres) Overview(ctx context.Context, days int) (Overview, error) {
	if days <= 0 {
		days = 7
	}
	// Onceki donemi de karsilastirabilmek icin iki katini okuyoruz.
	from := dayKey(time.Now()).AddDate(0, 0, -(days*2 - 1))

	rows, err := p.pool.Query(ctx, `
		SELECT "stationName", "startedAt", "energyKwh", "cost"
		  FROM "ChargingHistoryEntry" WHERE "startedAt" >= $1`, from)
	if err != nil {
		return Overview{}, err
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.StationName, &s.StartedAt, &s.EnergyKwh, &s.Cost); err != nil {
			return Overview{}, err
		}
		sessions = append(sessions, s)
	}
	if err := rows.Err(); err != nil {
		return Overview{}, err
	}

	stations, err := p.Stations(ctx, Query{Limit: 200})
	if err != nil {
		return Overview{}, err
	}
	bookings, err := p.Reservations(ctx, Query{Limit: 200})
	if err != nil {
		return Overview{}, err
	}

	counts, err := p.counts(ctx)
	if err != nil {
		return Overview{}, err
	}
	return buildOverview(sessions, bookings.Items, stations.Items, counts, days, time.Now()), nil
}

func (p *Postgres) counts(ctx context.Context) (Counts, error) {
	var c Counts
	err := p.pool.QueryRow(ctx, `
		SELECT (SELECT COUNT(*) FROM "User"),
		       (SELECT COUNT(*) FROM "Station"),
		       (SELECT COUNT(*) FROM "Connector"),
		       (SELECT COUNT(*) FROM "Vehicle"),
		       (SELECT COUNT(*) FROM "Reservation"),
		       (SELECT COUNT(*) FROM "Campaign"),
		       (SELECT COUNT(*) FROM "SupportRequest")`).
		Scan(&c.Users, &c.Stations, &c.Connectors, &c.Vehicles, &c.Reservations, &c.Campaigns, &c.Support)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, nil
	}
	return c, err
}
