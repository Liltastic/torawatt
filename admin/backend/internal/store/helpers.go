package store

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// matches, arama kutusunun davranisi: bos sorgu her kaydi gecirir, dolu sorgu
// verilen alanlardan HERHANGI birinde gecmeli. Buyuk/kucuk harf onemsiz.
func matches(needle string, fields ...string) bool {
	needle = strings.TrimSpace(strings.ToLower(needle))
	if needle == "" {
		return true
	}
	for _, f := range fields {
		if strings.Contains(strings.ToLower(f), needle) {
			return true
		}
	}
	return false
}

func filter[T any](items []T, keep func(T) bool) []T {
	out := make([]T, 0, len(items))
	for _, item := range items {
		if keep(item) {
			out = append(out, item)
		}
	}
	return out
}

// paginate, suzulmus diziden istenen dilimi keser. Toplam sayi HER ZAMAN
// suzmeden sonraki, dilimlemeden onceki uzunluk: tablo altindaki "x / y"
// ifadesi arama sonucunu anlatmali.
func paginate[T any](items []T, q Query) Page[T] {
	total := len(items)
	limit := q.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	start := q.Offset
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}
	return Page[T]{Items: items[start:end], Total: total}
}

func countConnectors(stations []Station) int {
	n := 0
	for _, s := range stations {
		n += len(s.Connectors)
	}
	return n
}

// dayKey, verilen anin YEREL gun basi.
//
// Local()'a cevirmek sart: veritabanindan gelen zaman damgalari kendi saat
// dilimi nesnesini tasiyor ve gun siniri okuyanin saat dilimine gore
// belirlenmeli - "30 Eylul'de ne kadar enerji verildi" sorusunun cevabi
// sunucunun UTC gunune gore degil, bizim gunumuze gore.
func dayKey(t time.Time) time.Time {
	local := t.Local()
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, local.Location())
}

// dayBucket, gunluk gruplama anahtari.
//
// METIN, time.Time DEGIL. time.Time bir harita anahtari olarak kullanildiginda
// karsilastirma saat dilimi NESNESINI de iceriyor: veritabanindan gelen kayitla
// bizim urettigimiz gun ayni ani gosterse bile esit sayilmiyor ve butun kovalar
// bos kaliyordu. Grafik sifir cizerken kartlardaki toplam doluydu, cunku
// toplamlar mutlak zaman karsilastirmasiyla hesaplaniyor.
func dayBucket(t time.Time) string {
	return dayKey(t).Format("2006-01-02")
}

var weekdayShort = map[time.Weekday]string{
	time.Monday: "Pzt", time.Tuesday: "Sal", time.Wednesday: "Car", time.Thursday: "Per",
	time.Friday: "Cum", time.Saturday: "Cmt", time.Sunday: "Paz",
}

var monthShort = [...]string{"Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"}

// axisLabel, grafigin alt eksenindeki metin.
//
// Bir haftada gun adi ("Pzt") en okunakli olan; otuz ya da doksan gunde ayni
// yedi ad donup duruyor ve hicbir sey anlatmiyor - orada tarih gerekiyor.
func axisLabel(day time.Time, days int) string {
	if days <= 7 {
		return weekdayShort[day.Weekday()]
	}
	return fmt.Sprintf("%d %s", day.Day(), monthShort[int(day.Month())-1])
}

// bucketDaily, verilen gun sayisi kadar geriye giden GUNLUK seri uretir.
//
// Bos gunler atlanmiyor, sifir degerle diziye giriyor: grafikte bir gun hic
// sarj olmadiysa cizgi orada dibe inmeli, sonraki dolu gune atlayip sanki
// kesintisizmis gibi gorunmemeli.
func bucketDaily(sessions []Session, from time.Time, days int, value func(Session) float64) []Point {
	totals := make(map[string]float64, days)
	for _, s := range sessions {
		if dayKey(s.StartedAt).Before(from) {
			continue
		}
		totals[dayBucket(s.StartedAt)] += value(s)
	}

	points := make([]Point, 0, days)
	for i := 0; i < days; i++ {
		day := from.AddDate(0, 0, i)
		points = append(points, Point{Label: axisLabel(day, days), Value: round1(totals[dayBucket(day)])})
	}
	return points
}

