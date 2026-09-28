import SwiftUI

/// TORA WATT'in Apple Watch uygulamasi.
///
/// Telefondan BAGIMSIZ calisiyor: veriyi WatchConnectivity ile telefondan
/// istemek yerine dogrudan EVCS katalogundan cekiyor (bkz. EvcsClient).
/// Kullandigimiz uclar token istemedigi icin bu mumkun ve boylece telefonun
/// acik/erisilebilir olmasina bagli bir kirilganlik olusmuyor.
@main
struct ToraWattWatchApp: App {
    var body: some Scene {
        WindowGroup {
            StationListView()
        }
    }
}
