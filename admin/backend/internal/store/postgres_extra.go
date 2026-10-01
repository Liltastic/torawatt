package store

import (
	"context"
	"fmt"
	"time"
)

// Bu dosya Postgres kaynaginin detay, siralama ve analiz yetenekleri.

// orderBy, guvenli bir ORDER BY parcasi uretir.
//
// Siralama sutunu SQL metnine giriyor, yani parametre olarak baglanamiyor.
// Bu yuzden disaridan gelen ad ASLA dogrudan kullanilmiyor: yalnizca beyaz
// listedeki karsiligi yaziliyor, eslesme yoksa varsayilana donuluyor.
func orderBy(q Query, allowed map[string]string, fallback string) string {
	column, ok := allowed[q.Sort]
	if !ok {
		return fallback
	}
	if q.Desc {
		return column + " DESC NULLS LAST"
	}
	return column + " ASC NULLS LAST"
}

var (
	userColumns = map[string]string{
		"name":      `COALESCE(u."name", '')`,
		"email":     `u."email"`,
		"createdAt": `u."createdAt"`,
	}
	stationColumns = map[string]string{
		"name":     `"name"`,
		"operator": `"operator"`,
	}
	sessionColumns = map[string]string{
		"startedAt": `h."startedAt"`,
		"station":   `h."stationName"`,
		"user":      `COALESCE(u."email", '')`,
		"duration":  `h."durationMinutes"`,
		"energyKwh": `h."energyKwh"`,
		"cost":      `h."cost"`,
	}
	reservationColumns = map[string]string{
		"startsAt": `r."startsAt"`,
		"station":  `r."stationName"`,
		"user":     `COALESCE(u."email", '')`,
		"duration": `r."durationMinutes"`,
		"status":   `r."status"`,
	}
	vehicleColumns = map[string]string{
		"make":    `v."make"`,
		"year":    `v."modelYear"`,
		"battery": `v."batteryCapacityKwh"`,
		"user":    `COALESCE(u."email", '')`,
	}
)

// --- Detay gorunumleri ---

func (p *Postgres) UserDetail(ctx context.Context, id string) (UserDetail, error) {
	var detail UserDetail
	err := p.pool.QueryRow(ctx, `
		SELECT u."id", u."email", COALESCE(u."name", ''), u."createdAt",
		       (SELECT COUNT(*) FROM "Vehicle" v WHERE v."ownerId" = u."id"),
		       (SELECT COUNT(*) FROM "ChargingHistoryEntry" h WHERE h."ownerId" = u."id"),
		       (SELECT COALESCE(SUM(h."energyKwh"), 0) FROM "ChargingHistoryEntry" h WHERE h."ownerId" = u."id"),
		       (SELECT COALESCE(SUM(h."cost"), 0) FROM "ChargingHistoryEntry" h WHERE h."ownerId" = u."id")
		  FROM "User" u WHERE u."id" = $1`, id).
		Scan(&detail.User.ID, &detail.User.Email, &detail.User.Name, &detail.User.CreatedAt,
			&detail.User.Vehicles, &detail.User.Sessions, &detail.User.EnergyKwh, &detail.TotalSpent)
	if err != nil {
		return UserDetail{}, ErrNotFound
	}
	detail.User.EnergyKwh = round1(detail.User.EnergyKwh)
	detail.TotalSpent = round1(detail.TotalSpent)

	vehicles, err := p.pool.Query(ctx, `
		SELECT "id", "ownerId", "make", "model", "modelYear", "batteryCapacityKwh", "isActive"
		  FROM "Vehicle" WHERE "ownerId" = $1 ORDER BY "isActive" DESC, "createdAt" DESC`, id)
	if err != nil {
		return UserDetail{}, err
	}
	defer vehicles.Close()
	detail.Vehicles = []Vehicle{}
	for vehicles.Next() {
		var v Vehicle
		if err := vehicles.Scan(&v.ID, &v.OwnerID, &v.Make, &v.Model, &v.ModelYear, &v.BatteryCapacityKwh, &v.IsActive); err != nil {
			return UserDetail{}, err
		}
		v.OwnerEmail = detail.User.Email
		detail.Vehicles = append(detail.Vehicles, v)
	}
	if err := vehicles.Err(); err != nil {
		return UserDetail{}, err
	}

	// Son hareketler: detay panelinde butun gecmis degil, okunur bir ozet.
	bookings, err := p.Reservations(ctx, Query{Limit: 10, Sort: "startsAt", Desc: true})
	if err != nil {
		return UserDetail{}, err
	}
	detail.Reservations = []Reservation{}
	for _, r := range bookings.Items {
		if r.OwnerID == id {
			detail.Reservations = append(detail.Reservations, r)
		}
	}

	sessions, err := p.pool.Query(ctx, `
		SELECT h."id", h."stationName", h."connectorLabel", h."startedAt", h."endedAt",
		       h."durationMinutes", h."energyKwh", h."pricePerKwh", h."cost"
		  FROM "ChargingHistoryEntry" h WHERE h."ownerId" = $1
		 ORDER BY h."startedAt" DESC LIMIT 10`, id)
	if err != nil {
		return UserDetail{}, err
	}
	defer sessions.Close()
	detail.Sessions = []Session{}
	for sessions.Next() {
		var s Session
		if err := sessions.Scan(&s.ID, &s.StationName, &s.ConnectorLabel, &s.StartedAt, &s.EndedAt,
			&s.DurationMinutes, &s.EnergyKwh, &s.PricePerKwh, &s.Cost); err != nil {
			return UserDetail{}, err
		}
		s.OwnerID = id
		s.OwnerEmail = detail.User.Email
		detail.Sessions = append(detail.Sessions, s)
	}
	return detail, sessions.Err()
}

