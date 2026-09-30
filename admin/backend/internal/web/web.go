// Package web, derlenmis arayuzu binary'nin icine gomer ve servis eder.
//
// Tek dosya dagitim: Go binary'si calistiginda yaninda hicbir sey olmadan
// paneli acabiliyor. Arayuz "npm run build" ciktisindan buraya kopyalanir
// (bkz. admin/README.md).
package web

import (
	"embed"
	"io/fs"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// dist icindeki placeholder, arayuz hic derlenmeden de go build calissin diye
// depoda duruyor; gercek derleme onun uzerine yaziyor.
//
//go:embed all:dist
var dist embed.FS

// Handler, gomulu arayuzu servis eden isleyici.
//
// TEK SAYFA UYGULAMASI: bilinmeyen yollar 404 yerine index.html donmeli,
// yoksa /istasyonlar adresini tarayicida yenilemek bos sayfa veriyor. Ancak
// dosya uzantisi tasiyan istekler (ornegin .js, .css) 404 kalmali; onlari da
// index'e cevirmek, eksik bir betigi HTML olarak yukleyip anlasilmasi zor bir
// hataya donusturuyor.
func Handler() (http.Handler, error) {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		return nil, err
	}
	files := http.FileServer(http.FS(sub))

	// Arayuz henuz derlenmemis olabilir (depoda yalnizca .gitkeep durur).
	// Dizin listesi gostermek yerine ne yapilmasi gerektigini soyluyoruz.
	if _, err := fs.Stat(sub, "index.html"); err != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("Arayuz derlenmemis. admin/web icinde: npm install && npm run build"))
		}), nil
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		if _, err := fs.Stat(sub, path); err == nil {
			// Parmak izli varliklar uzun sureli onbellege alinabilir; index
			// her zaman taze gelmeli ki yeni surum aninda acilsin.
			if strings.HasPrefix(path, "assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			} else {
				w.Header().Set("Cache-Control", "no-cache")
			}
			files.ServeHTTP(w, r)
			return
		}

		if strings.Contains(path[strings.LastIndex(path, "/")+1:], ".") {
			http.NotFound(w, r)
			return
		}

		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, r2)
	}), nil
}

// DevProxy, arayuz isteklerini Vite gelistirme sunucusuna aktarir.
//
// Boylece Go sunucusu API'yi verirken arayuz aninda yenileniyor ve gelistirme
// sirasinda her degisiklikte yeniden derleme gerekmiyor.
func DevProxy(target string) (http.Handler, error) {
	parsed, err := url.Parse(target)
	if err != nil {
		return nil, err
	}
	return httputil.NewSingleHostReverseProxy(parsed), nil
}
