package store

import (
	"testing"
	"time"
)

// TestBucketDailyAcrossTimeZones, gercek veriyle ortaya cikan hatanin nobetcisi.
//
// Veritabanindan gelen zaman damgalari kendi saat dilimi nesnesini tasiyor.
// Kovalar time.Time anahtariyla tutuldugunda ayni ani gosteren iki deger esit
// SAYILMIYOR ve grafik bombos kaliyordu - ust kartlardaki toplam ise doluydu,
// cunku o mutlak zaman karsilastirmasiyla hesaplaniyor. Ikisi arasindaki bu
// celiski hatanin kendisiydi.
func TestBucketDailyAcrossTimeZones(t *testing.T) {
	// Sunucunun UTC'si gibi davranan, yerelden farkli bir konum.
	utc := time.UTC
	now := time.Now()
	from := dayKey(now).AddDate(0, 0, -6)

	// Bugun ogle vakti: hangi saat diliminde yazildigindan bagimsiz olarak
	// bugunun kovasina dusmeli.
	noon := time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, time.Local)
	sessions := []Session{
		{StartedAt: noon.In(utc), EnergyKwh: 40},
		{StartedAt: noon.In(time.FixedZone("test", 5*3600)), EnergyKwh: 2},
	}

	points := bucketDaily(sessions, from, 7, func(s Session) float64 { return s.EnergyKwh })

	if len(points) != 7 {
		t.Fatalf("7 gun bekleniyordu, %d geldi", len(points))
	}

	total := 0.0
	for _, p := range points {
		total += p.Value
	}
	if total != 42 {
		t.Fatalf("kovalarin toplami 42 olmaliydi, %v geldi (grafik ile kartlar celisiyor)", total)
	}
	if last := points[len(points)-1].Value; last != 42 {
		t.Fatalf("iki kayit da BUGUNUN kovasina dusmeliydi, son gun %v", last)
	}
}

// TestBucketDailyFillsEmptyDays, sarj olmayan gunun atlanmadigini dogrular:
// cizgi o gun dibe inmeli, sonraki dolu gune atlayip kesintisizmis gibi
// gorunmemeli.
func TestBucketDailyFillsEmptyDays(t *testing.T) {
	now := time.Now()
	from := dayKey(now).AddDate(0, 0, -6)
	sessions := []Session{{StartedAt: now, EnergyKwh: 10}}

	points := bucketDaily(sessions, from, 7, func(s Session) float64 { return s.EnergyKwh })

	for i, p := range points[:6] {
		if p.Value != 0 {
			t.Fatalf("%d. gun bos olmaliydi, %v geldi", i, p.Value)
		}
	}
	if points[6].Value != 10 {
		t.Fatalf("son gun 10 olmaliydi, %v geldi", points[6].Value)
	}
}

// TestOverviewTotalsMatchChart, kartlardaki toplamla grafigin ayni seyi
// anlatmasini bekler. Hata tam olarak burada ayrisiyordu.
func TestOverviewTotalsMatchChart(t *testing.T) {
	now := time.Now()
	sessions := []Session{
		{StationName: "A", StartedAt: now.Add(-2 * time.Hour).UTC(), EnergyKwh: 30, Cost: 300},
		{StationName: "A", StartedAt: now.AddDate(0, 0, -2).UTC(), EnergyKwh: 12, Cost: 120},
	}

	overview := buildOverview(sessions, nil, nil, Counts{}, 7, now)

	var charted float64
	for _, p := range overview.Activity {
		charted += p.Value
	}
	if charted != overview.Energy.Value {
		t.Fatalf("grafik %v kWh, kart %v kWh gosteriyor", charted, overview.Energy.Value)
	}
}

// TestRound1Negative, tam dususun -100 olarak raporlandigini dogrular.
// Eski kalip (int(v*10+0.5)) sifira dogru kirpiyor ve -99.9 veriyordu.
func TestRound1Negative(t *testing.T) {
	cases := map[float64]float64{-100: -100, -3.66: -3.7, 3.66: 3.7, -0.04: 0}
	for in, want := range cases {
		if got := round1(in); got != want {
			t.Fatalf("round1(%v) = %v, beklenen %v", in, got, want)
		}
	}
}

// TestTopStationsSkipsIdle, donem icinde hic sarj vermemis istasyonun
// "one cikanlar" listesine girmedigini dogrular.
func TestTopStationsSkipsIdle(t *testing.T) {
	now := time.Now()
	stations := []Station{
		{ID: "a", Name: "Calisan", Connectors: []Connector{{Status: "AVAILABLE"}}},
		{ID: "b", Name: "Bos", Connectors: []Connector{{Status: "AVAILABLE"}}},
	}
	sessions := []Session{{StationName: "Calisan", StartedAt: now, EnergyKwh: 5}}

	overview := buildOverview(sessions, nil, stations, Counts{}, 7, now)

	if len(overview.TopStations) != 1 {
		t.Fatalf("yalnizca sarj veren istasyon listelenmeliydi, %d geldi", len(overview.TopStations))
	}
	if overview.TopStations[0].Name != "Calisan" {
		t.Fatalf("yanlis istasyon: %s", overview.TopStations[0].Name)
	}
}
