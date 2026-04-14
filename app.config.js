// Loads environment variables from `.env` for local development.
// In EAS/CI, these should be supplied via environment variables / secrets.
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

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

module.exports = ({ config }) => {
  const base = readAppJsonExpo();

  const merged = {
    ...base,
    ...config,
    extra: {
      ...(base.extra || {}),
      ...(config.extra || {}),
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

