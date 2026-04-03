import { isNativeAdPlatform } from "./adMobUnits";

let initPromise: Promise<void> | null = null;

export function ensureMobileAdsInitialized(): Promise<void> {
  if (!isNativeAdPlatform()) {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = (async () => {
      const { default: mobileAds } = await import("react-native-google-mobile-ads");
      await mobileAds().initialize();
    })();
  }
  return initPromise;
}
