import SwiftUI
import WidgetKit

/// Saat kadrani complication'lari.
///
/// Saat uygulamasiyla ayni tasarim karari: veri telefonun JS tarafindan
/// gelmiyor, dogrudan EVCS katalogundan cekiliyor (bkz. WatchFeed). Boylece
/// JS'e native modul girmiyor ve Expo Go calismaya devam ediyor.
@main
struct ToraWattComplicationBundle: WidgetBundle {
    var body: some Widget {
        NearestStationComplication()
    }
}