func (p *Postgres) StationDetail(ctx context.Context, id string) (StationDetail, error) {
	station, err := p.Station(ctx, id)
	if err != nil {
		return StationDetail{}, err
	}
	detail := StationDetail{Station: station, Sessions: []Session{}}

	// Sarj kaydi istasyonu KIMLIKLE degil ADLA tutuyor (bkz. Prisma semasinda
	// ChargingHistoryEntry.stationName); istasyon silinse bile gecmis okunur
	// kalsin diye oyle tasarlanmis. Bu yuzden eslestirme ad uzerinden.
	err = p.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM("energyKwh"), 0), COALESCE(SUM("cost"), 0)
		  FROM "ChargingHistoryEntry" WHERE "stationName" = $1`, station.Name).
		Scan(&detail.EnergyKwh, &detail.Revenue)
	if err != nil {
		return StationDetail{}, err
	}
	detail.EnergyKwh = round1(detail.EnergyKwh)
	detail.Revenue = round1(detail.Revenue)

	rows, err := p.pool.Query(ctx, `
		SELECT h."id", h."ownerId", COALESCE(u."email", ''), h."connectorLabel", h."startedAt",
		       h."endedAt", h."durationMinutes", h."energyKwh", h."pricePerKwh", h."cost"
		  FROM "ChargingHistoryEntry" h LEFT JOIN "User" u ON u."id" = h."ownerId"
		 WHERE h."stationName" = $1 ORDER BY h."startedAt" DESC LIMIT 10`, station.Name)
	if err != nil {
		return StationDetail{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.OwnerID, &s.OwnerEmail, &s.ConnectorLabel, &s.StartedAt,
			&s.EndedAt, &s.DurationMinutes, &s.EnergyKwh, &s.PricePerKwh, &s.Cost); err != nil {
			return StationDetail{}, err
		}
		s.StationName = station.Name
		detail.Sessions = append(detail.Sessions, s)
	}
	return detail, rows.Err()
}

// --- Soket yonetimi ---

func (p *Postgres) SaveConnector(ctx context.Context, c Connector) (Connector, error) {
	if c.StationID == "" {
		return Connector{}, fmt.Errorf("soket bir istasyona bagli olmali")
	}
	if c.ID == "" {
		c.ID = fmt.Sprintf("%s_c%d", c.StationID, time.Now().UnixNano()%100000)
	}
	_, err := p.pool.Exec(ctx, `
		INSERT INTO "Connector" ("id", "stationId", "type", "powerKw", "status", "pricePerKwh", "idleFeePerMin")
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT ("id") DO UPDATE SET
			"type" = EXCLUDED."type", "powerKw" = EXCLUDED."powerKw",
			"status" = EXCLUDED."status", "pricePerKwh" = EXCLUDED."pricePerKwh",
			"idleFeePerMin" = EXCLUDED."idleFeePerMin"`,
		c.ID, c.StationID, c.Type, c.PowerKw, c.Status, c.PricePerKwh, c.IdleFeePerMin)
	if err != nil {
		return Connector{}, err
	}
	return c, nil
}

func (p *Postgres) DeleteConnector(ctx context.Context, id string) error {
	tag, err := p.pool.Exec(ctx, `DELETE FROM "Connector" WHERE "id" = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Analiz ---

func (p *Postgres) Analytics(ctx context.Context, days int) (Analytics, error) {
	if days <= 0 {
		days = 30
	}
	from := dayKey(time.Now()).AddDate(0, 0, -(days - 1))

	rows, err := p.pool.Query(ctx, `
		SELECT "stationName", "connectorLabel", "startedAt", "durationMinutes", "energyKwh", "cost"
		  FROM "ChargingHistoryEntry" WHERE "startedAt" >= $1`, from)
	if err != nil {
		return Analytics{}, err
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.StationName, &s.ConnectorLabel, &s.StartedAt, &s.DurationMinutes, &s.EnergyKwh, &s.Cost); err != nil {
			return Analytics{}, err
		}
		sessions = append(sessions, s)
	}
	if err := rows.Err(); err != nil {
		return Analytics{}, err
	}
	return buildAnalytics(sessions, days, time.Now()), nil
}
