const fs = require('node:fs');
const path = require('node:path');

const {
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('@expo/config-plugins');

/**
 * CarPlay destegi.
 *
 * NEDEN NATIVE: CarPlay'in JS koprusu (react-native-carplay) React 17/18 ve
 * ESKI mimariye bagli; bu proje React 19 ve yeni mimariyle calisiyor
 * (Reanimated 4 eskisini kabul etmiyor). Saat uygulamasindaki cozumun aynisi:
 * CarPlay dogrudan Swift'te yaziliyor, JS'e native modul girmiyor ve Expo Go
 * calismaya devam ediyor.
 *
 * IKI PARCA, IKI AYRI KOSUL:
 *
 * 1. KOD her derlemede projeye giriyor ve DERLENIYOR. Kullanilmasa bile
 *    derlenmesi onemli - yoksa aylarca dokunulmamis, hic derlenmemis bir Swift
 *    yigini birikir ve entitlement geldigi gun calismaz.
 *
 * 2. SAHNE TANIMI ve ENTITLEMENT yalnizca TORA_CARPLAY=1 ile ekleniyor.
 *    Sebebi teknik degil, idari: `com.apple.developer.carplay-charging`
 *    Apple'in YAZILI ONAYINA bagli (developer.apple.com/contact/carplay).
 *    Onay gelmeden entitlement'i profile koymak imzalamayi dusurur, yani
 *    bayrak acik olmadan derleme BASARISIZ olurdu.
 *
 * Onay geldiginde yapilacak tek sey: EAS ortamina TORA_CARPLAY=1 eklemek.
 */

/** Kaynak Swift dosyalarinin bu depodaki yeri. */
const sourceDir = path.join(__dirname, 'carplay');

/** Xcode projesinde dosyalarin toplandigi grup/klasor adi. */
const GROUP_NAME = 'CarPlay';

/** Sahne tanimi ve entitlement yalnizca bu degiskenle ekleniyor. */
const isEnabled = () => process.env.TORA_CARPLAY === '1';

const swiftFiles = () =>
  fs
    .readdirSync(sourceDir)
    .filter((name) => name.endsWith('.swift'))
    .sort();

/** Swift dosyalarini uretilen iOS agacina kopyalar. */
function withCarPlaySources(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const projectName = modConfig.modRequest.projectName;
      const target = path.join(modConfig.modRequest.platformProjectRoot, projectName, GROUP_NAME);
      fs.mkdirSync(target, { recursive: true });

      for (const name of swiftFiles()) {
        fs.copyFileSync(path.join(sourceDir, name), path.join(target, name));
      }
      return modConfig;
    },
  ]);
}

/**
 * Kopyalanan dosyalari ana hedefin derleme listesine ekler.
 *
 * Kopyalamak tek basina yetmiyor: Xcode yalnizca pbxproj'a kayitli dosyalari
 * derliyor, klasordeki dosyayi kendiliginden gormuyor.
 */
function withCarPlayBuildPhase(config) {
  return withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const projectName = modConfig.modRequest.projectName;

    // Grup bir kez olusuyor; prebuild tekrar calistiginda cogalmasin.
    let groupKey = project.findPBXGroupKey({ name: GROUP_NAME });
    if (!groupKey) {
      groupKey = project.pbxCreateGroup(GROUP_NAME, GROUP_NAME);
      const mainGroupKey = project.findPBXGroupKey({ name: projectName });
      if (mainGroupKey) {
        project.addToPbxGroup(groupKey, mainGroupKey);
      }
    }

    const targetUuid = project.getFirstTarget().uuid;
    for (const name of swiftFiles()) {
      const relative = `${projectName}/${GROUP_NAME}/${name}`;
      if (project.hasFile(relative)) continue;
      project.addSourceFile(relative, { target: targetUuid }, groupKey);
    }

    return modConfig;
  });
}

/**
 * CarPlay sahnesini Info.plist'e yazar.
 *
 * iOS, CarPlay ekranini ayri bir "sahne" olarak aciyor; telefon arayuzunun
 * sahnesi oldugu gibi kaliyor. Bu yuzden hem telefon hem CarPlay sahnesi
 * birlikte tanimlanmali - yalnizca CarPlay'i yazmak telefon tarafini kirar.
 */
function withCarPlayScene(config) {
  return withInfoPlist(config, (modConfig) => {
    if (!isEnabled()) return modConfig;

    const plist = modConfig.modResults;
    const manifest = plist.UIApplicationSceneManifest ?? {};
    const roles = manifest.UISceneConfigurations ?? {};

    manifest.UIApplicationSupportsMultipleScenes = true;
    roles.CPTemplateApplicationSceneSessionRoleApplication = [
      {
        UISceneClassName: 'CPTemplateApplicationScene',
        UISceneConfigurationName: 'TORA WATT CarPlay',
        UISceneDelegateClassName: `$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate`,
      },
    ];

    // TELEFON SAHNESINE DOKUNMUYORUZ. Expo'nun uygulama delegesi pencereyi
    // klasik yoldan kuruyor ve burada uydurulacak bir UISceneDelegate adi
    // telefon arayuzunu acilmaz hale getirir. Expo ileride kendi sahne
    // tanimini eklerse o tanim oldugu gibi korunuyor; eklemezse ilk
    // CarPlay'li derlemede telefon tarafinin hala acildigi DOGRULANMALI
    // (bkz. README, CarPlay bolumu).
    manifest.UISceneConfigurations = roles;
    plist.UIApplicationSceneManifest = manifest;
    return modConfig;
  });
}

/**
 * Sarj uygulamalari icin CarPlay entitlement'i.
 *
 * Apple bunu basvuru uzerine veriyor ve kategori secimi onemli: sarj agi
 * uygulamalari "EV charging" kategorisine giriyor.
 */
function withCarPlayEntitlement(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    if (!isEnabled()) return modConfig;
    modConfig.modResults['com.apple.developer.carplay-charging'] = true;
    return modConfig;
  });
}

module.exports = function withToraCarPlay(config) {
  config = withCarPlaySources(config);
  config = withCarPlayBuildPhase(config);
  config = withCarPlayScene(config);
  config = withCarPlayEntitlement(config);
  return config;
};
