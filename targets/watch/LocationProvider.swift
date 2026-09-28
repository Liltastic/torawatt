import CoreLocation
import Foundation

/// Saatin kendi konumu.
///
/// Telefondan konum istemiyoruz: Apple Watch'un kendi GPS'i (ya da eslesmis
/// telefondan aldigi konum) CoreLocation uzerinden dogrudan geliyor ve
/// boylece telefonun erisilebilir olmasina bagli kalmiyoruz.
///
/// Delegate cagrilari arka is parcaciginda gelebiliyor; @Published alanlari
/// bilerek DispatchQueue.main uzerinden guncelliyoruz.
final class LocationProvider: NSObject, ObservableObject {
    @Published var coordinate: CLLocationCoordinate2D?
    @Published var denied = false

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        // Sehir olceginde istasyon aradigimiz icin en yuksek hassasiyet
        // gereksiz; daha az pil harciyor ve daha hizli sonuc veriyor.
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    /// Izin durumuna gore ya izin ister ya da tek seferlik konum alir.
    func request() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            denied = true
        default:
            manager.requestLocation()
        }
    }
}

extension LocationProvider: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            DispatchQueue.main.async { self.denied = false }
            manager.requestLocation()
        case .denied, .restricted:
            DispatchQueue.main.async { self.denied = true }
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let last = locations.last else { return }
        DispatchQueue.main.async { self.coordinate = last.coordinate }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Konum alinamazsa liste bos kalir ve kullaniciya tekrar deneme
        // dugmesi gosterilir (bkz. StationListView); sessizce gecmiyoruz ama
        // hatanin kendisi kullaniciya bir sey anlatmiyor.
    }
}
