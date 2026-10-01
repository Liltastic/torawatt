// Package api, panelin HTTP uclari.
package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/toratools/tora-watt-admin/internal/auth"
	"github.com/toratools/tora-watt-admin/internal/store"
)

type Server struct {
	Store store.Store
	Auth  *auth.Authenticator
	Demo  bool
}

// Routes, API agacini kurar. Giris uclari disinda hepsi yetki istiyor.
func (s *Server) Routes() http.Handler {
	public := http.NewServeMux()
	public.HandleFunc("POST /api/login", s.login)
	public.HandleFunc("POST /api/logout", s.logout)
	public.HandleFunc("GET /api/health", s.health)

	private := http.NewServeMux()
	private.HandleFunc("GET /api/session", s.session)
	private.HandleFunc("GET /api/overview", s.overview)

	private.HandleFunc("GET /api/users", s.users)
	private.HandleFunc("GET /api/users/{id}", s.userDetail)
	private.HandleFunc("DELETE /api/users/{id}", s.deleteUser)

	private.HandleFunc("GET /api/stations", s.stations)
	private.HandleFunc("GET /api/stations/{id}", s.station)
	private.HandleFunc("POST /api/stations", s.saveStation)
	private.HandleFunc("DELETE /api/stations/{id}", s.deleteStation)
	private.HandleFunc("GET /api/stations/{id}/detail", s.stationDetail)
	private.HandleFunc("POST /api/connectors/{id}/status", s.connectorStatus)
	private.HandleFunc("POST /api/connectors", s.saveConnector)
	private.HandleFunc("DELETE /api/connectors/{id}", s.deleteConnector)

	private.HandleFunc("GET /api/vehicles", s.vehicles)
	private.HandleFunc("GET /api/reservations", s.reservations)
	private.HandleFunc("POST /api/reservations/{id}/status", s.reservationStatus)
	private.HandleFunc("GET /api/sessions", s.sessions)

	private.HandleFunc("GET /api/campaigns", s.campaigns)
	private.HandleFunc("POST /api/campaigns", s.saveCampaign)
	private.HandleFunc("DELETE /api/campaigns/{id}", s.deleteCampaign)

	private.HandleFunc("GET /api/support", s.support)
	private.HandleFunc("GET /api/analytics", s.analytics)
	private.HandleFunc("GET /api/export/{kind}", s.export)

	guarded := s.Auth.Middleware(private)

	root := http.NewServeMux()
	root.Handle("/api/login", public)
	root.Handle("/api/logout", public)
	root.Handle("/api/health", public)
	root.Handle("/api/", guarded)
	return root
}

// --- yardimcilar ---

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("cevap yazilamadi: %v", err)
	}
}

// fail, hatayi kullaniciya gosterilebilir bir mesaja cevirir.
//
// Beklenmeyen hatanin METNI disari verilmiyor: veritabani hatalari sema ve
// sorgu detayi sizdirabiliyor. Sunucu loguna tam haliyle dusuyor.
func fail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Kayit bulunamadi"})
	default:
		log.Printf("istek basarisiz: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Beklenmeyen bir hata olustu"})
	}
}

func queryOf(r *http.Request) store.Query {
	q := store.Query{
		Search: r.URL.Query().Get("search"),
		Status: r.URL.Query().Get("status"),
		Sort:   r.URL.Query().Get("sort"),
		Desc:   r.URL.Query().Get("dir") == "desc",
	}
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil {
		q.Limit = v
	}
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v > 0 {
		q.Offset = v
	}
	return q
}

func decode[T any](w http.ResponseWriter, r *http.Request) (T, bool) {
	var body T
	// Govde sinirli: panel yalnizca kucuk formlar gonderiyor.
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Gonderilen veri okunamadi"})
		return body, false
	}
	return body, true
}

// --- oturum ---

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "demo": s.Demo})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}](w, r)
	if !ok {
		return
	}

	token, expires, err := s.Auth.Login(body.Email, body.Password)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "E-posta ya da parola hatali"})
		return
	}

	// Bilet cerezde: HttpOnly oldugu icin sayfadaki betikler okuyamiyor, yani
	// bir XSS acigi oturumu disari tasiyamaz.
	http.SetCookie(w, &http.Cookie{
		Name:     "tw_admin",
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   r.TLS != nil,
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"email":     s.Auth.Email(),
		"expiresAt": expires,
		"demo":      s.Demo,
	})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: "tw_admin", Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, SameSite: http.SameSiteStrictMode, Secure: r.TLS != nil,
	})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) session(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"email": s.Auth.Email(), "demo": s.Demo})
}

// --- pano ---

