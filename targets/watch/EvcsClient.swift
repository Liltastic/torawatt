import CoreLocation
import Foundation
import MapKit

// MARK: - Model

struct Socket: Identifiable {
    let sktNo: String
    let currentType: String
    let socketType: String
    let powerKw: Double

    var id: String { sktNo }

    /// Katalogun kodu ("AC_TYPE2") yerine kullanicinin bildigi ad.
    var typeLabel: String {
        switch socketType {
        case "AC_TYPE2": return "Type 2"
        case "DC_CCS": return "CCS2"
        case "DC_CHADEMO": return "CHAdeMO"
        case "DC_NACS": return "NACS"
        default: return socketType
        }
    }

    var powerLabel: String {
        "\(currentType) · \(Int(powerKw.rounded())) kW"
    }
}

struct Station: Identifiable {
    let id: Int
    let name: String
    let operatorName: String
    let address: String
    let province: String?
    let latitude: Double
    let longitude: Double
    let socketCount: Int
    let maxPowerKw: Double
    let sockets: [Socket]?
    var distanceKm: Double?

    var displayName: String { name }

    var distanceLabel: String? {
        guard let distanceKm else { return nil }
        if distanceKm < 10 {
            return String(format: "%.1f km", distanceKm)
        }
        return "\(Int(distanceKm.rounded())) km"
    }

    /// Bilekte yer az: "180 kW" tek basina en cok sey anlatan deger.
    var powerLabel: String {
        "\(Int(maxPowerKw.rounded())) kW"
    }

    /// Soket tipleri, tekrarsiz ve guce gore sirali ("CCS2", "Type 2").
    var socketTypeLabels: [String] {
        guard let sockets, !sockets.isEmpty else { return [] }
        var seen = Set<String>()
        return sockets
            .sorted { $0.powerKw > $1.powerKw }
            .compactMap { seen.insert($0.typeLabel).inserted ? $0.typeLabel : nil }
    }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    /// Apple Haritalar uzerinden yol tarifi baslatir.
    ///
    /// Saatte tarifi baslatabilmek telefonu cebinden cikarmadan yola
    /// koyulmayi sagliyor; bir sarj uygulamasinda en cok istenen eylem bu.
    func openDirections() {
        let item = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
        item.name = displayName
        item.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
        ])
    }
}

enum EvcsError: LocalizedError {
    case notFound

    var errorDescription: String? { "İstasyon bulunamadı" }
}

// MARK: - Liste

