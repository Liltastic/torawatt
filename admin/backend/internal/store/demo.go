package store

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"sort"
	"strings"
	"time"
)

// Demo, veritabani olmadan calisan ornek kaynak.
//
// NE ICIN: panelin arayuzunu canli veritabanina baglanmadan acabilmek icin.
// Uretilen her sey tohumu sabit bir rastgele diziden gelir, yani her acilista
// ayni tabloyu gorursunuz. Panel bu kaynagi kullanirken ust cubukta "Demo
// veri" rozeti cikar; gercek veriyi gormek icin DATABASE_URL vermek yeterli
// (bkz. admin/README.md).
type Demo struct {
	users     []User
	stations  []Station
	vehicles  []Vehicle
	bookings  []Reservation
	sessions  []Session
	campaigns []Campaign
	support   []SupportRequest
	now       time.Time
}

// ErrNotFound, istenen kaydin bulunamadigi durum; API 404'e cevirir.
var ErrNotFound = errors.New("kayit bulunamadi")

var demoCities = []struct {
	name     string
	operator string
	lat, lng float64
}{
	{"TORA WATT Maslak", "TORA WATT", 41.1106, 29.0201},
	{"TORA WATT Kadikoy Rihtim", "TORA WATT", 40.9903, 29.0246},
	{"TORA WATT Atasehir Meydan", "TORA WATT", 40.9923, 29.1274},
	{"TORA WATT Besiktas Sahil", "TORA WATT", 41.0422, 29.0061},
	{"TORA WATT Cankaya", "TORA WATT", 39.9032, 32.8597},
	{"TORA WATT Konak", "TORA WATT", 38.4189, 27.1287},
	{"TORA WATT Nilufer", "TORA WATT", 40.2107, 28.9807},
	{"TORA WATT Muratpasa", "TORA WATT", 36.8841, 30.7056},
	{"Esenyurt Park AVM", "Partner", 41.0294, 28.6741},
	{"Bodrum Marina", "Partner", 37.0344, 27.4305},
}

var demoNames = []string{
	"Berat Polat", "Elif Yildiz", "Mert Arslan", "Zeynep Kaya", "Can Demir",
	"Selin Aydin", "Emre Sahin", "Deniz Koc", "Burak Celik", "Ayse Dogan",
	"Kerem Ucar", "Naz Ozkan", "Onur Tekin", "Irem Gunes", "Serkan Ates",
}

var demoStatuses = []string{"AVAILABLE", "AVAILABLE", "AVAILABLE", "OCCUPIED", "OCCUPIED", "FAULTED", "OFFLINE"}

var demoConnectorKinds = []struct {
	kind  string
	power float64
}{
	{"CCS2", 180}, {"CCS2", 120}, {"CCS2", 90}, {"TYPE_2", 22}, {"TYPE_2", 11}, {"CHADEMO", 50},
}

var demoCars = []struct {
	make, model string
	battery     float64
}{
	{"Togg", "T10X", 85}, {"Togg", "T10F", 85}, {"Tesla", "Model Y", 75},
	{"Kia", "EV6", 74}, {"Hyundai", "IONIQ 5", 77}, {"BMW", "i4", 81.3},
	{"Renault", "Megane E-Tech", 60}, {"MG", "4", 64}, {"BYD", "Atto 3", 60},
}

// NewDemo, sabit tohumlu ornek veriyi uretir.
func NewDemo() *Demo {
	rng := rand.New(rand.NewSource(20260930))
	now := time.Now()
	d := &Demo{now: now}

	d.seedUsers(rng, now)
	d.seedStations(rng)
	d.seedVehicles(rng)
	d.seedSessions(rng, now)
	d.seedBookings(rng, now)
	d.seedCampaigns(now)
	d.seedSupport(rng, now)
	d.rollUpUsers()

	return d
}

func (d *Demo) seedUsers(rng *rand.Rand, now time.Time) {
	for i, name := range demoNames {
		first := strings.ToLower(strings.Fields(name)[0])
		d.users = append(d.users, User{
			ID:        fmt.Sprintf("usr_%03d", i+1),
			Email:     fmt.Sprintf("%s%d@torawatt.test", first, i+1),
			Name:      name,
			CreatedAt: now.AddDate(0, 0, -rng.Intn(400)-5),
		})
	}
}

