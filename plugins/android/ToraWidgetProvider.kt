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
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * Ana ekran widget'i: en yakin ORNEK istasyon.
 *
 * Bu surum demo veriyle calisiyor: istasyon listesi asagida gomulu, ag istegi
 * yok. Telefondaki src/data/demoStations.ts ve iOS'taki
 * targets/widget/EvcsFeed.swift ile ayni liste; biri degisirse hepsi
 * guncellenmeli.
 *
 * Bilerek ek bagimlilik yok: konum icin LocationManager, JSON icin org.json.
 * Ikisi de Android'in kendi kutuphanesinde; config eklentisi yalnizca dosya
 * kopyalayip manifest'e receiver ekliyor (bkz. plugins/withToraWidget.js).
 */
class ToraWidgetProvider : AppWidgetProvider() {

    private data class WidgetState(val distance: String, val name: String)

    private data class DemoStation(val name: String, val latitude: Double, val longitude: Double)

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Taze konum istegi birkac saniye surebiliyor; ana is parcacigini
        // bekletmemek icin goAsync (sistem siniri ~10 sn).
        val pendingResult = goAsync()
        thread {
            val state = try {
                loadNearest(context)
            } catch (error: Exception) {
                Log.w(TAG, "widget guncellenemedi: ${error.message}")
                WidgetState("—", "Uygulamayı bir kez aç")
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
        // Yaricap yok (iOS widget'i gibi): ornek istasyonlar tek bir hatta
        // duruyor, baska sehirdeki kullanici bos widget gormemeli.
        val nearest = DEMO_STATIONS
            .map { station -> station to distanceKm(location, station) }
            .minByOrNull { it.second }
            ?: return WidgetState("—", "İstasyon yok")
        return WidgetState(distanceLabel(nearest.second), nearest.first.name)
    }

    private fun distanceKm(from: Location, station: DemoStation): Double {
        val result = FloatArray(1)
        Location.distanceBetween(
            from.latitude,
            from.longitude,
            station.latitude,
            station.longitude,
            result
        )
        return result[0] / 1000.0
    }

    private fun distanceLabel(distanceKm: Double): String =
        if (distanceKm < 10) String.format("%.1f km", distanceKm)
        else "${Math.round(distanceKm)} km"

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

    private companion object {
        /** src/data/demoStations.ts ile ayni ornek istasyonlar. */
        private val DEMO_STATIONS = listOf(
            DemoStation("Demo Maslak", 41.1106, 29.0206),
            DemoStation("Demo Levent", 41.0819, 29.0117),
            DemoStation("Demo Kağıthane", 41.0876, 28.9712),
            DemoStation("Demo Beşiktaş", 41.0422, 29.0061),
            DemoStation("Demo Ataşehir", 40.9923, 29.1244),
            DemoStation("Demo Gebze", 40.8021, 29.4307),
            DemoStation("Demo Sakarya", 40.7654, 30.4012),
            DemoStation("Demo Düzce", 40.8438, 31.1565),
            DemoStation("Demo Bolu", 40.7396, 31.6112),
            DemoStation("Demo Gerede", 40.8005, 32.1985),
            DemoStation("Demo Kızılcahamam", 40.4712, 32.6489),
        )
        const val CURRENT_LOCATION_TIMEOUT_SECONDS = 6L
        /** Uygulamanin yazdigi konum; bkz. src/services/widgetLocation.ts */
        const val STORED_LOCATION_FILE = "widget-location.json"
        /** `adb logcat -s ToraWidget` ile izlenir. */
        const val TAG = "ToraWidget"
    }
}
