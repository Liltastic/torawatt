import SwiftUI

/// Bilekteki ana ekran: konuma en yakin TORA istasyonlari.
struct StationListView: View {
    @StateObject private var location = LocationProvider()

    @State private var stations: [Station] = []
    @State private var loading = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("TORA WATT")
                .navigationDestination(for: Int.self) { stationId in
                    StationDetailView(stationId: stationId)
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
            message(
                "Konum izni kapalı",
                detail: "En yakın istasyonları gösterebilmek için Watch uygulamasından konum iznini aç."
            )
        } else if loading && stations.isEmpty {
            ProgressView()
        } else if let errorText {
            VStack(spacing: 8) {
                Text(errorText)
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                Button("Tekrar dene") {
                    location.request()
                }
            }
            .padding(.horizontal, 4)
        } else if stations.isEmpty {
            message(
                "İstasyon bulunamadı",
                detail: "50 km içinde TORA istasyonu yok."
            )
        } else {
            List(stations) { station in
                NavigationLink(value: station.id) {
                    row(station)
                }
            }
        }
    }

    private func row(_ station: Station) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(station.displayName)
                .font(.headline)
                .lineLimit(2)

            HStack(spacing: 6) {
                if let distanceLabel = station.distanceLabel {
                    Text(distanceLabel)
                        .foregroundStyle(.tint)
                }
                Text("\(station.socketCount) soket")
                    .foregroundStyle(.secondary)
            }
            .font(.caption2)
        }
        .padding(.vertical, 2)
    }

    private func message(_ title: String, detail: String) -> some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.headline)
            Text(detail)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 4)
    }

    private func load(latitude: Double, longitude: Double) async {
        loading = true
        errorText = nil
        do {
            stations = try await EvcsClient.nearbyToraStations(
                latitude: latitude,
                longitude: longitude
            )
        } catch {
            errorText = error.localizedDescription
        }
        loading = false
    }
}
