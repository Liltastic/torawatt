package store

import (
	"context"
	"fmt"
	"strings"
)

// Bu dosya Demo kaynaginin detay, siralama ve analiz yetenekleri.
// Ana kurulum ve temel listeler demo.go icinde.

// --- Siralama karsilastiricilari ---
//
// Her varlik icin hangi sutunlarin siralanabilecegini burasi tanimliyor.
// Arayuz baska bir ad gonderirse sessizce yok sayiliyor (bkz. sortPage).

var userOrder = map[string]func(a, b User) bool{
	"name":      func(a, b User) bool { return strings.ToLower(a.Name) < strings.ToLower(b.Name) },
	"email":     func(a, b User) bool { return a.Email < b.Email },
	"vehicles":  func(a, b User) bool { return a.Vehicles < b.Vehicles },
	"sessions":  func(a, b User) bool { return a.Sessions < b.Sessions },
	"energyKwh": func(a, b User) bool { return a.EnergyKwh < b.EnergyKwh },
	"createdAt": func(a, b User) bool { return a.CreatedAt.Before(b.CreatedAt) },
}

var stationOrder = map[string]func(a, b Station) bool{
	"name":       func(a, b Station) bool { return strings.ToLower(a.Name) < strings.ToLower(b.Name) },
	"operator":   func(a, b Station) bool { return a.Operator < b.Operator },
	"connectors": func(a, b Station) bool { return len(a.Connectors) < len(b.Connectors) },
}

var sessionOrder = map[string]func(a, b Session) bool{
	"startedAt": func(a, b Session) bool { return a.StartedAt.Before(b.StartedAt) },
	"station":   func(a, b Session) bool { return a.StationName < b.StationName },
	"user":      func(a, b Session) bool { return a.OwnerEmail < b.OwnerEmail },
	"duration":  func(a, b Session) bool { return a.DurationMinutes < b.DurationMinutes },
	"energyKwh": func(a, b Session) bool { return a.EnergyKwh < b.EnergyKwh },
	"cost":      func(a, b Session) bool { return a.Cost < b.Cost },
}

var reservationOrder = map[string]func(a, b Reservation) bool{
	"startsAt": func(a, b Reservation) bool { return a.StartsAt.Before(b.StartsAt) },
	"station":  func(a, b Reservation) bool { return a.StationName < b.StationName },
	"user":     func(a, b Reservation) bool { return a.OwnerEmail < b.OwnerEmail },
	"duration": func(a, b Reservation) bool { return a.DurationMinutes < b.DurationMinutes },
	"status":   func(a, b Reservation) bool { return a.Status < b.Status },
}

var vehicleOrder = map[string]func(a, b Vehicle) bool{
	"make":    func(a, b Vehicle) bool { return a.Make+a.Model < b.Make+b.Model },
	"year":    func(a, b Vehicle) bool { return a.ModelYear < b.ModelYear },
	"battery": func(a, b Vehicle) bool { return a.BatteryCapacityKwh < b.BatteryCapacityKwh },
	"user":    func(a, b Vehicle) bool { return a.OwnerEmail < b.OwnerEmail },
}

// --- Detay gorunumleri ---

func (d *Demo) UserDetail(_ context.Context, id string) (UserDetail, error) {
	var detail UserDetail
	found := false
	for _, u := range d.users {
		if u.ID == id {
			detail.User = u
			found = true
			break
		}
	}
	if !found {
		return UserDetail{}, ErrNotFound
	}

	for _, v := range d.vehicles {
		if v.OwnerID == id {
			detail.Vehicles = append(detail.Vehicles, v)
		}
	}
	for _, r := range d.bookings {
		if r.OwnerID == id {
			detail.Reservations = append(detail.Reservations, r)
		}
	}
	for _, s := range d.sessions {
		if s.OwnerID == id {
			detail.Sessions = append(detail.Sessions, s)
			detail.TotalSpent += s.Cost
		}
	}
	detail.TotalSpent = round1(detail.TotalSpent)

	// Listeler kisaltiliyor: detay panelinde son hareketler okunur, butun
	// gecmis degil. Tamami kendi sayfasinda zaten var.
	detail.Reservations = head(detail.Reservations, 10)
	detail.Sessions = head(detail.Sessions, 10)
	return detail, nil
}

