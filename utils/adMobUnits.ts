import Constants from "expo-constants";
import { Platform } from "react-native";

export function isNativeAdPlatform(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

function extraString(key: "adMobBannerUnitId" | "adMobRewardedUnitId"): string | undefined {
  const v = Constants.expoConfig?.extra?.[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

/** 未設定時は Google 公式デモ用ユニット（ストア提出前に AdMob で発行した ID を app.json extra に設定） */
export function getBannerAdUnitId(): string {
  const custom = extraString("adMobBannerUnitId");
  if (custom) return custom;
  return (
    Platform.select({
      ios: "ca-app-pub-3940256099942544/2934735716",
      android: "ca-app-pub-3940256099942544/6300978111",
      default: "",
    }) ?? ""
  );
}

export function getRewardedAdUnitId(): string {
  const custom = extraString("adMobRewardedUnitId");
  if (custom) return custom;
  return (
    Platform.select({
      ios: "ca-app-pub-3940256099942544/1712485313",
      android: "ca-app-pub-3940256099942544/5224354917",
      default: "",
    }) ?? ""
  );
}
