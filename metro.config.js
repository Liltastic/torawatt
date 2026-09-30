// Varsayilan Expo yapilandirmasi + yonetim panelinin disarida tutulmasi.
//
// admin/ altinda kendi node_modules'u ve derleme ciktisi olan ayri bir React
// uygulamasi duruyor (bkz. admin/README.md). Metro proje kokunu izledigi icin
// o agaci da tarar, kendi React kopyasini cozumlemeye calisir ve izleyiciyi
// bosuna mesgul eder.
//
// Kalip PROJE KOKUNE bagli: yalnizca "<proje>/admin/..." elenir. Serbest bir
// /admin/ kalibi node_modules icinde ayni adi tasiyan bir klasoru de
// engelleyebilirdi.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const adminDir = path.join(__dirname, 'admin');
const escaped = adminDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${escaped}[\\\\/].*$`)];

module.exports = config;
