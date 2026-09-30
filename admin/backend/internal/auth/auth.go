// Package auth, panelin tek yoneticili giris akisi.
//
// Neden tablo yok: mobil uygulamanin semasina yeni bir tablo eklemek migration
// demek ve canli veritabani ortak. Yonetici kimligi ortam degiskeninden
// geliyor; birden fazla yonetici gerektiginde dogru adim bir "AdminUser"
// tablosu ve burada Store arayuzu (bkz. Verifier).
package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrBadCredentials = errors.New("e-posta ya da parola hatali")
	ErrUnauthorised   = errors.New("oturum gecersiz")
)

type Authenticator struct {
	email        string
	passwordHash []byte
	secret       []byte
	ttl          time.Duration
}

// New, yoneticiyi kurar. Duz parola verildiyse burada hash'lenir.
func New(email, passwordHash, passwordRaw string, secret []byte, ttlHours int) (*Authenticator, error) {
	hash := []byte(passwordHash)
	if len(hash) == 0 {
		generated, err := bcrypt.GenerateFromPassword([]byte(passwordRaw), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		hash = generated
	}
	return &Authenticator{
		email:        strings.ToLower(email),
		passwordHash: hash,
		secret:       secret,
		ttl:          time.Duration(ttlHours) * time.Hour,
	}, nil
}

// Login, kimligi dogrular ve imzali bir bilet uretir.
//
// E-posta yanlis olsa bile bcrypt karsilastirmasi CALISTIRILIYOR: aksi halde
// cevap suresi "bu e-posta kayitli mi" sorusunu ele verir.
func (a *Authenticator) Login(email, password string) (string, time.Time, error) {
	matchEmail := strings.EqualFold(strings.TrimSpace(email), a.email)
	err := bcrypt.CompareHashAndPassword(a.passwordHash, []byte(password))
	if !matchEmail || err != nil {
		return "", time.Time{}, ErrBadCredentials
	}

	expires := time.Now().Add(a.ttl)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Subject:   a.email,
		Issuer:    "tora-watt-admin",
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(expires),
	})
	signed, err := token.SignedString(a.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expires, nil
}

func (a *Authenticator) Email() string { return a.email }

// verify, biletin imzasini ve suresini denetler.
func (a *Authenticator) verify(raw string) error {
	token, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		// Algoritma SABITLENIYOR: aksi halde "alg: none" tasiyan bir bilet
		// gecerli sayilabilir.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrUnauthorised
		}
		return a.secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer("tora-watt-admin"))
	if err != nil || !token.Valid {
		return ErrUnauthorised
	}
	return nil
}

type ctxKey struct{}

// Middleware, korumali uclari sarar.
func (a *Authenticator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := bearer(r)
		if raw == "" {
			if cookie, err := r.Cookie("tw_admin"); err == nil {
				raw = cookie.Value
			}
		}
		if raw == "" || a.verify(raw) != nil {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"Oturum gerekli"}`))
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, a.email)))
	})
}

func bearer(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if after, ok := strings.CutPrefix(header, "Bearer "); ok {
		return strings.TrimSpace(after)
	}
	return ""
}
