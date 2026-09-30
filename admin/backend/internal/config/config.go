// Package config, sunucunun ortam degiskenlerinden okudugu ayarlar.
package config

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Addr string
	// DatabaseURL bosken panel ornek veriyle acilir (bkz. store.Demo).
	DatabaseURL string
	AdminEmail  string
	// AdminPasswordHash bcrypt ciktisi. Duz parola verildiyse acilista
	// hash'lenir; bu yalnizca yerel kullanim icin bir kolaylik.
	AdminPasswordHash string
	AdminPasswordRaw  string
	JWTSecret         []byte
	// SessionHours, giris bileti gecerlilik suresi.
	SessionHours int
	// DevProxy doluysa arayuz istekleri Vite gelistirme sunucusuna aktarilir;
	// boylece Go sunucusunu yeniden derlemeden arayuz uzerinde calisilabiliyor.
	DevProxy string
}

func Load() (Config, error) {
	cfg := Config{
		Addr:              envOr("ADMIN_ADDR", ":8090"),
		DatabaseURL:       strings.TrimSpace(os.Getenv("DATABASE_URL")),
		AdminEmail:        strings.TrimSpace(envOr("ADMIN_EMAIL", "admin@torawatt.local")),
		AdminPasswordHash: strings.TrimSpace(os.Getenv("ADMIN_PASSWORD_HASH")),
		AdminPasswordRaw:  os.Getenv("ADMIN_PASSWORD"),
		DevProxy:          strings.TrimSpace(os.Getenv("ADMIN_DEV_PROXY")),
		SessionHours:      intOr("ADMIN_SESSION_HOURS", 12),
	}

	if cfg.AdminPasswordHash == "" && cfg.AdminPasswordRaw == "" {
		return Config{}, fmt.Errorf("ADMIN_PASSWORD ya da ADMIN_PASSWORD_HASH verilmeli")
	}

	secret := strings.TrimSpace(os.Getenv("ADMIN_JWT_SECRET"))
	if secret == "" {
		// Uretilmis anahtar SUNUCU OMRU boyunca gecerli: yeniden baslatinca
		// herkes yeniden giris yapar. Kalici oturum isteniyorsa degisken
		// verilmeli - bunu sessizce yapmak yerine soyluyoruz (bkz. main.go).
		buf := make([]byte, 32)
		if _, err := rand.Read(buf); err != nil {
			return Config{}, fmt.Errorf("gecici anahtar uretilemedi: %w", err)
		}
		secret = hex.EncodeToString(buf)
		cfg.JWTSecret = []byte(secret)
		return cfg, nil
	}
	if len(secret) < 16 {
		return Config{}, fmt.Errorf("ADMIN_JWT_SECRET en az 16 karakter olmali")
	}
	cfg.JWTSecret = []byte(secret)
	return cfg, nil
}

// UsesDemoData, panelin ornek veriyle mi calistigi. Arayuz bunu ust cubukta
// rozet olarak gosteriyor ki kimse demo sayilari gercek sanmasin.
func (c Config) UsesDemoData() bool { return c.DatabaseURL == "" }

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func intOr(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}