func (d *Demo) seedStations(rng *rand.Rand) {
	amenities := []string{"Kafe", "WC", "Otopark"}
	for i, c := range demoCities {
		station := Station{
			ID:        fmt.Sprintf("st_%03d", i+1),
			Name:      c.name,
			Operator:  c.operator,
			Address:   fmt.Sprintf("%s, Turkiye", strings.TrimPrefix(c.name, "TORA WATT ")),
			Latitude:  c.lat,
			Longitude: c.lng,
			Amenities: amenities[:1+rng.Intn(len(amenities))],
		}
		for j := 0; j < 2+rng.Intn(4); j++ {
			pick := demoConnectorKinds[rng.Intn(len(demoConnectorKinds))]
			price := 8.5 + float64(rng.Intn(40))/10
			idle := 2.0
			station.Connectors = append(station.Connectors, Connector{
				ID:            fmt.Sprintf("%s_c%d", station.ID, j+1),
				StationID:     station.ID,
				Type:          pick.kind,
				PowerKw:       pick.power,
				Status:        demoStatuses[rng.Intn(len(demoStatuses))],
				PricePerKwh:   &price,
				IdleFeePerMin: &idle,
			})
		}
		d.stations = append(d.stations, station)
	}
}

func (d *Demo) seedVehicles(rng *rand.Rand) {
	for i, u := range d.users {
		for j := 0; j <= rng.Intn(2); j++ {
			car := demoCars[rng.Intn(len(demoCars))]
			d.vehicles = append(d.vehicles, Vehicle{
				ID:                 fmt.Sprintf("veh_%03d_%d", i+1, j+1),
				OwnerID:            u.ID,
				OwnerEmail:         u.Email,
				Make:               car.make,
				Model:              car.model,
				ModelYear:          2021 + rng.Intn(5),
				BatteryCapacityKwh: car.battery,
				IsActive:           j == 0,
			})
		}
	}
}

// seedSessions, son 90 gunun sarj oturumlarini uretir. Hafta sonu daha yogun,
// boylece haftalik grafikte gercekci bir dalga olusuyor.
func (d *Demo) seedSessions(rng *rand.Rand, now time.Time) {
	for day := 89; day >= 0; day-- {
		date := now.AddDate(0, 0, -day)
		volume := 6 + rng.Intn(7)
		if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
			volume += 4
		}
		for k := 0; k < volume; k++ {
			user := d.users[rng.Intn(len(d.users))]
			station := d.stations[rng.Intn(len(d.stations))]
			conn := station.Connectors[rng.Intn(len(station.Connectors))]
			started := time.Date(date.Year(), date.Month(), date.Day(), 7+rng.Intn(15), rng.Intn(60), 0, 0, date.Location())
			minutes := 18 + rng.Intn(70)
			energy := float64(minutes) / 60 * (conn.PowerKw * (0.45 + rng.Float64()*0.35))
			price := 8.5 + float64(rng.Intn(40))/10
			d.sessions = append(d.sessions, Session{
				ID:              fmt.Sprintf("ses_%05d", len(d.sessions)+1),
				OwnerID:         user.ID,
				OwnerEmail:      user.Email,
				StationName:     station.Name,
				ConnectorLabel:  fmt.Sprintf("%s - %.0f kW", conn.Type, conn.PowerKw),
				StartedAt:       started,
				EndedAt:         started.Add(time.Duration(minutes) * time.Minute),
				DurationMinutes: minutes,
				EnergyKwh:       round1(energy),
				PricePerKwh:     price,
				Cost:            round1(energy * price),
			})
		}
	}
	sort.Slice(d.sessions, func(i, j int) bool { return d.sessions[i].StartedAt.After(d.sessions[j].StartedAt) })
}

