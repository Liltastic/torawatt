const fs = require('node:fs/promises');
const path = require('node:path');

const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
} = require('@expo/config-plugins');

/**
 * Android ana ekran widget'i.
 *
 * Projede `android/` klasoru yok (bkz. app.json - prebuild EAS'te bulutta
 * calisiyor), o yuzden widget'in Kotlin ve kaynak dosyalari burada duruyor ve
 * prebuild sirasinda uretilen agaca kopyalaniyor.
 *
 * Bilerek yalnizca DOSYA kopyalayip manifest'e receiver ekliyor: Gradle'a
 * bagimlilik eklenmiyor ve JS tarafina native modul girmiyor. Ikincisi kritik -
 * `react-native-android-widget` gibi bir kutuphane widget arayuzunu JSX'te
 * yazdiriyor ama JS'ten import edilmesi gerekiyor ve o an Expo Go uygulamayi
 * acamaz hale geliyor. iOS'taki saat ve widget hedefleri de ayni sebeple
 * veriyi kendileri cekiyor.
 */
const KOTLIN_FILE = 'ToraWidgetProvider.kt';
const RESOURCES = [
  ['layout', 'tora_widget.xml'],
  ['drawable', 'tora_widget_background.xml'],
  ['xml', 'tora_widget_info.xml'],
];

const RECEIVER_CLASS = '.ToraWidgetProvider';
const WIDGET_DESCRIPTION = 'Sana en yakın TORA şarj istasyonu';

/** Kaynak dosyalarin bu depodaki yeri. */
const sourceDir = path.join(__dirname, 'android');

async function copyResources(platformProjectRoot) {
  const resRoot = path.join(platformProjectRoot, 'app', 'src', 'main', 'res');

  for (const [folder, file] of RESOURCES) {
    const target = path.join(resRoot, folder);
    await fs.mkdir(target, { recursive: true });
    await fs.copyFile(path.join(sourceDir, 'res', folder, file), path.join(target, file));
  }
}

async function copyProvider(platformProjectRoot, androidPackage) {
  // Kotlin dosyasi kendi paket adini tasiyor; yapilandirmadaki paket
  // degisirse dosyayi elle duzeltmek yerine ust satiri burada yaziyoruz.
  const source = await fs.readFile(path.join(sourceDir, KOTLIN_FILE), 'utf8');
  const withPackage = source.replace(/^package .+$/m, `package ${androidPackage}`);

  const target = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'java',
    ...androidPackage.split('.'),
  );
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(target, KOTLIN_FILE), withPackage, 'utf8');
}

function addReceiver(androidManifest, androidPackage) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  application.receiver = application.receiver ?? [];

  const name = `${androidPackage}${RECEIVER_CLASS}`;
  // Eklenti ayni calistirmada iki kez islenebiliyor; kayit tekrarlanmasin.
  if (application.receiver.some((receiver) => receiver.$?.['android:name'] === name)) {
    return androidManifest;
  }

  application.receiver.push({
    $: {
      'android:name': name,
      // Android'in kendi belgelerindeki widget ornegi de disa kapali:
      // guncellemeler AppWidgetManager uzerinden hedefe dogrudan gidiyor.
      'android:exported': 'false',
      'android:label': 'TORA WATT',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/tora_widget_info',
        },
      },
    ],
  });

  return androidManifest;
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withToraWidget = (config) => {
  const androidPackage = config.android?.package;
  if (!androidPackage) {
    throw new Error('withToraWidget: app.json icinde android.package tanimli olmali');
  }

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      await copyResources(platformProjectRoot);
      await copyProvider(platformProjectRoot, androidPackage);
      return config;
    },
  ]);

  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          _: WIDGET_DESCRIPTION,
          $: { name: 'tora_widget_description', translatable: 'false' },
        },
      ],
      config.modResults,
    );
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    config.modResults = addReceiver(config.modResults, androidPackage);
    return config;
  });

  return config;
};

module.exports = withToraWidget;