/// Saat uygulamasinin istasyon listesi: ORNEK VERI, ag istegi yok.
///
/// Telefondaki src/data/demoStations.ts ile ayni liste. Kopya olmasinin sebebi
/// Xcode hedeflerinin ayri derleme birimleri olmasi (bkz. targets/README.md);
/// liste degisirse dort Swift dosyasi da guncellenmeli.
enum EvcsClient {
    private static let stations: [Station] = [
        Station(
            id: 1,
            name: "Demo Maslak",
            operatorName: "TORA WATT Demo",
            address: "Maslak, Sarıyer/İstanbul",
            province: "İstanbul",
            latitude: 41.1106,
            longitude: 29.0206,
            socketCount: 4,
            maxPowerKw: 180.0,
            sockets: [
                Socket(sktNo: "C1", currentType: "DC", socketType: "DC_CCS", powerKw: 180.0),
                Socket(sktNo: "C2", currentType: "DC", socketType: "DC_CCS", powerKw: 180.0),
                Socket(sktNo: "C3", currentType: "DC", socketType: "DC_CHADEMO", powerKw: 50.0),
                Socket(sktNo: "C4", currentType: "AC", socketType: "AC_TYPE2", powerKw: 22.0),
            ]
        ),
        Station(
            id: 2,
            name: "Demo Levent",
            operatorName: "TORA WATT Demo",
            address: "Levent, Beşiktaş/İstanbul",
            province: "İstanbul",
            latitude: 41.0819,
            longitude: 29.0117,
            socketCount: 2,
            maxPowerKw: 60.0,
            sockets: [
                Socket(sktNo: "C5", currentType: "DC", socketType: "DC_CCS", powerKw: 60.0),
                Socket(sktNo: "C6", currentType: "AC", socketType: "AC_TYPE2", powerKw: 11.0),
            ]
        ),
        Station(
            id: 3,
            name: "Demo Kağıthane",
            operatorName: "TORA WATT Demo",
            address: "Merkez, Kağıthane/İstanbul",
            province: "İstanbul",
            latitude: 41.0876,
            longitude: 28.9712,
            socketCount: 3,
            maxPowerKw: 300.0,
            sockets: [
                Socket(sktNo: "C7", currentType: "DC", socketType: "DC_CCS", powerKw: 300.0),
                Socket(sktNo: "C8", currentType: "DC", socketType: "DC_CCS", powerKw: 300.0),
                Socket(sktNo: "C9", currentType: "AC", socketType: "AC_TYPE2", powerKw: 22.0),
            ]
        ),
        Station(
            id: 4,
            name: "Demo Beşiktaş",
            operatorName: "TORA WATT Demo",
            address: "Sinanpaşa, Beşiktaş/İstanbul",
            province: "İstanbul",
            latitude: 41.0422,
            longitude: 29.0061,
            socketCount: 2,
            maxPowerKw: 90.0,
            sockets: [
                Socket(sktNo: "C10", currentType: "DC", socketType: "DC_CCS", powerKw: 90.0),
                Socket(sktNo: "C11", currentType: "DC", socketType: "DC_CCS", powerKw: 90.0),
            ]
        ),
        Station(
            id: 5,
            name: "Demo Ataşehir",
            operatorName: "TORA WATT Demo",
            address: "Barbaros, Ataşehir/İstanbul",
            province: "İstanbul",
            latitude: 40.9923,
            longitude: 29.1244,
            socketCount: 3,
            maxPowerKw: 150.0,
            sockets: [
                Socket(sktNo: "C12", currentType: "DC", socketType: "DC_CCS", powerKw: 150.0),
                Socket(sktNo: "C13", currentType: "DC", socketType: "DC_NACS", powerKw: 150.0),
                Socket(sktNo: "C14", currentType: "AC", socketType: "AC_TYPE2", powerKw: 22.0),
            ]
        ),
        Station(
            id: 6,
            name: "Demo Gebze",
            operatorName: "TORA WATT Demo",
            address: "TEM Otoyolu, Gebze/Kocaeli",
            province: "Kocaeli",
            latitude: 40.8021,
            longitude: 29.4307,
            socketCount: 2,
            maxPowerKw: 180.0,
            sockets: [
                Socket(sktNo: "C20", currentType: "DC", socketType: "DC_CCS", powerKw: 180.0),
                Socket(sktNo: "C21", currentType: "DC", socketType: "DC_CCS", powerKw: 180.0),
            ]
        ),
        Station(
            id: 7,
            name: "Demo Sakarya",
            operatorName: "TORA WATT Demo",
            address: "TEM Otoyolu, Adapazarı/Sakarya",
            province: "Sakarya",
            latitude: 40.7654,
            longitude: 30.4012,
            socketCount: 2,
            maxPowerKw: 150.0,
            sockets: [
                Socket(sktNo: "C22", currentType: "DC", socketType: "DC_CCS", powerKw: 150.0),
                Socket(sktNo: "C23", currentType: "DC", socketType: "DC_CHADEMO", powerKw: 50.0),
            ]
        ),
        Station(
            id: 8,
            name: "Demo Düzce",
            operatorName: "TORA WATT Demo",
            address: "TEM Otoyolu, Düzce",
            province: "Düzce",
            latitude: 40.8438,
            longitude: 31.1565,
            socketCount: 2,
            maxPowerKw: 90.0,
            sockets: [
                Socket(sktNo: "C24", currentType: "DC", socketType: "DC_CCS", powerKw: 90.0),
                Socket(sktNo: "C25", currentType: "AC", socketType: "AC_TYPE2", powerKw: 22.0),
            ]
        ),
        Station(
            id: 9,
            name: "Demo Bolu",
            operatorName: "TORA WATT Demo",
            address: "Bolu Dağı Geçişi, Bolu",
            province: "Bolu",
            latitude: 40.7396,
            longitude: 31.6112,
            socketCount: 3,
            maxPowerKw: 300.0,
            sockets: [
                Socket(sktNo: "C26", currentType: "DC", socketType: "DC_CCS", powerKw: 300.0),
                Socket(sktNo: "C27", currentType: "DC", socketType: "DC_CCS", powerKw: 300.0),
                Socket(sktNo: "C28", currentType: "DC", socketType: "DC_NACS", powerKw: 250.0),
            ]
        ),
        Station(
            id: 10,
            name: "Demo Gerede",
            operatorName: "TORA WATT Demo",
            address: "D100 Karayolu, Gerede/Bolu",
            province: "Bolu",
            latitude: 40.8005,
            longitude: 32.1985,
            socketCount: 1,
            maxPowerKw: 120.0,
            sockets: [
                Socket(sktNo: "C29", currentType: "DC", socketType: "DC_CCS", powerKw: 120.0),
            ]
        ),
        Station(
            id: 11,
            name: "Demo Kızılcahamam",
            operatorName: "TORA WATT Demo",
            address: "Ankara Yolu, Kızılcahamam/Ankara",
            province: "Ankara",
            latitude: 40.4712,
            longitude: 32.6489,
            socketCount: 2,
            maxPowerKw: 180.0,
            sockets: [
                Socket(sktNo: "C30", currentType: "DC", socketType: "DC_CCS", powerKw: 180.0),
                Socket(sktNo: "C31", currentType: "AC", socketType: "AC_TYPE2", powerKw: 22.0),
            ]
        ),
    ]

    /// En yakindan uzaga sirali. Yaricap yok: ornek istasyonlar tek bir hatta
    /// duruyor ve baska sehirdeki kullanici bos ekran gormemeli.
    static func nearbyToraStations(latitude: Double, longitude: Double) async throws -> [Station] {
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

    static func station(id: Int) async throws -> Station {
        guard let station = stations.first(where: { $0.id == id }) else {
            throw EvcsError.notFound
        }
        return station
    }
}
