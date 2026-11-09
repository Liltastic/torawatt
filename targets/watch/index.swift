import SwiftUI

/// TORA WATT'in Apple Watch uygulamasi.
///
/// Telefondan BAGIMSIZ calisiyor: veriyi WatchConnectivity ile telefondan
/// istemek yerine ornek istasyon listesini kendi tasiyor (bkz. EvcsClient).
/// Boylece telefonun acik/erisilebilir olmasina bagli bir kirilganlik olusmuyor.
@main
struct ToraWattWatchApp: App {
    var body: some Scene {
        WindowGroup {
            StationListView()
        }
    }
}
