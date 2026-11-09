import CoreLocation
import Foundation

/// Kadran complication'inin istasyon listesi: ORNEK VERI, ag istegi yok.
///
/// Telefondaki src/data/demoStations.ts ile ayni liste. Kopya olmasinin sebebi
/// Xcode hedeflerinin ayri derleme birimleri olmasi (bkz. targets/README.md);
/// liste degisirse dort Swift dosyasi da guncellenmeli.
struct WatchStation: Identifiable {
    let id: Int
    let name: String
    let latitude: Double
    let longitude: Double
    let socketCount: Int
    var distanceKm: Double?

    var displayName: String { name }

    var distanceLabel: String {
        guard let distanceKm else { return "—" }
        if distanceKm < 10 {
            return String(format: "%.1f km", distanceKm)
        }
        return "\(Int(distanceKm.rounded())) km"
    }
}

enum WatchFeed {
    private static let stations: [WatchStation] = [
        WatchStation(id: 1, name: "Demo Maslak", latitude: 41.1106, longitude: 29.0206, socketCount: 4),
        WatchStation(id: 2, name: "Demo Levent", latitude: 41.0819, longitude: 29.0117, socketCount: 2),
        WatchStation(id: 3, name: "Demo Kağıthane", latitude: 41.0876, longitude: 28.9712, socketCount: 3),
        WatchStation(id: 4, name: "Demo Beşiktaş", latitude: 41.0422, longitude: 29.0061, socketCount: 2),
        WatchStation(id: 5, name: "Demo Ataşehir", latitude: 40.9923, longitude: 29.1244, socketCount: 3),
        WatchStation(id: 6, name: "Demo Gebze", latitude: 40.8021, longitude: 29.4307, socketCount: 2),
        WatchStation(id: 7, name: "Demo Sakarya", latitude: 40.7654, longitude: 30.4012, socketCount: 2),
        WatchStation(id: 8, name: "Demo Düzce", latitude: 40.8438, longitude: 31.1565, socketCount: 2),
        WatchStation(id: 9, name: "Demo Bolu", latitude: 40.7396, longitude: 31.6112, socketCount: 3),
        WatchStation(id: 10, name: "Demo Gerede", latitude: 40.8005, longitude: 32.1985, socketCount: 1),
        WatchStation(id: 11, name: "Demo Kızılcahamam", latitude: 40.4712, longitude: 32.6489, socketCount: 2),
    ]

    /// En yakindan uzaga sirali. Yaricap yok: ornek istasyonlar tek bir hatta
    /// duruyor ve baska sehirdeki kullanici bos ekran gormemeli.
    static func nearbyToraStations(latitude: Double, longitude: Double) async throws -> [WatchStation] {
        let here = CLLocation(latitude: latitude, longitude: longitude)
        return stations
            .map { station in
                var located = station
                located.distanceKm = here.distance(
                    from: CLLocation(latitude: station.latitude, longitude: station.longitude)
                ) / 1000
                return located
            }
            .sorted { ($0.distanceKm ?? 0) < ($1.distanceKm ?? 0) }
    }
}