// sumBetween, [from, to) araligindaki toplam.
func sumBetween(sessions []Session, from, to time.Time, value func(Session) float64) float64 {
	var total float64
	for _, s := range sessions {
		if !s.StartedAt.Before(from) && s.StartedAt.Before(to) {
			total += value(s)
		}
	}
	return total
}

// delta, onceki doneme gore yuzde degisim. Onceki donem sifirsa yuzde
// hesaplanamaz; 0 donuyor ve arayuz o zaman degisim rozetini gizliyor.
func delta(current, previous float64) float64 {
	if previous == 0 {
		return 0
	}
	return round1((current - previous) / previous * 100)
}

func metricFor(sessions []Session, now time.Time, days int, value func(Session) float64) Metric {
	from := dayKey(now).AddDate(0, 0, -(days - 1))
	prevFrom := from.AddDate(0, 0, -days)

	current := sumBetween(sessions, from, now.AddDate(0, 0, 1), value)
	previous := sumBetween(sessions, prevFrom, from, value)

	return Metric{
		Value:  round1(current),
		Delta:  delta(current, previous),
		Series: bucketDaily(sessions, from, days, value),
	}
}

// buildOverview, panoyu besleyen butun ozetleri tek gecisle hesaplar.
//
// Iki kaynak ayri sey anlatiyor: oturumlar GECMISI (enerji, ciro, adet),
// soket durumlari ise SU ANI (doluluk). Doluluk gecmisten turetilemiyor cunku
// oturum kaydinda soketin o anki durumu yok.
func buildOverview(sessions []Session, bookings []Reservation, stations []Station, counts Counts, days int, now time.Time) Overview {
	if days <= 0 {
		days = 7
	}

	energy := metricFor(sessions, now, days, func(s Session) float64 { return s.EnergyKwh })
	count := metricFor(sessions, now, days, func(Session) float64 { return 1 })
	revenue := metricFor(sessions, now, days, func(s Session) float64 { return s.Cost })

	// Doluluk: su an dolu olan soketlerin, hizmet verebilir durumdakilere orani.
	var busy, serviceable int
	for _, st := range stations {
		for _, c := range st.Connectors {
			switch c.Status {
			case "OCCUPIED":
				busy++
				serviceable++
			case "AVAILABLE":
				serviceable++
			}
		}
	}
	utilisation := 0.0
	if serviceable > 0 {
		utilisation = round1(float64(busy) / float64(serviceable) * 100)
	}

	upcoming := make([]Reservation, 0, 6)
	for _, r := range bookings {
		if r.StartsAt.After(now) && (r.Status == "PENDING" || r.Status == "CONFIRMED") {
			upcoming = append(upcoming, r)
		}
	}
	sort.Slice(upcoming, func(i, j int) bool { return upcoming[i].StartsAt.Before(upcoming[j].StartsAt) })
	if len(upcoming) > 6 {
		upcoming = upcoming[:6]
	}

	from := dayKey(now).AddDate(0, 0, -(days - 1))
	loads := map[string]*StationLoad{}
	for _, st := range stations {
		load := &StationLoad{StationID: st.ID, Name: st.Name, Total: len(st.Connectors)}
		for _, c := range st.Connectors {
			if c.Status == "AVAILABLE" {
				load.Available++
			}
		}
		loads[st.Name] = load
	}
	for _, s := range sessions {
		if s.StartedAt.Before(from) {
			continue
		}
		if load, ok := loads[s.StationName]; ok {
			load.Sessions++
			load.EnergyKwh = round1(load.EnergyKwh + s.EnergyKwh)
		}
	}
	top := make([]StationLoad, 0, len(loads))
	for _, l := range loads {
		if l.Sessions == 0 {
			continue
		}
		top = append(top, *l)
	}
	sort.Slice(top, func(i, j int) bool {
		if top[i].EnergyKwh == top[j].EnergyKwh {
			return top[i].Name < top[j].Name
		}
		return top[i].EnergyKwh > top[j].EnergyKwh
	})
	if len(top) > 3 {
		top = top[:3]
	}

	return Overview{
		Energy:      energy,
		Sessions:    count,
		Revenue:     revenue,
		Utilisation: Metric{Value: utilisation, Delta: 0, Series: energy.Series},
		Activity:    bucketDaily(sessions, from, days, func(s Session) float64 { return s.EnergyKwh }),
		Upcoming:    upcoming,
		TopStations: top,
		Counts:      counts,
	}
}

