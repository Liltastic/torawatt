package net.torasarj.torawatt

import android.Manifest
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlin.concurrent.thread

/**
 * Ana ekran widget'i: en yakin TORA istasyonu.
 *
 * iOS tarafindaki widget ve saat uygulamasiyla ayni tasarim karari - veriyi
 * uygulamanin JS tarafindan paylasilan bir depo uzerinden almiyor, dogrudan
 * EVCS katalogundan cekiyor. Boylece JS'e native modul girmiyor ve Expo Go
 * calismaya devam ediyor (bkz. plugins/withToraWidget.js).
 *
 * Bilerek ek bagimlilik yok: HTTP icin HttpURLConnection, JSON icin org.json,
 * konum icin LocationManager. Hepsi Android'in kendi kutuphanesinde; Gradle'a
 * bir sey eklemek gerekmiyor, dolayisiyla config eklentisi de yalnizca dosya
 * kopyalayip manifest'e receiver ekliyor.
 */
class ToraWidgetProvider : AppWidgetProvider() {

    private data class WidgetState(val distance: String, val name: String)

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Ag istegi ana is parcaciginda yapilamaz; goAsync bize yayin
        // tamamlanmadan once birkac saniye veriyor (sistem siniri ~10 sn,
        // tek bir istek icin fazlasiyla yeterli).
        val pendingResult = goAsync()
        thread {
            val state = try {
                loadNearest(context)
            } catch (error: Exception) {
                WidgetState("—", "Bağlanılamadı")
            }
            try {
                for (id in appWidgetIds) {
                    render(context, appWidgetManager, id, state)
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun render(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        state: WidgetState
    ) {
        val views = RemoteViews(context.packageName, R.layout.tora_widget)
        views.setTextViewText(R.id.tora_widget_distance, state.distance)
        views.setTextViewText(R.id.tora_widget_name, state.name)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.tora_widget_root, pendingIntent)
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    // MARK: veri

    private fun loadNearest(context: Context): WidgetState {
        val location = lastKnownLocation(context) ?: return WidgetState("—", "Konum yok")
        return fetchNearestTora(context, location.latitude, location.longitude)
            ?: WidgetState("—", "Yakında istasyon yok")
    }

    /**
     * Widget surekli konum takibi yapamaz; son bilinen konumu okuyoruz.
     * Izin ANA uygulamada aliniyor (expo-location); verilmemisse null doner
     * ve widget "Konum yok" gosterir.
     */
    private fun lastKnownLocation(context: Context): Location? {
        val granted = context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) return null

        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return null

        val providers = listOf(
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER
        )
        for (provider in providers) {
            try {
                val location = manager.getLastKnownLocation(provider)
                if (location != null) return location
            } catch (error: SecurityException) {
                // Saglayici kapaliysa ya da izin cekildiyse digerini dene.
            } catch (error: IllegalArgumentException) {
                // Cihazda o saglayici yok.
            }
        }
        return null
    }

    private fun fetchNearestTora(context: Context, latitude: Double, longitude: Double): WidgetState? {
        val url = URL(
            "$BASE_URL/api/v1/stations/external" +
                "?lat=$latitude&lng=$longitude&radius=$RADIUS_KM&page=1&size=$PAGE_SIZE"
        )
        val connection = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = TIMEOUT_MS
            readTimeout = TIMEOUT_MS
            setRequestProperty("X-App-Name", "TORA WATT")
            setRequestProperty("X-App-Version", "1.0.0")
            setRequestProperty("X-App-Platform", "Android")
            setRequestProperty("X-Device-Id", deviceId(context))
            setRequestProperty("X-App-Locale", "tr")
        }

        try {
            if (connection.responseCode !in 200..299) return null

            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val envelope = JSONObject(body)
            if (!envelope.optBoolean("success")) return null

            val items = envelope.optJSONObject("data")?.optJSONArray("items") ?: return null
            // Liste mesafeye gore sirali geliyor; ilk TORA kaydi en yakini.
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index) ?: continue
                if (!isTora(item)) continue
                return WidgetState(distanceLabel(item), displayName(item))
            }
            return null
        } finally {
            connection.disconnect()
        }
    }

    /**
     * Katalogda isletmeci filtresi yok; TORA kayitlarini istemcide ayikliyoruz.
     * Kelime sinirini sozcuklere bolerek sagliyoruz ki icinde "tora" gecen
     * baska adlar yanlislikla eslesmesin (telefonda karsiligi /\btora\b/i).
     */
    private fun isTora(item: JSONObject): Boolean =
        mentionsTora(item.optString("brand")) || mentionsTora(item.optString("operator"))

    private fun mentionsTora(value: String?): Boolean {
        if (value.isNullOrBlank()) return false
        return value.lowercase()
            .split(Regex("[^\\p{L}\\p{N}]+"))
            .any { it == "tora" }
    }

    /** Katalogda ad bazen sicil kodu ("000056") oluyor; o zaman marka adi daha anlamli. */
    private fun displayName(item: JSONObject): String {
        val name = item.optString("name").trim()
        if (name.isNotEmpty() && !name.all { it.isDigit() }) return name

        val brand = item.optString("brand").trim()
        if (brand.isNotEmpty()) return brand

        val operator = item.optString("operator").trim()
        return if (operator.isEmpty()) "İsimsiz istasyon" else operator
    }

    private fun distanceLabel(item: JSONObject): String {
        if (!item.has("distanceKm") || item.isNull("distanceKm")) return "—"
        val distance = item.optDouble("distanceKm", -1.0)
        if (distance < 0) return "—"
        return if (distance < 10) String.format("%.1f km", distance)
        else "${Math.round(distance)} km"
    }

    private fun deviceId(context: Context): String {
        val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        preferences.getString(PREFS_DEVICE_ID, null)?.let { return it }

        val created = UUID.randomUUID().toString()
        preferences.edit().putString(PREFS_DEVICE_ID, created).apply()
        return created
    }

    private companion object {
        /**
         * Telefondaki EXPO_PUBLIC_EVCS_API_URL ile ayni adres. Widget Metro'dan
         * gecmedigi icin ortam degiskeni okuyamiyor; adres degisirse burasi,
         * targets/watch/EvcsClient.swift ve targets/widget/EvcsFeed.swift
         * birlikte guncellenmeli.
         */
        const val BASE_URL = "https://testmobileapi2.torasarj.net"
        const val RADIUS_KM = 50
        const val PAGE_SIZE = 50
        const val TIMEOUT_MS = 10_000
        const val PREFS_NAME = "tora-watt-widget"
        const val PREFS_DEVICE_ID = "device-id"
    }
}
