import CoreLocation
import SwiftUI
import WidgetKit

// MARK: - Zaman cizelgesi

struct ComplicationEntry: TimelineEntry {
    let date: Date
    let station: WatchStation?
    /// Istasyon yoksa kadranda ne yazacagi.
    let note: String

    /// Kadranda sayi: kilometre, en fazla bir ondalik.
    var distanceText: String {
        guard let km = station?.distanceKm else { return "—" }
        return km < 10 ? String(format: "%.1f", km) : "\(Int(km.rounded()))"
    }
}

struct NearestStationProvider: TimelineProvider {
    /// Kadran galerisinde gorunen ornek. Gercekci bir deger duruyor ki
    /// kullanici complication'i secerken yerini dogru degerlendirebilsin.
    func placeholder(in context: Context) -> ComplicationEntry {
        ComplicationEntry(date: Date(), station: nil, note: "Yükleniyor")
    }

    func getSnapshot(in context: Context, completion: @escaping (ComplicationEntry) -> Void) {
        Task { completion(await loadEntry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ComplicationEntry>) -> Void) {
        Task {
            let entry = await loadEntry()
            // WidgetKit'in yenileme butcesi var. Yarim saat, "en yakin
            // istasyon" icin yeterince taze ve butceyi zorlamiyor; uygulama
            // her acilista zaten elle tazeliyor (bkz. StationListView).
            let next = Date().addingTimeInterval(30 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func loadEntry() async -> ComplicationEntry {
        // Uzanti surekli konum guncellemesi calistiramaz; son bilinen konumu
        // okuyoruz. Info.plist'teki NSWidgetWantsLocation olmadan bu her
        // zaman nil doner.
        guard let coordinate = CLLocationManager().location?.coordinate else {
            return ComplicationEntry(date: Date(), station: nil, note: "Konum yok")
        }

        do {
            let stations = try await WatchFeed.nearbyToraStations(
                latitude: coordinate.latitude,
                longitude: coordinate.longitude
            )
            guard let nearest = stations.first else {
                return ComplicationEntry(date: Date(), station: nil, note: "Yakında yok")
            }
            return ComplicationEntry(date: Date(), station: nearest, note: "")
        } catch {
            return ComplicationEntry(date: Date(), station: nil, note: "Bağlanılamadı")
        }
    }
}

// MARK: - Gorunumler

struct ComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ComplicationEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            circular
        case .accessoryRectangular:
            rectangular
        case .accessoryCorner:
            corner
        default:
            inline
        }
    }

    /// Yuvarlak: kadranda en dar yer. Yalnizca mesafe ve bir yuzuk.
    ///
    /// Yuzuk 20 km'lik bir olcege gore doluyor - sayiya bakmadan "cok yakin /
    /// uzak" ayrimi yapilabiliyor.
    private var circular: some View {
        Gauge(value: gaugeValue, in: 0...1) {
            Image(systemName: "bolt.fill")
        } currentValueLabel: {
            Text(entry.distanceText)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.6)
        }
        .gaugeStyle(.accessoryCircular)
        .widgetLabel("km")
    }

    /// Dikdortgen: tek satirda en cok bilgiyi tasiyan aile.
    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 3) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 10))
                Text("EN YAKIN")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(0.4)
            }
            .widgetAccentable()

            if let station = entry.station {
                Text(station.displayName)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                Text("\(station.distanceLabel) · \(station.socketCount) soket")
                    .font(.system(size: 11))
            } else {
                Text(entry.note)
                    .font(.system(size: 12))
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// Kose: sayi iceride, etiket kadranin kenarinda.
    private var corner: some View {
        Text(entry.distanceText)
            .font(.system(size: 17, weight: .bold, design: .rounded))
            .widgetLabel {
                Text(entry.station?.displayName ?? entry.note)
            }
    }

    /// Satir ici: kadranin ustundeki tek satir.
    @ViewBuilder
    private var inline: some View {
        if let station = entry.station {
            Label("\(station.distanceLabel) · \(station.displayName)", systemImage: "bolt.fill")
        } else {
            Label(entry.note, systemImage: "bolt.slash")
        }
    }

    /// Yuzugun dolulugu: 0 km dolu, 20 km ve otesi bos.
    private var gaugeValue: Double {
        guard let km = entry.station?.distanceKm else { return 0 }
        return max(0, min(1, 1 - km / 20))
    }
}

// MARK: - Complication

struct NearestStationComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ToraWattNearestStation", provider: NearestStationProvider()) { entry in
            ComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("En yakın istasyon")
        .description("Bulunduğun yere en yakın TORA şarj istasyonunu kadranda gösterir.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryCorner,
            .accessoryInline,
        ])
    }
}