func (s *Server) overview(w http.ResponseWriter, r *http.Request) {
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days != 7 && days != 30 && days != 90 {
		days = 7
	}
	data, err := s.Store.Overview(r.Context(), days)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

// --- kullanicilar ---

func (s *Server) users(w http.ResponseWriter, r *http.Request) {
	page, err := s.Store.Users(r.Context(), queryOf(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s *Server) deleteUser(w http.ResponseWriter, r *http.Request) {
	if err := s.Store.DeleteUser(r.Context(), r.PathValue("id")); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- istasyonlar ---

func (s *Server) stations(w http.ResponseWriter, r *http.Request) {
	page, err := s.Store.Stations(r.Context(), queryOf(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s *Server) station(w http.ResponseWriter, r *http.Request) {
	item, err := s.Store.Station(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) saveStation(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[store.Station](w, r)
	if !ok {
		return
	}
	if body.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Istasyon adi gerekli"})
		return
	}
	saved, err := s.Store.SaveStation(r.Context(), body)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (s *Server) deleteStation(w http.ResponseWriter, r *http.Request) {
	if err := s.Store.DeleteStation(r.Context(), r.PathValue("id")); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

var connectorStatuses = map[string]bool{
	"AVAILABLE": true, "OCCUPIED": true, "FAULTED": true, "OFFLINE": true, "UNKNOWN": true,
}

func (s *Server) connectorStatus(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[struct {
		Status string `json:"status"`
	}](w, r)
	if !ok {
		return
	}
	// Durum SABIT bir kumeden gelmeli: mobil uygulama bilmedigi bir degerde
	// pini gri gosterir ve sebebi burada gorunmez olurdu.
	if !connectorStatuses[body.Status] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Gecersiz soket durumu"})
		return
	}
	if err := s.Store.SetConnectorStatus(r.Context(), r.PathValue("id"), body.Status); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- araclar, rezervasyonlar, oturumlar ---

func (s *Server) vehicles(w http.ResponseWriter, r *http.Request) {
	page, err := s.Store.Vehicles(r.Context(), queryOf(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s *Server) reservations(w http.ResponseWriter, r *http.Request) {
	page, err := s.Store.Reservations(r.Context(), queryOf(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

var reservationStatuses = map[string]bool{
	"PENDING": true, "CONFIRMED": true, "ARRIVED": true,
	"COMPLETED": true, "CANCELLED": true, "EXPIRED": true,
}

func (s *Server) reservationStatus(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[struct {
		Status string `json:"status"`
	}](w, r)
	if !ok {
		return
	}
	if !reservationStatuses[body.Status] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Gecersiz rezervasyon durumu"})
		return
	}
	if err := s.Store.SetReservationStatus(r.Context(), r.PathValue("id"), body.Status); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) sessions(w http.ResponseWriter, r *http.Request) {
	page, err := s.Store.Sessions(r.Context(), queryOf(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

// --- kampanyalar ve destek ---

func (s *Server) campaigns(w http.ResponseWriter, r *http.Request) {
	page, err := s.Store.Campaigns(r.Context(), queryOf(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s *Server) saveCampaign(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[store.Campaign](w, r)
	if !ok {
		return
	}
	if body.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Kampanya basligi gerekli"})
		return
	}
	if body.ValidUntil != nil && body.ValidUntil.Before(time.Now().AddDate(-5, 0, 0)) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Gecerlilik tarihi anlamsiz"})
		return
	}
	saved, err := s.Store.SaveCampaign(r.Context(), body)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (s *Server) deleteCampaign(w http.ResponseWriter, r *http.Request) {
	if err := s.Store.DeleteCampaign(r.Context(), r.PathValue("id")); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) support(w http.ResponseWriter, r *http.Request) {
	page, err := s.Store.Support(r.Context(), queryOf(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

// --- Detay gorunumleri ---

func (s *Server) userDetail(w http.ResponseWriter, r *http.Request) {
	detail, err := s.Store.UserDetail(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (s *Server) stationDetail(w http.ResponseWriter, r *http.Request) {
	detail, err := s.Store.StationDetail(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

// --- Soket yonetimi ---

var connectorTypes = map[string]bool{"TYPE_2": true, "CCS2": true, "CHADEMO": true, "NACS": true}

func (s *Server) saveConnector(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[store.Connector](w, r)
	if !ok {
		return
	}
	// Tip ve durum SABIT kumelerden gelmeli: mobil uygulama bilmedigi bir
	// degeri cizemiyor ve soket listede sessizce kayboluyor.
	if !connectorTypes[body.Type] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Gecersiz soket tipi"})
		return
	}
	if body.Status == "" {
		body.Status = "AVAILABLE"
	}
	if !connectorStatuses[body.Status] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Gecersiz soket durumu"})
		return
	}
	if body.PowerKw <= 0 || body.PowerKw > 400 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Guc 0 ile 400 kW arasinda olmali"})
		return
	}
	saved, err := s.Store.SaveConnector(r.Context(), body)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (s *Server) deleteConnector(w http.ResponseWriter, r *http.Request) {
	if err := s.Store.DeleteConnector(r.Context(), r.PathValue("id")); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- Analiz ---

func (s *Server) analytics(w http.ResponseWriter, r *http.Request) {
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days != 7 && days != 30 && days != 90 {
		days = 30
	}
	data, err := s.Store.Analytics(r.Context(), days)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}
