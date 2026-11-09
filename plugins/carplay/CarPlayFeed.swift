import CoreLocation
import Foundation

/// CarPlay'in istasyon listesi: ORNEK VERI, ag istegi yok.
///
/// Telefondaki src/data/demoStations.ts ile ayni liste. Kopya olmasinin sebebi
/// Xcode hedeflerinin ayri derleme birimleri olmasi (bkz. targets/README.md);
/// liste degisirse dort Swift dosyasi da guncellenmeli.
struct CarStation: Identifiable {
    let id: Int
    let name: String
    let operatorName: String
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

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    /// CarPlay listesinde tek satirda gorunen ozet.
    var subtitle: String {
        "\(distanceLabel) · \(socketCount) soket"
    }
}

enum CarPlayFeed {
    private static let stations: [CarStation] = [
        CarStation(id: 1, name: "Demo Maslak", operatorName: "TORA WATT Demo", latitude: 41.1106, longitude: 29.0206, socketCount: 4),
        CarStation(id: 2, name: "Demo Levent", operatorName: "TORA WATT Demo", latitude: 41.0819, longitude: 29.0117, socketCount: 2),
        CarStation(id: 3, name: "Demo Kağıthane", operatorName: "TORA WATT Demo", latitude: 41.0876, longitude: 28.9712, socketCount: 3),
        CarStation(id: 4, name: "Demo Beşiktaş", operatorName: "TORA WATT Demo", latitude: 41.0422, longitude: 29.0061, socketCount: 2),
        CarStation(id: 5, name: "Demo Ataşehir", operatorName: "TORA WATT Demo", latitude: 40.9923, longitude: 29.1244, socketCount: 3),
        CarStation(id: 6, name: "Demo Gebze", operatorName: "TORA WATT Demo", latitude: 40.8021, longitude: 29.4307, socketCount: 2),
        CarStation(id: 7, name: "Demo Sakarya", operatorName: "TORA WATT Demo", latitude: 40.7654, longitude: 30.4012, socketCount: 2),
        CarStation(id: 8, name: "Demo Düzce", operatorName: "TORA WATT Demo", latitude: 40.8438, longitude: 31.1565, socketCount: 2),
        CarStation(id: 9, name: "Demo Bolu", operatorName: "TORA WATT Demo", latitude: 40.7396, longitude: 31.6112, socketCount: 3),
        CarStation(id: 10, name: "Demo Gerede", operatorName: "TORA WATT Demo", latitude: 40.8005, longitude: 32.1985, socketCount: 1),
        CarStation(id: 11, name: "Demo Kızılcahamam", operatorName: "TORA WATT Demo", latitude: 40.4712, longitude: 32.6489, socketCount: 2),
    ]

    /// En yakindan uzaga sirali. Yaricap yok: ornek istasyonlar tek bir hatta
    /// duruyor ve baska sehirdeki kullanici bos ekran gormemeli.
    static func nearbyToraStations(latitude: Double, longitude: Double) async throws -> [CarStation] {
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