func (d *Demo) seedBookings(rng *rand.Rand, now time.Time) {
	past := []string{"PENDING", "CONFIRMED", "ARRIVED", "COMPLETED", "CANCELLED", "EXPIRED"}
	future := []string{"PENDING", "CONFIRMED"}
	for i := 0; i < 40; i++ {
		user := d.users[rng.Intn(len(d.users))]
		station := d.stations[rng.Intn(len(d.stations))]
		conn := station.Connectors[rng.Intn(len(station.Connectors))]
		offset := time.Duration(rng.Intn(14*24)-72) * time.Hour
		status := past[rng.Intn(len(past))]
		if offset > 0 {
			status = future[rng.Intn(len(future))]
		}
		d.bookings = append(d.bookings, Reservation{
			ID:              fmt.Sprintf("rsv_%04d", i+1),
			OwnerID:         user.ID,
			OwnerEmail:      user.Email,
			StationName:     station.Name,
			ConnectorLabel:  fmt.Sprintf("%s - %.0f kW", conn.Type, conn.PowerKw),
			StartsAt:        now.Add(offset),
			DurationMinutes: []int{30, 45, 60, 90}[rng.Intn(4)],
			Status:          status,
		})
	}
	sort.Slice(d.bookings, func(i, j int) bool { return d.bookings[i].StartsAt.After(d.bookings[j].StartsAt) })
}

func (d *Demo) seedCampaigns(now time.Time) {
	until := now.AddDate(0, 2, 0)
	d.campaigns = []Campaign{
		{ID: "cmp_001", Title: "Hafta sonu %20", Description: "Cumartesi ve pazar butun DC soketlerde gecerli.", DiscountLabel: "%20", ValidUntil: &until, IsActive: true},
		{ID: "cmp_002", Title: "Gece tarifesi", Description: "23:00 - 06:00 arasi kWh basina 2 TL indirim.", DiscountLabel: "-2 TL", ValidUntil: nil, IsActive: true},
		{ID: "cmp_003", Title: "Ilk sarj bedava", Description: "Yeni uyelere ilk 20 kWh hediye.", DiscountLabel: "20 kWh", ValidUntil: &until, IsActive: true},
		{ID: "cmp_004", Title: "Yaz kampanyasi", Description: "Sahil istasyonlarinda %15 indirim.", DiscountLabel: "%15", ValidUntil: &until, IsActive: false},
	}
}

func (d *Demo) seedSupport(rng *rand.Rand, now time.Time) {
	messages := []string{
		"Soket kilidi acilmiyor, aracim bagli kaldi.",
		"Odeme iki kere alindi, iade talep ediyorum.",
		"Uygulamada istasyon musait gorunuyor ama dolu.",
		"Fatura adresimi guncelleyebilir misiniz?",
		"Sarj yarida kesildi, tekrar baslatamadim.",
		"Rezervasyonum iptal olmus, sebebini ogrenebilir miyim?",
	}
	for i, m := range messages {
		user := d.users[rng.Intn(len(d.users))]
		d.support = append(d.support, SupportRequest{
			ID:         fmt.Sprintf("sup_%03d", i+1),
			OwnerID:    user.ID,
			OwnerEmail: user.Email,
			Message:    m,
			CreatedAt:  now.Add(-time.Duration(rng.Intn(240)) * time.Hour),
		})
	}
}

// rollUpUsers, kullanici satirindaki ozet sayilari oturumlardan turetir.
func (d *Demo) rollUpUsers() {
	for i := range d.users {
		for _, s := range d.sessions {
			if s.OwnerID == d.users[i].ID {
				d.users[i].Sessions++
				d.users[i].EnergyKwh += s.EnergyKwh
			}
		}
		d.users[i].EnergyKwh = round1(d.users[i].EnergyKwh)
		for _, v := range d.vehicles {
			if v.OwnerID == d.users[i].ID {
				d.users[i].Vehicles++
			}
		}
	}
}

// round1, bir ondaliga yuvarlar.
//
// math.Round sart: "int(v*10+0.5)" kalibi sifira dogru kirpiyor ve NEGATIF
// degerleri bozuyordu - tam dusus (-100) ekranda -99,9 olarak cikiyordu.
func round1(v float64) float64 { return math.Round(v*10) / 10 }

