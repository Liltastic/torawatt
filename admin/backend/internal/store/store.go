// Package store, yonetim panelinin okudugu veri kaynagini tanimlar.
//
// Iki uygulamasi var: gercek veritabani (postgres.go) ve bagimsiz calisan
// ornek veri (demo.go). Arayuzun varligi tek bir amaca hizmet ediyor - panel
// bir Postgres baglantisi olmadan da acilip calisabiliyor, boylece arayuz
// gelistirilirken canli veritabanina dokunmak gerekmiyor.
package store

import (
	"context"
	"time"
)

// --- Alan modelleri (mobil uygulamanin semasiyla ayni; bkz. server/prisma/schema.prisma) ---

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	Vehicles  int       `json:"vehicles"`
	Sessions  int       `json:"sessions"`
	EnergyKwh float64   `json:"energyKwh"`
}

type Connector struct {
	ID            string   `json:"id"`
	StationID     string   `json:"stationId"`
	Type          string   `json:"type"`
	PowerKw       float64  `json:"powerKw"`
	Status        string   `json:"status"`
	PricePerKwh   *float64 `json:"pricePerKwh"`
	IdleFeePerMin *float64 `json:"idleFeePerMin"`
}

type Station struct {
	ID         string      `json:"id"`
	Name       string      `json:"name"`
	Address    string      `json:"address"`
	Operator   string      `json:"operator"`
	Latitude   float64     `json:"latitude"`
	Longitude  float64     `json:"longitude"`
	Amenities  []string    `json:"amenities"`
	Connectors []Connector `json:"connectors"`
}

type Vehicle struct {
	ID                 string  `json:"id"`
	OwnerID            string  `json:"ownerId"`
	OwnerEmail         string  `json:"ownerEmail"`
	Make               string  `json:"make"`
	Model              string  `json:"model"`
	ModelYear          int     `json:"modelYear"`
	BatteryCapacityKwh float64 `json:"batteryCapacityKwh"`
	IsActive           bool    `json:"isActive"`
}

type Reservation struct {
	ID              string    `json:"id"`
	OwnerID         string    `json:"ownerId"`
	OwnerEmail      string    `json:"ownerEmail"`
	StationName     string    `json:"stationName"`
	ConnectorLabel  string    `json:"connectorLabel"`
	StartsAt        time.Time `json:"startsAt"`
	DurationMinutes int       `json:"durationMinutes"`
	Status          string    `json:"status"`
}

type Session struct {
	ID              string    `json:"id"`
	OwnerID         string    `json:"ownerId"`
	OwnerEmail      string    `json:"ownerEmail"`
	StationName     string    `json:"stationName"`
	ConnectorLabel  string    `json:"connectorLabel"`
	StartedAt       time.Time `json:"startedAt"`
	EndedAt         time.Time `json:"endedAt"`
	DurationMinutes int       `json:"durationMinutes"`
	EnergyKwh       float64   `json:"energyKwh"`
	PricePerKwh     float64   `json:"pricePerKwh"`
	Cost            float64   `json:"cost"`
}

type Campaign struct {
	ID            string     `json:"id"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	DiscountLabel string     `json:"discountLabel"`
	ValidUntil    *time.Time `json:"validUntil"`
	IsActive      bool       `json:"isActive"`
}

type SupportRequest struct {
	ID         string    `json:"id"`
	OwnerID    string    `json:"ownerId"`
	OwnerEmail string    `json:"ownerEmail"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"createdAt"`
}

// --- Panosu besleyen ozetler ---

// Point, grafiklerdeki tek bir sutun/nokta.
type Point struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

// Metric, ustteki dort kartin her biri: buyuk sayi + kendi mini grafigi.
type Metric struct {
	Value  float64 `json:"value"`
	Delta  float64 `json:"delta"` // onceki doneme gore yuzde degisim
	Series []Point `json:"series"`
}

type Overview struct {
	Energy      Metric  `json:"energy"`
	Sessions    Metric  `json:"sessions"`
	Revenue     Metric  `json:"revenue"`
	Utilisation Metric  `json:"utilisation"`
	Activity    []Point `json:"activity"`
	// Panonun sagindaki "Planlanan" listesi ve alttaki uc vurgu karti.
	Upcoming    []Reservation `json:"upcoming"`
	TopStations []StationLoad `json:"topStations"`
	Counts      Counts        `json:"counts"`
}

type StationLoad struct {
	StationID string  `json:"stationId"`
	Name      string  `json:"name"`
	Sessions  int     `json:"sessions"`
	EnergyKwh float64 `json:"energyKwh"`
	Available int     `json:"available"`
	Total     int     `json:"total"`
}

type Counts struct {
	Users        int `json:"users"`
	Stations     int `json:"stations"`
	Connectors   int `json:"connectors"`
	Vehicles     int `json:"vehicles"`
	Reservations int `json:"reservations"`
	Campaigns    int `json:"campaigns"`
	Support      int `json:"support"`
}

// Page, tablolarin sayfalanmis cevabi.
type Page[T any] struct {
	Items []T `json:"items"`
	Total int `json:"total"`
}

// Query, listelerin ortak suzgeci.
type Query struct {
	Search string
	Status string
	Limit  int
	Offset int
}

// Store, panelin ihtiyac duydugu butun okuma ve yazma islemleri.
type Store interface {
	Overview(ctx context.Context, days int) (Overview, error)

	Users(ctx context.Context, q Query) (Page[User], error)
	DeleteUser(ctx context.Context, id string) error

	Stations(ctx context.Context, q Query) (Page[Station], error)
	Station(ctx context.Context, id string) (Station, error)
	SaveStation(ctx context.Context, s Station) (Station, error)
	DeleteStation(ctx context.Context, id string) error
	SetConnectorStatus(ctx context.Context, id, status string) error

	Vehicles(ctx context.Context, q Query) (Page[Vehicle], error)
	Reservations(ctx context.Context, q Query) (Page[Reservation], error)
	SetReservationStatus(ctx context.Context, id, status string) error
	Sessions(ctx context.Context, q Query) (Page[Session], error)

	Campaigns(ctx context.Context, q Query) (Page[Campaign], error)
	SaveCampaign(ctx context.Context, c Campaign) (Campaign, error)
	DeleteCampaign(ctx context.Context, id string) error

	Support(ctx context.Context, q Query) (Page[SupportRequest], error)

	Close()
}
