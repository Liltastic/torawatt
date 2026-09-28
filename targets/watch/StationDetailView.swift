import SwiftUI

/// Tek istasyonun soketleri ve adresi.
///
/// Soket listesi yalnizca detay ucunda geliyor; listedeki kayitta soket
/// SAYISI var ama tipleri yok. Telefonda da ayni sebeple detay cekiliyor
/// (bkz. src/services/evcs.ts withDetails) - sayidan tip uretmek tahmin olur.
struct StationDetailView: View {
    let stationId: Int

    @State private var station: Station?
    @State private var errorText: String?

    var body: some View {
        List {
            if let station {
                if let sockets = station.sockets, !sockets.isEmpty {
                    Section("Soketler") {
                        ForEach(sockets) { socket in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(socket.typeLabel)
                                    .font(.headline)
                                Text(socket.powerLabel)
                                    .font(.caption2)
                                    .foregroundStyle(.tint)
                                Text(socket.sktNo)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }

                Section("Konum") {
                    detailRow("Adres", station.address)
                    if let province = station.province, !province.isEmpty {
                        detailRow("İl", province)
                    }
                    detailRow("İşletmeci", station.operatorName)
                    if let distanceLabel = station.distanceLabel {
                        detailRow("Uzaklık", distanceLabel)
                    }
                }

                Section {
                    Text("Soket bilgisi ulusal katalogdan (EPDK) geliyor; anlık doluluk ve fiyat bu kayıtta yok.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else if let errorText {
                Text(errorText)
                    .font(.footnote)
            } else {
                ProgressView()
            }
        }
        .navigationTitle(station?.displayName ?? "İstasyon")
        .task { await load() }
    }

    private func detailRow(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.footnote)
        }
        .padding(.vertical, 2)
    }

    private func load() async {
        do {
            station = try await EvcsClient.station(id: stationId)
        } catch {
            errorText = error.localizedDescription
        }
    }
}
