import Foundation

// MARK: - Model
//
// Alan adlari EVCS katalog ucunun donusuyle birebir ayni; telefon tarafindaki
// karsiliklari icin bkz. src/services/evcs.ts (CatalogStation, CatalogSocket).

struct Socket: Decodable, Identifiable {
    let sktNo: String
    let currentType: String
    let socketType: String
    let powerKw: Double

    var id: String { sktNo }

    /// Katalogun kodu ("AC_TYPE2") yerine kullanicinin bildigi ad.
    /// Bilinmeyen bir kod gelirse akim tipine gore makul bir karsilik
    /// secmek yerine kodu oldugu gibi gosteriyoruz - uydurma veri olmasin.
    var typeLabel: String {
        switch socketType {
        case "AC_TYPE2": return "Type 2"
        case "DC_CCS": return "CCS2"
        case "DC_CHADEMO": return "CHAdeMO"
        default: return socketType
        }
    }

    var powerLabel: String {
        "\(currentType) · \(Int(powerKw.rounded())) kW"
    }
}

struct Station: Decodable, Identifiable {
    let id: Int
    let name: String
    let operatorName: String
    let brand: String?
    let address: String
    let province: String?
    let socketCount: Int
    let maxPowerKw: Double
    let distanceKm: Double?
    let sockets: [Socket]?

    enum CodingKeys: String, CodingKey {
        case id, name, brand, address, province, socketCount, maxPowerKw, distanceKm, sockets
        case operatorName = "operator"
    }

    /// Katalogda ad bazen tesis adi yerine sicil kodu ("000056") oluyor;
    /// o zaman marka adi daha anlamli (telefonda da ayni kural isliyor).
    var displayName: String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let isOnlyDigits = !trimmed.isEmpty && trimmed.allSatisfy { $0.isNumber }
        if !trimmed.isEmpty && !isOnlyDigits { return trimmed }

        let brandName = brand?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !brandName.isEmpty { return brandName }

        let operatorLabel = operatorName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !operatorLabel.isEmpty { return operatorLabel }

        return trimmed.isEmpty ? "İsimsiz istasyon" : trimmed
    }

    var distanceLabel: String? {
        guard let distanceKm else { return nil }
        if distanceKm < 10 {
            return String(format: "%.1f km", distanceKm)
        }
        return "\(Int(distanceKm.rounded())) km"
    }
}

// MARK: - Hatalar

enum EvcsError: LocalizedError {
    case badStatus(Int)
    case rejected(String)

    var errorDescription: String? {
        switch self {
        case .badStatus(let code):
            return "İstasyon servisi \(code) döndü"
        case .rejected(let message):
            return message
        }
    }
}

// MARK: - Istemci

enum EvcsClient {
    /// Telefondaki EXPO_PUBLIC_EVCS_API_URL ile ayni adres. Saat uygulamasi
    /// Metro'dan gecmedigi icin ortam degiskeni okuyamiyor; adres degisirse
    /// burasi da elle guncellenmeli.
    private static let baseURL = "https://testmobileapi2.torasarj.net"

    private static let radiusKm = 50
    private static let pageSize = 200
    private static let timeout: TimeInterval = 20

    /// Cihaz basina sabit kimlik; uc bu basligi zorunlu tutuyor.
    private static let deviceId: String = {
        let key = "tora-watt-watch-device-id"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let created = UUID().uuidString
        UserDefaults.standard.set(created, forKey: key)
        return created
    }()

    // MARK: Istek

    private struct Envelope<T: Decodable>: Decodable {
        let success: Bool
        let data: T?
        let message: String?
    }

    private struct Page<T: Decodable>: Decodable {
        let items: [T]
        let hasNext: Bool
    }

    private static func makeRequest(path: String, query: [URLQueryItem]) -> URLRequest? {
        guard var components = URLComponents(string: baseURL) else { return nil }
        components.path = path
        components.queryItems = query.isEmpty ? nil : query
        guard let url = components.url else { return nil }

        var request = URLRequest(url: url)
        request.timeoutInterval = timeout
        request.setValue("TORA WATT", forHTTPHeaderField: "X-App-Name")
        request.setValue("1.0.0", forHTTPHeaderField: "X-App-Version")
        // Bilerek "iOS": uc bilinmeyen bir platform degerinde 400 donebiliyor
        // ve bu baslik yalnizca istatistik icin kullaniliyor.
        request.setValue("iOS", forHTTPHeaderField: "X-App-Platform")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue("tr", forHTTPHeaderField: "X-App-Locale")
        return request
    }

    private static func send<T: Decodable>(path: String, query: [URLQueryItem]) async throws -> T {
        guard let request = makeRequest(path: path, query: query) else {
            throw EvcsError.rejected("İstek adresi kurulamadı")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw EvcsError.badStatus(http.statusCode)
        }

        let envelope = try JSONDecoder().decode(Envelope<T>.self, from: data)
        guard envelope.success, let payload = envelope.data else {
            throw EvcsError.rejected(envelope.message ?? "İstasyon servisi isteği reddetti")
        }
        return payload
    }

    // MARK: Suzgec

    /// Katalogda isletmeci filtresi yok; TORA'ya ait kayitlari istemcide
    /// ayikliyoruz. Telefonda ayni kural /\btora\b/i ile isliyor - burada
    /// kelime sinirini sozcuklere bolerek sagliyoruz ki "motor" gibi
    /// icinde gecen adlar yanlislikla eslesmesin.
    private static func mentionsTora(_ value: String?) -> Bool {
        guard let value else { return false }
        return value
            .lowercased()
            .split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .contains { $0 == "tora" }
    }

    // MARK: Uclar

    /// Konumun cevresindeki TORA istasyonlari, mesafeye gore sirali gelir.
    static func nearbyToraStations(latitude: Double, longitude: Double) async throws -> [Station] {
        let query = [
            URLQueryItem(name: "lat", value: String(latitude)),
            URLQueryItem(name: "lng", value: String(longitude)),
            URLQueryItem(name: "radius", value: String(radiusKm)),
            URLQueryItem(name: "page", value: "1"),
            URLQueryItem(name: "size", value: String(pageSize)),
        ]

        let page: Page<Station> = try await send(path: "/api/v1/stations/external", query: query)
        return page.items.filter { mentionsTora($0.brand) || mentionsTora($0.operatorName) }
    }

    /// Tek istasyonun detayi: gercek soket listesiyle birlikte.
    static func station(id: Int) async throws -> Station {
        try await send(path: "/api/v1/stations/external/\(id)", query: [])
    }
}