// --- Analiz ---

// groupBy, oturumlari verilen anahtara gore toplar ve cirodan buyuge siralar.
func groupBy(sessions []Session, key func(Session) string) []Slice {
	index := map[string]*Slice{}
	for _, s := range sessions {
		label := key(s)
		if label == "" {
			continue
		}
		slice, ok := index[label]
		if !ok {
			slice = &Slice{Label: label}
			index[label] = slice
		}
		slice.Sessions++
		slice.EnergyKwh += s.EnergyKwh
		slice.Revenue += s.Cost
	}

	out := make([]Slice, 0, len(index))
	for _, slice := range index {
		slice.EnergyKwh = round1(slice.EnergyKwh)
		slice.Revenue = round1(slice.Revenue)
		out = append(out, *slice)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Revenue == out[j].Revenue {
			return out[i].Label < out[j].Label
		}
		return out[i].Revenue > out[j].Revenue
	})
	return out
}

// connectorKind, "CCS2 - 180 kW" etiketinden yalnizca tipi ayirir.
//
// Etiket guc degerini de tasiyor; kirilimda her guc ayri satir olsaydi liste
// tip karsilastirmasi olmaktan cikardi.
func connectorKind(label string) string {
	if i := strings.IndexAny(label, "-·"); i > 0 {
		return strings.TrimSpace(label[:i])
	}
	return strings.TrimSpace(label)
}

// buildAnalytics, Analiz sayfasinin butun kirilimlarini tek gecisle hesaplar.
//
// Iki depolama da AYNI kodu cagiriyor; boylece demo ile canli veri ayni
// tanimlari paylasiyor ve sayfa kaynagi degisince anlam kaymiyor.
func buildAnalytics(sessions []Session, days int, now time.Time) Analytics {
	if days <= 0 {
		days = 30
	}
	from := dayKey(now).AddDate(0, 0, -(days - 1))

	inWindow := make([]Session, 0, len(sessions))
	for _, s := range sessions {
		if !dayKey(s.StartedAt).Before(from) {
			inWindow = append(inWindow, s)
		}
	}

	hours := groupBy(inWindow, func(s Session) string {
		return fmt.Sprintf("%02d:00", s.StartedAt.Local().Hour())
	})
	// Saat kirilimi ciroya gore degil SAATE gore okunur; gun icindeki egriyi
	// gormek icin yeniden siraliyoruz.
	sort.Slice(hours, func(i, j int) bool { return hours[i].Label < hours[j].Label })

	var energy, revenue, duration float64
	for _, s := range inWindow {
		energy += s.EnergyKwh
		revenue += s.Cost
		duration += float64(s.DurationMinutes)
	}
	count := float64(len(inWindow))
	avg := func(total float64) float64 {
		if count == 0 {
			return 0
		}
		return round1(total / count)
	}

	return Analytics{
		Days:           days,
		ByStation:      groupBy(inWindow, func(s Session) string { return s.StationName }),
		ByConnpart:     groupBy(inWindow, func(s Session) string { return connectorKind(s.ConnectorLabel) }),
		ByHour:         hours,
		Daily:          bucketDaily(inWindow, from, days, func(s Session) float64 { return s.EnergyKwh }),
		Revenue:        bucketDaily(inWindow, from, days, func(s Session) float64 { return s.Cost }),
		AvgEnergyKwh:   avg(energy),
		AvgRevenue:     avg(revenue),
		AvgDurationMin: avg(duration),
	}
}

// --- Siralama ---

// sortPage, demo kaynagindaki listeleri istenen sutuna gore sirala.
//
// Karsilastirici haritasi her varlik icin ayri veriliyor; bilinmeyen sutun
// adi sessizce yok sayiliyor ve varsayilan sira korunuyor.
func sortPage[T any](items []T, q Query, comparators map[string]func(a, b T) bool) {
	less, ok := comparators[q.Sort]
	if !ok {
		return
	}
	sort.SliceStable(items, func(i, j int) bool {
		if q.Desc {
			return less(items[j], items[i])
		}
		return less(items[i], items[j])
	})
}
