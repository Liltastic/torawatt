import SwiftUI
import WatchKit
import WidgetKit

/// Bilekteki ana ekran: konuma en yakin TORA istasyonlari.
///
/// Duzen bilerek iki katmanli: en ustte EN YAKIN istasyon dolu bir kartta,
/// altinda digerleri ince satirlarda. Bilekteki bakis bir saniye suruyor ve o
/// bir saniyede sorulan soru hep ayni - "en yakini nerede, kac kilometre?".
/// Geri kalani kaydirmak isteyen icin duruyor.
struct StationListView: View {
    @StateObject private var location = LocationProvider()

    @State private var stations: [Station] = []
    @State private var loading = false
    @State private var errorText: String?
    @State private var lastUpdate: Date?

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("TORA WATT")
                .navigationBarTitleDisplayMode(.inline)
                .navigationDestination(for: Int.self) { stationId in
                    StationDetailView(stationId: stationId, known: stations.first { $0.id == stationId })
                }
        }
        // Konum degisince (ilk gelis dahil) yeniden yukleniyor. Ilk calismada
        // koordinat henuz yok; o tur yalnizca izin istemeye yariyor.
        .task(id: location.coordinate?.latitude) {
            guard let coordinate = location.coordinate else {
                location.request()
                return
            }
            await load(latitude: coordinate.latitude, longitude: coordinate.longitude)
        }
    }

    @ViewBuilder
    private var content: some View {
        if location.denied {
            StatusView(
                symbol: "location.slash",
                title: "Konum izni kapalı",
                detail: "En yakın istasyonları gösterebilmek için Watch uygulamasından konum iznini aç.",
                tint: Brand.warning
            )
        } else if loading && stations.isEmpty {
            LoadingList()
        } else if let errorText {
            StatusView(
                symbol: "antenna.radiowaves.left.and.right.slash",
                title: "Bağlanılamadı",
                detail: errorText,
                tint: Brand.danger,
                actionTitle: "Tekrar dene",
                action: { location.request() }
            )
        } else if stations.isEmpty {
            StatusView(
                symbol: "bolt.slash",
                title: "İstasyon bulunamadı",
                detail: "50 km içinde TORA istasyonu yok.",
                tint: .secondary
            )
        } else {
            list
        }
    }

    private var list: some View {
        List {
            if let nearest = stations.first {
                Section {
                    NavigationLink(value: nearest.id) {
                        HeroCard(station: nearest)
                    }
                    .buttonStyle(.plain)
                    .listRowInsets(EdgeInsets(top: 2, leading: 0, bottom: 6, trailing: 0))
                    .listRowBackground(Color.clear)
                }
            }

            if stations.count > 1 {
                Section {
                    ForEach(stations.dropFirst()) { station in
                        NavigationLink(value: station.id) {
                            StationRow(station: station)
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 2, leading: 0, bottom: 2, trailing: 0))
                    }
                } header: {
                    Text("Yakındaki diğerleri")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }

            if let lastUpdate {
                Text("Güncellendi \(lastUpdate, style: .time)")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .listRowBackground(Color.clear)
            }
        }
        .listStyle(.carousel)
        // Tacla asagi cekip yenileme: saatte alisilmis hareket.
        .refreshable {
            guard let coordinate = location.coordinate else { return }
            await load(latitude: coordinate.latitude, longitude: coordinate.longitude)
        }
    }

    private func load(latitude: Double, longitude: Double) async {
        loading = true
        errorText = nil
        do {
            stations = try await EvcsClient.nearbyToraStations(
                latitude: latitude,
                longitude: longitude
            )
            lastUpdate = Date()
            // Saat kadrani ayni veriyi gosteriyor; liste tazelenince o da
            // tazelensin (bkz. targets/watch-complication).
            WidgetCenter.shared.reloadAllTimelines()
            WKInterfaceDevice.current().play(.success)
        } catch {
            errorText = error.localizedDescription
            WKInterfaceDevice.current().play(.failure)
        }
        loading = false
    }
}

// MARK: - En yakin istasyon

/// Listenin basindaki dolu kart.
private struct HeroCard: View {
    let station: Station

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "location.fill")
                    .font(.system(size: 9))
                Text("EN YAKIN")
                    .font(.system(size: 9, weight: .bold))
                    .tracking(0.6)
            }
            .foregroundStyle(.white.opacity(0.65))

            Text(station.displayName)
                .font(.system(size: 16, weight: .semibold))
                .lineLimit(2)
                .foregroundStyle(.white)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                if let distanceKm = station.distanceKm {
                    Text(distanceText(distanceKm))
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundStyle(Brand.accentBright)
                    Text("km")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.6))
                }
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 1) {
                    Text(station.powerLabel)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(powerTint(station.maxPowerKw))
                    Text("\(station.socketCount) soket")
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.6))
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Brand.heroGradient)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Brand.accent.opacity(0.35), lineWidth: 0.5)
        )
    }

    /// Kart buyuk sayiyi birimsiz gosteriyor; birim yaninda ayri duruyor.
    private func distanceText(_ km: Double) -> String {
        km < 10 ? String(format: "%.1f", km) : "\(Int(km.rounded()))"
    }
}

// MARK: - Diger istasyonlar

private struct StationRow: View {
    let station: Station

    var body: some View {
        HStack(spacing: 10) {
            // Soldaki dikey cizgi guc sinifini renkle anlatiyor; sayiya
            // bakmadan hizli/yavas ayrimi yapilabiliyor.
            Capsule()
                .fill(powerTint(station.maxPowerKw))
                .frame(width: 3)

            VStack(alignment: .leading, spacing: 3) {
                Text(station.displayName)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(2)

                HStack(spacing: 5) {
                    if let distanceLabel = station.distanceLabel {
                        Text(distanceLabel)
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundStyle(Brand.accentBright)
                    }
                    Text(station.powerLabel)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Text("· \(station.socketCount) soket")
                        .font(.system(size: 11))
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Brand.surface)
        )
    }
}

// MARK: - Yukleniyor

/// Iskelet satirlar: bos ekran yerine gelecek duzenin olcusunu gosteriyor,
/// boylece veri gelince sayfa zıplamiyor.
private struct LoadingList: View {
    var body: some View {
        VStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Brand.surface)
                .frame(height: 96)
            ForEach(0..<2, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Brand.surface)
                    .frame(height: 52)
            }
        }
        .padding(.horizontal, 2)
        .redacted(reason: .placeholder)
        .overlay(ProgressView().tint(Brand.accent))
    }
}
