package net.torasarj.torawatt

import android.Manifest
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONObject
import java.io.File
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
        // Once uygulamanin biraktigi konum, sonra sistemin kendisi. Sira
        // bilerek boyle: widget arka planda calisiyor ve Android 10'dan beri
        // arka plandaki uygulama ACCESS_BACKGROUND_LOCATION olmadan konum
        // alamiyor, yani ikinci yol cogu cihazda bos donuyor.
        val location = storedLocation(context) ?: lastKnownLocation(context)
        if (location == null) {
            return WidgetState("—", "Uygulamayı bir kez aç")
        }
        return fetchNearestTora(context, location.latitude, location.longitude)
            ?: WidgetState("—", "Yakında istasyon yok")
    }

    /**
     * Uygulamanin on plandayken yazdigi konum
     * (bkz. src/services/widgetLocation.ts). Ayni uygulamanin veri klasoru
     * oldugu icin okumak izin gerektirmiyor.
     */
    private fun storedLocation(context: Context): Location? {
        val file = File(context.filesDir, STORED_LOCATION_FILE)
        if (!file.exists()) {
            Log.i(TAG, "kayitli konum dosyasi yok")
            return null
        }

        return try {
            val json = JSONObject(file.readText())
            val latitude = json.optDouble("latitude", Double.NaN)
            val longitude = json.optDouble("longitude", Double.NaN)
            if (latitude.isNaN() || longitude.isNaN()) {
                Log.w(TAG, "kayitli konum eksik")
                return null
            }
            Log.i(TAG, "kayitli konum -> $latitude,$longitude")
            Location("tora-app").apply {
                this.latitude = latitude
                this.longitude = longitude
            }
        } catch (error: Exception) {
            Log.w(TAG, "kayitli konum okunamadi: ${error.message}")
            null
        }
    }

    /**
     * Widget'in konumu.
     *
     * Once onbellekteki son bilinen konum; yoksa TAZE bir konum isteniyor.
     * Ikinci adim sart: cihaz yeni acildiysa ya da uygulama hic calismadiysa
     * onbellek bos oluyor ve widget kalici olarak "Konum yok" gosteriyor -
     * emulatorde gorulen tam olarak buydu.
     *
     * Izin ANA uygulamada aliniyor (expo-location).
     */
    private fun lastKnownLocation(context: Context): Location? {
        val granted = context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) {
            Log.w(TAG, "konum izni yok")
            return null
        }

        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (manager == null) {
            Log.w(TAG, "LocationManager alinamadi")
            return null
        }

        val providers = listOf(
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER
        )
        for (provider in providers) {
            try {
                val location = manager.getLastKnownLocation(provider)
                Log.i(TAG, "onbellek $provider -> ${location?.let { "${it.latitude},${it.longitude}" } ?: "yok"}")
                if (location != null) return location
            } catch (error: SecurityException) {
                Log.w(TAG, "$provider izin hatasi: ${error.message}")
            } catch (error: IllegalArgumentException) {
                Log.w(TAG, "$provider cihazda yok")
            }
        }

        return currentLocation(context, manager)
    }

    /**
     * Onbellek bossa tek seferlik taze konum. getCurrentLocation API 30'dan
     * itibaren var ve tam bu is icin tasarlanmis; goAsync'in verdigi pencereye
     * sigsin diye alti saniyeyle sinirliyoruz.
     */
    private fun currentLocation(context: Context, manager: LocationManager): Location? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            Log.w(TAG, "taze konum icin API 30 gerekiyor, cihaz ${Build.VERSION.SDK_INT}")
            return null
        }

        val provider = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .firstOrNull { candidate ->
                try {
                    manager.isProviderEnabled(candidate)
                } catch (error: IllegalArgumentException) {
                    false
                }
            }
        if (provider == null) {
            Log.w(TAG, "acik konum saglayicisi yok")
            return null
        }

        val latch = CountDownLatch(1)
        val holder = AtomicReference<Location?>(null)
        try {
            manager.getCurrentLocation(provider, null, context.mainExecutor) { location ->
                holder.set(location)
                latch.countDown()
            }
        } catch (error: SecurityException) {
            Log.w(TAG, "taze konum izin hatasi: ${error.message}")
            return null
        }

        latch.await(CURRENT_LOCATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        val location = holder.get()
        Log.i(TAG, "taze konum $provider -> ${location?.let { "${it.latitude},${it.longitude}" } ?: "gelmedi"}")
        return location
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
            val status = connection.responseCode
            if (status !in 200..299) {
                Log.w(TAG, "katalog HTTP $status")
                return null
            }

            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val envelope = JSONObject(body)
            if (!envelope.optBoolean("success")) {
                Log.w(TAG, "katalog reddetti: ${envelope.optString("message")}")
                return null
            }

            val items = envelope.optJSONObject("data")?.optJSONArray("items")
            if (items == null) {
                Log.w(TAG, "katalog yaniti items tasimiyor")
                return null
            }

            // Liste mesafeye gore sirali geliyor; ilk TORA kaydi en yakini.
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index) ?: continue
                if (!isTora(item)) continue
                Log.i(TAG, "${items.length()} kayittan ${index + 1}. sirada TORA bulundu")
                return WidgetState(distanceLabel(item), displayName(item))
            }

            Log.w(TAG, "${items.length()} kayit geldi ama TORA yok")
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
        const val CURRENT_LOCATION_TIMEOUT_SECONDS = 6L
        /** Uygulamanin yazdigi konum; bkz. src/services/widgetLocation.ts */
        const val STORED_LOCATION_FILE = "widget-location.json"
        /** `adb logcat -s ToraWidget` ile izlenir. */
        const val TAG = "ToraWidget"
    }
}
