import SwiftUI

/// Saat uygulamasinin gorsel dili.
///
/// Degerler telefonun koyu temasiyla ayni (bkz. src/theme/colors.ts): ayni
/// turkuaz, ayni durum renkleri. Bilekteki ekran kucuk ve cogu zaman kisa
/// sureligine bakiliyor, bu yuzden telefondaki ince ayrimlar yerine daha
/// kalin kontrast ve daha az renk kullaniliyor.
enum Brand {
    static let accent = Color(red: 0.08, green: 0.71, blue: 0.64) // #14B5A3
    static let accentBright = Color(red: 0.18, green: 0.82, blue: 0.74) // #2FD0BC
    static let surface = Color.white.opacity(0.10)
    static let surfaceStrong = Color.white.opacity(0.16)
    static let hairline = Color.white.opacity(0.14)

    static let success = Color(red: 0.29, green: 0.86, blue: 0.50)
    static let warning = Color(red: 0.98, green: 0.75, blue: 0.48)
    static let danger = Color(red: 0.97, green: 0.50, blue: 0.56)

    /// Kartlarin ve vurgulu alanlarin zemini.
    static let cardGradient = LinearGradient(
        colors: [Color.white.opacity(0.14), Color.white.opacity(0.05)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// En yakin istasyon kartinin zemini: markaya ait tek dolu alan.
    static let heroGradient = LinearGradient(
        colors: [
            Color(red: 0.07, green: 0.48, blue: 0.44),
            Color(red: 0.05, green: 0.24, blue: 0.23),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

/// Guc degerine gore renk.
///
/// Sarj hizini renkle anlatmak, kW sayisini okumaktan hizli: yesil hizli DC,
/// turuncu orta, gri yavas AC. Esikler telefondaki soket rozetleriyle ayni
/// mantikta (bkz. src/components/Badges.tsx).
func powerTint(_ kw: Double) -> Color {
    if kw >= 150 { return Brand.accentBright }
    if kw >= 50 { return Brand.success }
    if kw >= 22 { return Brand.warning }
    return .secondary
}

// MARK: - Yeniden kullanilan parcalar

/// Kucuk, yuvarlak etiket: mesafe, guc, soket sayisi.
struct Pill: View {
    let text: String
    var tint: Color = .secondary
    var filled = false

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(filled ? Color.black.opacity(0.85) : tint)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(
                Capsule().fill(filled ? AnyShapeStyle(tint) : AnyShapeStyle(Brand.surface))
            )
    }
}

/// Liste satirlarinin ve bolumlerin ortak zemini.
struct CardBackground: ViewModifier {
    var tint: Color?

    func body(content: Content) -> some View {
        content
            .padding(10)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(tint.map { AnyShapeStyle($0.opacity(0.18)) } ?? AnyShapeStyle(Brand.cardGradient))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Brand.hairline, lineWidth: 0.5)
            )
    }
}

extension View {
    func cardBackground(tint: Color? = nil) -> some View {
        modifier(CardBackground(tint: tint))
    }
}

/// Bos ve hata durumlari icin ortak gorunum.
///
/// Uc durum da ayni kalipta: simge, bir cumle baslik, bir cumle aciklama ve
/// varsa tek bir eylem. Bilekte daha fazlasi okunmuyor.
struct StatusView: View {
    let symbol: String
    let title: String
    let detail: String
    var tint: Color = .secondary
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 26))
                .foregroundStyle(tint)

            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .multilineTextAlignment(.center)

            Text(detail)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(.borderedProminent)
                    .tint(Brand.accent)
                    .font(.system(size: 13, weight: .semibold))
                    .padding(.top, 2)
            }
        }
        .padding(.horizontal, 6)
    }
}
