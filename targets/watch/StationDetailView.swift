import MapKit
import SwiftUI

/// Tek istasyonun haritasi, soketleri ve adresi.
///
/// Soket listesi yalnizca detay ucunda geliyor; listedeki kayitta soket
/// SAYISI var ama tipleri yok. Telefonda da ayni sebeple detay cekiliyor
/// (bkz. src/services/evcs.ts withDetails) - sayidan tip uretmek tahmin olur.
///
/// Listeden gelen kayit `known` olarak tasiniyor: ag cevabi beklenirken ad,
/// mesafe ve harita zaten cizilebiliyor, ekran bos kalmiyor. Detay gelince
/// yalnizca soketler ekleniyor.
struct StationDetailView: View {
    let stationId: Int
    let known: Station?

    @State private var station: Station?
    @State private var errorText: String?
    @State private var loading = true

    private var shown: Station? { station ?? known }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if let shown {
                    MapCard(station: shown)
                    HeaderCard(station: shown)
                    DirectionsButton(station: shown)
                    socketSection
                    LocationSection(station: shown)
                    FootNote()
                } else if let errorText {
                    StatusView(
                        symbol: "antenna.radiowaves.left.and.right.slash",
                        title: "Bağlanılamadı",
                        detail: errorText,
                        tint: Brand.danger
                    )
                    .padding(.top, 20)
                } else {
                    ProgressView()
                        .tint(Brand.accent)
                        .padding(.top, 40)
                }
            }
            .padding(.horizontal, 2)
        }
        .navigationTitle(shown?.displayName ?? "İstasyon")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    @ViewBuilder
    private var socketSection: some View {
        if let sockets = station?.sockets, !sockets.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                SectionTitle("Soketler", trailing: "\(sockets.count)")
                ForEach(sockets.sorted { $0.powerKw > $1.powerKw }) { socket in
                    SocketRow(socket: socket)
                }
            }
        } else if loading {
            VStack(alignment: .leading, spacing: 6) {
                SectionTitle("Soketler", trailing: nil)
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Brand.surface)
                    .frame(height: 44)
                    .overlay(ProgressView().tint(Brand.accent))
            }
        }
    }

    private func load() async {
        do {
            station = try await EvcsClient.station(id: stationId)
        } catch {
            // Listeden gelen kayit varken hatayi ekrana basmiyoruz: ad,
            // mesafe ve harita zaten duruyor, yalnizca soketler eksik kaliyor.
            if known == nil {
                errorText = error.localizedDescription
            }
        }
        loading = false
    }
}

// MARK: - Harita

/// Istasyonun konumu. Bilekte harita, adres satirini okumaktan hizli
/// anlatiyor: hangi yonde, ne kadar uzakta.
private struct MapCard: View {
    let station: Station

    var body: some View {
        Map(initialPosition: .region(
            MKCoordinateRegion(
                center: station.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
            )
        )) {
            Marker(station.displayName, systemImage: "bolt.fill", coordinate: station.coordinate)
                .tint(Brand.accent)
        }
        .mapStyle(.standard(elevation: .flat))
        .frame(height: 86)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .allowsHitTesting(false)
    }
}

// MARK: - Baslik

private struct HeaderCard: View {
    let station: Station

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(station.displayName)
                .font(.system(size: 15, weight: .semibold))
                .lineLimit(3)

            HStack(spacing: 5) {
                if let distanceLabel = station.distanceLabel {
                    Pill(text: distanceLabel, tint: Brand.accentBright, filled: true)
                }
                Pill(text: station.powerLabel, tint: powerTint(station.maxPowerKw))
                Pill(text: "\(station.socketCount) soket")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardBackground()
    }
}

// MARK: - Yol tarifi

private struct DirectionsButton: View {
    let station: Station

    var body: some View {
        Button {
            station.openDirections()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                Text("Yol tarifi")
                    .font(.system(size: 14, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(Brand.accent)
    }
}

// MARK: - Soket satiri

private struct SocketRow: View {
    let socket: Socket

    var body: some View {
        HStack(spacing: 9) {
            // Guc sinifini anlatan renkli daire: AC mi hizli DC mi, okumadan.
            ZStack {
                Circle()
                    .fill(powerTint(socket.powerKw).opacity(0.18))
                    .frame(width: 28, height: 28)
                Image(systemName: socket.currentType.uppercased() == "DC" ? "bolt.fill" : "bolt")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(powerTint(socket.powerKw))
            }

            VStack(alignment: .leading, spacing: 1) {
                Text(socket.typeLabel)
                    .font(.system(size: 13, weight: .semibold))
                Text(socket.sktNo)
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }

            Spacer(minLength: 0)

            Text("\(Int(socket.powerKw.rounded())) kW")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(powerTint(socket.powerKw))
        }
        .padding(.vertical, 7)
        .padding(.horizontal, 9)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Brand.surface))
    }
}

// MARK: - Konum bilgileri

private struct LocationSection: View {
    let station: Station

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionTitle("Konum", trailing: nil)
            VStack(alignment: .leading, spacing: 7) {
                row("Adres", station.address)
                if let province = station.province, !province.isEmpty {
                    row("İl", province)
                }
                row("İşletmeci", station.operatorName)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardBackground()
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(.tertiary)
            Text(value)
                .font(.system(size: 12))
        }
    }
}

// MARK: - Ortak parcalar

private struct SectionTitle: View {
    let text: String
    let trailing: String?

    init(_ text: String, trailing: String?) {
        self.text = text
        self.trailing = trailing
    }

    var body: some View {
        HStack {
            Text(text.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(0.5)
                .foregroundStyle(.secondary)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 4)
    }
}

/// Verinin nereden geldigini ve neyi ICERMEDIGINI soyluyor: katalogda anlik
/// doluluk ve fiyat yok, kullanici bosa beklememeli.
private struct FootNote: View {
    var body: some View {
        Text("Soket bilgisi ulusal katalogdan (EPDK) geliyor; anlık doluluk ve fiyat bu kayıtta yok.")
            .font(.system(size: 10))
            .foregroundStyle(.tertiary)
            .multilineTextAlignment(.leading)
            .padding(.horizontal, 4)
            .padding(.top, 2)
            .padding(.bottom, 8)
    }
}
