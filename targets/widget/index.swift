import SwiftUI
import WidgetKit

/// TORA WATT widget'lari.
///
/// Saat uygulamasiyla ayni tasarim karari: widget veriyi telefonun JS
/// tarafindan paylasilan depo uzerinden almiyor, dogrudan EVCS katalogundan
/// cekiyor (bkz. EvcsFeed). Boylece JS'e native modul girmiyor ve Expo Go
/// calismaya devam ediyor.
@main
struct ToraWattWidgetBundle: WidgetBundle {
    var body: some Widget {
        NearestStationWidget()
    }
}
