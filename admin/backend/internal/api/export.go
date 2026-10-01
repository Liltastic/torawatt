package api

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// CSV disa aktarimi.
//
// Tablolarin ustundeki "Dışa aktar" dugmesi buraya geliyor. Disa aktarim
// EKRANDAKI suzgeci uyguluyor ama sayfalamayi UYGULAMIYOR: bir yonetici
// "disa aktar" dedigi zaman gorunen 50 satiri degil, aramasina uyan butun
// kayitlari bekler.

// exportLimit, tek dosyada cikabilecek satir tavani. Kaza eseri yuz binlik
// bir disa aktarim sunucuyu da tarayiciyi da kilitlemesin.
const exportLimit = 20000

func csvResponse(w http.ResponseWriter, name string) *csv.Writer {
	stamp := time.Now().Format("2006-01-02")
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="tora-%s-%s.csv"`, name, stamp))

	// UTF-8 BOM: Excel bunu gormeden dosyayi yerel kod sayfasiyla aciyor ve
	// Turkce karakterler bozuluyor.
	_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(w)
	// Excel'in Turkce yerel ayarinda varsayilan ayrac noktali virgul.
	writer.Comma = ';'
	return writer
}

func decimal(v float64) string { return strconv.FormatFloat(v, 'f', 1, 64) }

func localTime(t time.Time) string { return t.Local().Format("2006-01-02 15:04") }

func (s *Server) export(w http.ResponseWriter, r *http.Request) {
	kind := r.PathValue("kind")
	q := queryOf(r)
	q.Limit = exportLimit
	q.Offset = 0

	switch kind {
	case "kullanicilar":
		page, err := s.Store.Users(r.Context(), q)
		if err != nil {
			fail(w, err)
			return
		}
		writer := csvResponse(w, kind)
		defer writer.Flush()
		_ = writer.Write([]string{"Ad", "E-posta", "Arac", "Oturum", "Enerji kWh", "Kayit tarihi"})
		for _, u := range page.Items {
			_ = writer.Write([]string{u.Name, u.Email, strconv.Itoa(u.Vehicles), strconv.Itoa(u.Sessions),
				decimal(u.EnergyKwh), localTime(u.CreatedAt)})
		}

	case "istasyonlar":
		page, err := s.Store.Stations(r.Context(), q)
		if err != nil {
			fail(w, err)
			return
		}
		writer := csvResponse(w, kind)
		defer writer.Flush()
		_ = writer.Write([]string{"Istasyon", "Adres", "Isletmeci", "Enlem", "Boylam", "Soket", "Musait"})
		for _, st := range page.Items {
			available := 0
			for _, c := range st.Connectors {
				if c.Status == "AVAILABLE" {
					available++
				}
			}
			_ = writer.Write([]string{st.Name, st.Address, st.Operator,
				decimal(st.Latitude), decimal(st.Longitude),
				strconv.Itoa(len(st.Connectors)), strconv.Itoa(available)})
		}

	case "oturumlar":
		page, err := s.Store.Sessions(r.Context(), q)
		if err != nil {
			fail(w, err)
			return
		}
		writer := csvResponse(w, kind)
		defer writer.Flush()
		_ = writer.Write([]string{"Baslangic", "Bitis", "Istasyon", "Soket", "Kullanici",
			"Sure dk", "Enerji kWh", "Birim TL", "Tutar TL"})
		for _, item := range page.Items {
			_ = writer.Write([]string{localTime(item.StartedAt), localTime(item.EndedAt),
				item.StationName, item.ConnectorLabel, item.OwnerEmail,
				strconv.Itoa(item.DurationMinutes), decimal(item.EnergyKwh),
				decimal(item.PricePerKwh), decimal(item.Cost)})
		}

	case "rezervasyonlar":
		page, err := s.Store.Reservations(r.Context(), q)
		if err != nil {
			fail(w, err)
			return
		}
		writer := csvResponse(w, kind)
		defer writer.Flush()
		_ = writer.Write([]string{"Baslangic", "Istasyon", "Soket", "Kullanici", "Sure dk", "Durum"})
		for _, item := range page.Items {
			_ = writer.Write([]string{localTime(item.StartsAt), item.StationName, item.ConnectorLabel,
				item.OwnerEmail, strconv.Itoa(item.DurationMinutes), item.Status})
		}

	case "araclar":
		page, err := s.Store.Vehicles(r.Context(), q)
		if err != nil {
			fail(w, err)
			return
		}
		writer := csvResponse(w, kind)
		defer writer.Flush()
		_ = writer.Write([]string{"Marka", "Model", "Yil", "Batarya kWh", "Sahibi", "Aktif"})
		for _, v := range page.Items {
			_ = writer.Write([]string{v.Make, v.Model, strconv.Itoa(v.ModelYear),
				decimal(v.BatteryCapacityKwh), v.OwnerEmail, boolText(v.IsActive)})
		}

	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Bilinmeyen disa aktarim"})
	}
}

func boolText(v bool) string {
	if v {
		return "Evet"
	}
	return "Hayir"
}
