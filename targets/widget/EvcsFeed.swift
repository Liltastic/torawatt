import Foundation

/// Widget'in katalog istemcisi.
///
/// targets/watch/EvcsClient.swift'in kirpilmis kopyasi: widget yalnizca liste
/// ucunu kullaniyor, detay ucuna hic gitmiyor. Kopya olmasinin sebebi Xcode
/// hedeflerinin ayri derleme birimleri olmasi ve eklentinin yalnizca hedefin
/// kendi klasorundeki dosyalari baglamasi - paylasmak icin ayri bir framework
/// hedefi kurmak gerekirdi, iki kucuk dosya icin orantisiz.
///
/// Alan adlari icin bkz. src/services/evcs.ts (CatalogStation).
struct NearbyStation: Decodable, Identifiable {
    let id: Int
    let name: String
    let operatorName: String
    let brand: String?
    let socketCount: Int
    let distanceKm: Double?

    enum CodingKeys: String, CodingKey {
        case id, name, brand, socketCount, distanceKm
        case operatorName = "operator"
    }

    /// Katalogda ad bazen sicil kodu ("000056") oluyor; o zaman marka adi
    /// daha anlamli (telefonda ve saatte de ayni kural isliyor).
    var displayName: String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let isOnlyDigits = !trimmed.isEmpty && trimmed.allSatisfy { $0.isNumber }
        if !trimmed.isEmpty && !isOnlyDigits { return trimmed }

        let brandName = brand?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !brandName.isEmpty { return brandName }

        let operatorLabel = operatorName.trimmingCharacters(in: .whitespacesAndNewlines)
        return operatorLabel.isEmpty ? "İsimsiz istasyon" : operatorLabel
    }

    var distanceLabel: String {
        guard let distanceKm else { return "—" }
        if distanceKm < 10 {
            return String(format: "%.1f km", distanceKm)
        }
        return "\(Int(distanceKm.rounded())) km"
    }
}

enum EvcsFeed {
    /// Telefondaki EXPO_PUBLIC_EVCS_API_URL ile ayni adres. Widget Metro'dan
    /// gecmedigi icin ortam degiskeni okuyamiyor; adres degisirse burasi ve
    /// targets/watch/EvcsClient.swift birlikte guncellenmeli.
    private static let baseURL = "https://testmobileapi2.torasarj.net"

    private static let radiusKm = 50
    /// Widget en fazla uc istasyon gosteriyor; sayfayi kucuk tutmak
    /// yenileme butcesi icinde isi hizlandiriyor.
    private static let pageSize = 50

    private static let deviceId: String = {
        let key = "tora-watt-widget-device-id"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let created = UUID().uuidString
        UserDefaults.standard.set(created, forKey: key)
        return created
    }()

    private struct Envelope<T: Decodable>: Decodable {
        let success: Bool
        let data: T?
        let message: String?
    }

    private struct Page<T: Decodable>: Decodable {
        let items: [T]
    }

    enum FeedError: LocalizedError {
        case badStatus(Int)
        case rejected(String)

        var errorDescription: String? {
            switch self {
            case .badStatus(let code): return "Servis \(code) döndü"
            case .rejected(let message): return message
            }
        }
    }

    /// Katalogda isletmeci filtresi yok; TORA kayitlarini istemcide ayikliyoruz.
    /// Kelime sinirini sozcuklere bolerek sagliyoruz ki icinde "tora" gecen
    /// baska adlar yanlislikla eslesmesin (telefonda karsiligi /\btora\b/i).
    private static func mentionsTora(_ value: String?) -> Bool {
        guard let value else { return false }
        return value
            .lowercased()
            .split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .contains { $0 == "tora" }
    }

    static func nearbyToraStations(latitude: Double, longitude: Double) async throws -> [NearbyStation] {
        guard var components = URLComponents(string: baseURL) else {
            throw FeedError.rejected("İstek adresi kurulamadı")
        }
        components.path = "/api/v1/stations/external"
        components.queryItems = [
            URLQueryItem(name: "lat", value: String(latitude)),
            URLQueryItem(name: "lng", value: String(longitude)),
            URLQueryItem(name: "radius", value: String(radiusKm)),
            URLQueryItem(name: "page", value: "1"),
            URLQueryItem(name: "size", value: String(pageSize)),
        ]
        guard let url = components.url else {
            throw FeedError.rejected("İstek adresi kurulamadı")
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        request.setValue("TORA WATT", forHTTPHeaderField: "X-App-Name")
        request.setValue("1.0.0", forHTTPHeaderField: "X-App-Version")
        // Bilerek "iOS": uc bilinmeyen platform degerinde 400 donebiliyor.
        request.setValue("iOS", forHTTPHeaderField: "X-App-Platform")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue("tr", forHTTPHeaderField: "X-App-Locale")

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw FeedError.badStatus(http.statusCode)
        }

        let envelope = try JSONDecoder().decode(Envelope<Page<NearbyStation>>.self, from: data)
        guard envelope.success, let page = envelope.data else {
            throw FeedError.rejected(envelope.message ?? "Servis isteği reddetti")
        }

        return page.items.filter { mentionsTora($0.brand) || mentionsTora($0.operatorName) }
    }
}
