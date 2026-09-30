// Komut toraadmin, TORA WATT yonetim panelini servis eder.
//
// Tek binary: API'yi de arayuzu de ayni surec veriyor.
//
//	ADMIN_PASSWORD=... go run ./cmd/toraadmin          # ornek veriyle
//	DATABASE_URL=... ADMIN_PASSWORD=... go run ./...    # gercek veriyle
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/toratools/tora-watt-admin/internal/api"
	"github.com/toratools/tora-watt-admin/internal/auth"
	"github.com/toratools/tora-watt-admin/internal/config"
	"github.com/toratools/tora-watt-admin/internal/store"
	"github.com/toratools/tora-watt-admin/internal/web"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lmsgprefix)
	log.SetPrefix("[tora-admin] ")

	if err := run(); err != nil {
		log.Fatalf("baslatilamadi: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	data, err := openStore(ctx, cfg)
	if err != nil {
		return err
	}
	defer data.Close()

	authenticator, err := auth.New(cfg.AdminEmail, cfg.AdminPasswordHash, cfg.AdminPasswordRaw, cfg.JWTSecret, cfg.SessionHours)
	if err != nil {
		return err
	}

	server := &api.Server{Store: data, Auth: authenticator, Demo: cfg.UsesDemoData()}

	ui, err := userInterface(cfg)
	if err != nil {
		return err
	}

	root := http.NewServeMux()
	root.Handle("/api/", server.Routes())
	root.Handle("/", ui)

	httpServer := &http.Server{
		Addr:    cfg.Addr,
		Handler: securityHeaders(root),
		// Panel ic agda calissa da acik uclu baglantilar birikmesin.
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}

	go func() {
		log.Printf("panel hazir: http://localhost%s (giris: %s)", cfg.Addr, cfg.AdminEmail)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("sunucu durdu: %v", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Print("kapaniyor...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return httpServer.Shutdown(shutdownCtx)
}

func openStore(ctx context.Context, cfg config.Config) (store.Store, error) {
	if cfg.UsesDemoData() {
		log.Print("DATABASE_URL yok - ORNEK VERI ile aciliyor (arayuzde rozet gorunur)")
		return store.NewDemo(), nil
	}
	log.Print("veritabanina baglaniliyor...")
	connectCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	return store.NewPostgres(connectCtx, cfg.DatabaseURL)
}

func userInterface(cfg config.Config) (http.Handler, error) {
	if cfg.DevProxy != "" {
		log.Printf("arayuz gelistirme sunucusundan aktariliyor: %s", cfg.DevProxy)
		return web.DevProxy(cfg.DevProxy)
	}
	return web.Handler()
}

// securityHeaders, panelin tarayicida acilirken tasidigi temel korumalar.
//
// CSP'de 'unsafe-inline' YALNIZCA stil icin var: arayuz kutuphanesi bilesen
// stillerini satir ici yaziyor. Betiklerde yok, yani sayfaya enjekte edilen
// bir betik calismaz.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; "+
				"font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'")
		next.ServeHTTP(w, r)
	})
}
