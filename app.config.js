// Loads environment variables from `.env` for local development.
// In EAS/CI, these should be supplied via environment variables / secrets.
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const PRODUCTION_PACKAGE = "com.takimoto.shoa.notefitai";
const DEVELOPMENT_PACKAGE = "com.takimoto.shoa.notefitai.dev";
const PRODUCTION_SCHEME = "fitness-app";
const DEVELOPMENT_SCHEME = "fitness-app-dev";

function readAppJsonExpo() {
  const p = path.join(__dirname, "app.json");
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.expo || {};
}

function envString(name) {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

function isDevelopmentBuild() {
  const variant = envString("APP_VARIANT");
  const profile = envString("EAS_BUILD_PROFILE");

  if (variant === "production") return false;
  if (variant === "development") return true;
  if (profile === "production" || profile === "preview") return false;
  if (profile === "development") return true;

  // Local `expo start` / `expo run:android` default to the dev variant.
  return true;
}

module.exports = ({ config }) => {
  const base = readAppJsonExpo();
  const isDev = isDevelopmentBuild();

  const merged = {
    ...base,
    ...config,
    name: isDev ? "NoteFit AI (Dev)" : "NoteFit AI",
    scheme: isDev ? DEVELOPMENT_SCHEME : PRODUCTION_SCHEME,
    ios: {
      ...(base.ios || {}),
      ...(config.ios || {}),
      bundleIdentifier: isDev ? DEVELOPMENT_PACKAGE : PRODUCTION_PACKAGE,
    },
    android: {
      ...(base.android || {}),
      ...(config.android || {}),
      package: isDev ? DEVELOPMENT_PACKAGE : PRODUCTION_PACKAGE,
      googleServicesFile: isDev
        ? "./google-services.dev.json"
        : "./google-services.json",
    },
    extra: {
      ...(base.extra || {}),
      ...(config.extra || {}),
      appVariant: isDev ? "development" : "production",
      revenueCatIosApiKey: envString("REVENUECAT_IOS_API_KEY"),
      revenueCatAndroidApiKey: envString("REVENUECAT_ANDROID_API_KEY"),
      adMobBannerUnitId: envString("ADMOB_BANNER_UNIT_ID"),
      adMobRewardedUnitId: envString("ADMOB_REWARDED_UNIT_ID"),
      adMobInterstitialUnitId: envString("ADMOB_INTERSTITIAL_UNIT_ID"),
      grantRewardCallableUrl: envString("GRANT_REWARD_CALLABLE_URL"),
    },
  };

  return merged;
};