func (d *Demo) StationDetail(ctx context.Context, id string) (StationDetail, error) {
	station, err := d.Station(ctx, id)
	if err != nil {
		return StationDetail{}, err
	}

	detail := StationDetail{Station: station}
	for _, s := range d.sessions {
		if s.StationName == station.Name {
			detail.Sessions = append(detail.Sessions, s)
			detail.EnergyKwh += s.EnergyKwh
			detail.Revenue += s.Cost
		}
	}
	detail.EnergyKwh = round1(detail.EnergyKwh)
	detail.Revenue = round1(detail.Revenue)
	detail.Sessions = head(detail.Sessions, 10)
	return detail, nil
}

func head[T any](items []T, n int) []T {
	if len(items) > n {
		return items[:n]
	}
	return items
}

// --- Soket yonetimi ---

func (d *Demo) SaveConnector(_ context.Context, c Connector) (Connector, error) {
	for i := range d.stations {
		if d.stations[i].ID != c.StationID {
			continue
		}
		for j := range d.stations[i].Connectors {
			if d.stations[i].Connectors[j].ID == c.ID {
				d.stations[i].Connectors[j] = c
				return c, nil
			}
		}
		if c.ID == "" {
			c.ID = fmt.Sprintf("%s_c%d", c.StationID, len(d.stations[i].Connectors)+1)
		}
		d.stations[i].Connectors = append(d.stations[i].Connectors, c)
		return c, nil
	}
	return Connector{}, ErrNotFound
}

func (d *Demo) DeleteConnector(_ context.Context, id string) error {
	for i := range d.stations {
		for j, c := range d.stations[i].Connectors {
			if c.ID == id {
				d.stations[i].Connectors = append(d.stations[i].Connectors[:j], d.stations[i].Connectors[j+1:]...)
				return nil
			}
		}
	}
	return ErrNotFound
}

// --- Analiz ---

func (d *Demo) Analytics(_ context.Context, days int) (Analytics, error) {
	return buildAnalytics(d.sessions, days, d.now), nil
}

// --- Siralamali listeler ---
//
// Demo kaynagi listeyi bellekte tuttugu icin once suzuyor, sonra siraliyor,
// en son diliyor. Sira dilimlemeden ONCE uygulanmali, yoksa "en cok harcayan"
// sorusu yalnizca ilk sayfanin icinde cevaplanmis olur.

func (d *Demo) sortedUsers(q Query) Page[User] {
	items := filter(d.users, func(u User) bool { return matches(q.Search, u.Name, u.Email) })
	sortPage(items, q, userOrder)
	return paginate(items, q)
}

func (d *Demo) sortedStations(q Query) Page[Station] {
	items := filter(d.stations, func(s Station) bool { return matches(q.Search, s.Name, s.Address, s.Operator) })
	sortPage(items, q, stationOrder)
	return paginate(items, q)
}

func (d *Demo) sortedSessions(q Query) Page[Session] {
	items := filter(d.sessions, func(s Session) bool { return matches(q.Search, s.StationName, s.OwnerEmail) })
	sortPage(items, q, sessionOrder)
	return paginate(items, q)
}

func (d *Demo) sortedReservations(q Query) Page[Reservation] {
	items := filter(d.bookings, func(r Reservation) bool {
		return matches(q.Search, r.StationName, r.OwnerEmail) && (q.Status == "" || q.Status == r.Status)
	})
	sortPage(items, q, reservationOrder)
	return paginate(items, q)
}

func (d *Demo) sortedVehicles(q Query) Page[Vehicle] {
	items := filter(d.vehicles, func(v Vehicle) bool { return matches(q.Search, v.Make, v.Model, v.OwnerEmail) })
	sortPage(items, q, vehicleOrder)
	return paginate(items, q)
}
