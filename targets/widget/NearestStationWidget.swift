import CoreLocation
import SwiftUI
import WidgetKit

// MARK: - Zaman cizelgesi

struct StationEntry: TimelineEntry {
    let date: Date
    let stations: [NearbyStation]
    /// Istasyon yoksa kullaniciya ne oldugunu soyleyen kisa metin.
    let note: String?

    var nearest: NearbyStation? { stations.first }
}

struct NearestStationProvider: TimelineProvider {
    /// Widget galerisinde ve yuklenirken gorunen ornek.
    func placeholder(in context: Context) -> StationEntry {
        StationEntry(date: Date(), stations: [], note: "Yükleniyor")
    }

    func getSnapshot(in context: Context, completion: @escaping (StationEntry) -> Void) {
        Task { completion(await loadEntry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StationEntry>) -> Void) {
        Task {
            let entry = await loadEntry()
            // WidgetKit'in yenileme butcesi var; yarim saat, "yakinimdaki
            // istasyon" icin yeterince taze ve butceyi zorlamiyor.
            let next = Date().addingTimeInterval(30 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func loadEntry() async -> StationEntry {
        // Widget uzun sureli konum guncellemesi calistiramaz; son bilinen
        // konumu okuyoruz. Info.plist'teki NSWidgetWantsLocation olmadan bu
        // her zaman nil doner.
        guard let coordinate = CLLocationManager().location?.coordinate else {
            return StationEntry(date: Date(), stations: [], note: "Konum yok")
        }

        do {
            let stations = try await EvcsFeed.nearbyToraStations(
                latitude: coordinate.latitude,
                longitude: coordinate.longitude
            )
            if stations.isEmpty {
                return StationEntry(date: Date(), stations: [], note: "Yakında istasyon yok")
            }
            return StationEntry(date: Date(), stations: Array(stations.prefix(3)), note: nil)
        } catch {
            return StationEntry(date: Date(), stations: [], note: "Bağlanılamadı")
        }
    }
}

// MARK: - Gorunumler

struct NearestStationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: StationEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            circular
        case .accessoryRectangular:
            rectangular
        case .accessoryInline:
            inline
        case .systemMedium:
            medium
        default:
            small
        }
    }

    // Kilit ekrani: yalnizca mesafe sigiyor.
    private var circular: some View {
        VStack(spacing: 0) {
            Image(systemName: "bolt.fill")
                .font(.caption2)
            Text(entry.nearest?.distanceLabel ?? "—")
                .font(.caption2)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("EN YAKIN İSTASYON")
                .font(.caption2)
                .widgetAccentable()
            if let nearest = entry.nearest {
                Text(nearest.displayName)
                    .font(.headline)
                    .lineLimit(1)
                Text("\(nearest.distanceLabel) · \(nearest.socketCount) soket")
                    .font(.caption2)
            } else {
                Text(entry.note ?? "—")
                    .font(.caption2)
            }
        }
    }

    // if/else dogrudan donduruldugu icin builder sart; digerleri tek bir
    // kapsayici dondurdugunden gerekmiyor.
    @ViewBuilder
    private var inline: some View {
        if let nearest = entry.nearest {
            Text("\(nearest.distanceLabel) · \(nearest.displayName)")
        } else {
            Text(entry.note ?? "TORA WATT")
        }
    }

    // Ana ekran, kucuk: tek istasyon, buyuk tipografi.
    private var small: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: "bolt.car.fill")
                .foregroundStyle(.tint)
            Spacer(minLength: 0)
            if let nearest = entry.nearest {
                Text(nearest.distanceLabel)
                    .font(.title2.bold())
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                Text(nearest.displayName)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            } else {
                Text(entry.note ?? "—")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Ana ekran, orta: en yakin uc istasyon.
    private var medium: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "bolt.car.fill")
                    .foregroundStyle(.tint)
                Text("En yakın istasyonlar")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }

            if entry.stations.isEmpty {
                Text(entry.note ?? "—")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(entry.stations) { station in
                    HStack(spacing: 6) {
                        Text(station.displayName)
                            .font(.caption)
                            .lineLimit(1)
                        Spacer(minLength: 4)
                        Text(station.distanceLabel)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.tint)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Widget tanimi

struct NearestStationWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ToraWattNearestStation", provider: NearestStationProvider()) { entry in
            NearestStationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("En yakın istasyon")
        .description("Sana en yakın TORA şarj istasyonunu ve uzaklığını gösterir.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}