func (d *Demo) Close() {}

func (d *Demo) Overview(_ context.Context, days int) (Overview, error) {
	counts := Counts{
		Users: len(d.users), Stations: len(d.stations), Connectors: countConnectors(d.stations),
		Vehicles: len(d.vehicles), Reservations: len(d.bookings), Campaigns: len(d.campaigns),
		Support: len(d.support),
	}
	return buildOverview(d.sessions, d.bookings, d.stations, counts, days, d.now), nil
}

func (d *Demo) Users(_ context.Context, q Query) (Page[User], error) {
	return d.sortedUsers(q), nil
}

func (d *Demo) DeleteUser(_ context.Context, id string) error {
	for i, u := range d.users {
		if u.ID == id {
			d.users = append(d.users[:i], d.users[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (d *Demo) Stations(_ context.Context, q Query) (Page[Station], error) {
	return d.sortedStations(q), nil
}

func (d *Demo) Station(_ context.Context, id string) (Station, error) {
	for _, s := range d.stations {
		if s.ID == id {
			return s, nil
		}
	}
	return Station{}, ErrNotFound
}

func (d *Demo) SaveStation(_ context.Context, s Station) (Station, error) {
	for i, existing := range d.stations {
		if existing.ID == s.ID {
			// Soketler kendi ucundan yonetiliyor; kaydetme onlari ezmesin.
			s.Connectors = existing.Connectors
			d.stations[i] = s
			return s, nil
		}
	}
	if s.ID == "" {
		s.ID = fmt.Sprintf("st_%03d", len(d.stations)+1)
	}
	d.stations = append(d.stations, s)
	return s, nil
}

func (d *Demo) DeleteStation(_ context.Context, id string) error {
	for i, s := range d.stations {
		if s.ID == id {
			d.stations = append(d.stations[:i], d.stations[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (d *Demo) SetConnectorStatus(_ context.Context, id, status string) error {
	for i := range d.stations {
		for j := range d.stations[i].Connectors {
			if d.stations[i].Connectors[j].ID == id {
				d.stations[i].Connectors[j].Status = status
				return nil
			}
		}
	}
	return ErrNotFound
}

func (d *Demo) Vehicles(_ context.Context, q Query) (Page[Vehicle], error) {
	return d.sortedVehicles(q), nil
}

func (d *Demo) Reservations(_ context.Context, q Query) (Page[Reservation], error) {
	return d.sortedReservations(q), nil
}

func (d *Demo) SetReservationStatus(_ context.Context, id, status string) error {
	for i := range d.bookings {
		if d.bookings[i].ID == id {
			d.bookings[i].Status = status
			return nil
		}
	}
	return ErrNotFound
}

func (d *Demo) Sessions(_ context.Context, q Query) (Page[Session], error) {
	return d.sortedSessions(q), nil
}

func (d *Demo) Campaigns(_ context.Context, q Query) (Page[Campaign], error) {
	return paginate(filter(d.campaigns, func(c Campaign) bool {
		return matches(q.Search, c.Title, c.Description)
	}), q), nil
}

func (d *Demo) SaveCampaign(_ context.Context, c Campaign) (Campaign, error) {
	for i, existing := range d.campaigns {
		if existing.ID == c.ID {
			d.campaigns[i] = c
			return c, nil
		}
	}
	if c.ID == "" {
		c.ID = fmt.Sprintf("cmp_%03d", len(d.campaigns)+1)
	}
	d.campaigns = append(d.campaigns, c)
	return c, nil
}

func (d *Demo) DeleteCampaign(_ context.Context, id string) error {
	for i, c := range d.campaigns {
		if c.ID == id {
			d.campaigns = append(d.campaigns[:i], d.campaigns[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (d *Demo) Support(_ context.Context, q Query) (Page[SupportRequest], error) {
	return paginate(filter(d.support, func(s SupportRequest) bool {
		return matches(q.Search, s.Message, s.OwnerEmail)
	}), q), nil
}
