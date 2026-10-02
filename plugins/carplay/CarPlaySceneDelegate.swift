import CarPlay
import CoreLocation
import MapKit
import UIKit

/// TORA WATT'in arac ekranindaki yuzu.
///
/// NEDEN NATIVE: CarPlay'in JS koprusu (react-native-carplay) React 17/18 ve
/// eski mimariye bagli; bu proje React 19 ve yeni mimariyle calisiyor
/// (Reanimated 4 eskisini kabul etmiyor). Saat uygulamasinda oldugu gibi
/// burada da cozum CarPlay'i dogrudan Swift'te yazmak: JS'e native modul
/// girmiyor, Expo Go calismaya devam ediyor.
///
/// EKRAN TASARIMI: arac ekraninda surucu bir seye en fazla birkac saniye
/// bakabilir. Bu yuzden tek bir harita sablonu var - pinler ve altinda kayan
/// liste - ve her istasyonun tek bir birincil eylemi: yol tarifi. Arama,
/// suzgec, ayar yok; surerken kimse onlari kullanamaz.
final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?
    private let locationManager = CLLocationManager()
    private var refreshTimer: Timer?

    // MARK: - Sahne yasam dongusu

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        interfaceController.setRootTemplate(makeMessageTemplate(
            title: "İstasyonlar yükleniyor",
            message: "Konumuna en yakın TORA şarj noktaları hazırlanıyor."
        ), animated: false, completion: nil)

        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        refresh()

        // Arac hareket halinde; liste durdugu yerde kalmamali. Bes dakika,
        // mesafelerin anlamli olmasi icin yeterli ve pil/veri acisindan ucuz.
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnectInterfaceController interfaceController: CPInterfaceController
    ) {
        refreshTimer?.invalidate()
        refreshTimer = nil
        self.interfaceController = nil
    }

    // MARK: - Veri

    private func refresh() {
        // Izin ANA uygulamada aliniyor; arac baglandiginda kullanicidan izin
        // istemek surucuyu telefona bakmaya zorlardi.
        guard let coordinate = locationManager.location?.coordinate else {
            show(makeMessageTemplate(
                title: "Konum yok",
                message: "TORA WATT'ı telefonunda bir kez açıp konum izni ver."
            ))
            return
        }

        Task { [weak self] in
            guard let self else { return }
            do {
                let stations = try await CarPlayFeed.nearbyToraStations(
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude
                )
                await MainActor.run {
                    if stations.isEmpty {
                        self.show(self.makeMessageTemplate(
                            title: "Yakında istasyon yok",
                            message: "50 km içinde TORA şarj istasyonu bulunamadı."
                        ))
                    } else {
                        self.show(self.makeStationsTemplate(stations))
                    }
                }
            } catch {
                await MainActor.run {
                    self.show(self.makeMessageTemplate(
                        title: "Bağlanılamadı",
                        message: "İstasyon listesi alınamadı. Bağlantı gelince kendiliğinden yenilenecek."
                    ))
                }
            }
        }
    }

    /// Kok sablonu degistirir.
    ///
    /// CarPlay yigini bilerek TEK katmanda tutuluyor: surucu "geri" aramak
    /// zorunda kalmasin ve her yenileme ayni ekrani tazelesin.
    private func show(_ template: CPTemplate) {
        interfaceController?.setRootTemplate(template, animated: false, completion: nil)
    }

    // MARK: - Sablonlar

    /// Harita + istasyon listesi.
    ///
    /// CPPointOfInterestTemplate Apple'in tam bu is icin tasarladigi sablon:
    /// haritayi CarPlay kendisi ciziyor, biz yalnizca noktalari ve her
    /// noktanin eylemlerini veriyoruz.
    private func makeStationsTemplate(_ stations: [CarStation]) -> CPPointOfInterestTemplate {
        // En fazla 12 nokta: CarPlay daha fazlasini zaten kirpiyor ve surerken
        // uzun liste okunmuyor.
        let points = stations.prefix(12).map { station -> CPPointOfInterest in
            let item = MKMapItem(placemark: MKPlacemark(coordinate: station.coordinate))
            item.name = station.displayName

            let poi = CPPointOfInterest(
                location: item,
                title: station.displayName,
                subtitle: station.subtitle,
                summary: nil,
                detailTitle: station.displayName,
                detailSubtitle: station.subtitle,
                detailSummary: station.operatorName,
                pinImage: nil
            )

            // Tek eylem: yol tarifi. Arac ekraninda ikinci bir secenek
            // sunmak, surucuyu karar vermeye zorlamak demek.
            poi.primaryButton = CPTextButton(
                title: "Yol tarifi",
                textStyle: .confirm
            ) { _ in
                item.openInMaps(launchOptions: [
                    MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
                ])
            }
            return poi
        }

        return CPPointOfInterestTemplate(
            title: "TORA WATT",
            pointsOfInterest: Array(points),
            selectedIndex: NSNotFound
        )
    }

    /// Yukleniyor, bos ve hata durumlarinin ortak sablonu.
    private func makeMessageTemplate(title: String, message: String) -> CPInformationTemplate {
        CPInformationTemplate(
            title: title,
            layout: .leading,
            items: [CPInformationItem(title: nil, detail: message)],
            actions: [
                CPTextButton(title: "Yenile", textStyle: .normal) { [weak self] _ in
                    self?.refresh()
                }
            ]
        )
    }
}
