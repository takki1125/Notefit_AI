import Constants from "expo-constants";
import { Platform } from "react-native";

let purchasesConfiguredWithValidKey = false;
let lastLinkedUid: string | null | undefined;

function getApiKeyFromExtra(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const key =
    Platform.OS === "ios"
      ? extra?.revenueCatIosApiKey
      : Platform.OS === "android"
        ? extra?.revenueCatAndroidApiKey
        : undefined;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : undefined;
}

/** ネイティブストア課金が使えるか（Web は対象外） */
export function isRevenueCatSupportedPlatform(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

/**
 * react-native-purchases を遅延ロード（Web バンドル時の事故を減らす）。
 */
export function getRevenueCatLibrary(): typeof import("react-native-purchases") | null {
  if (!isRevenueCatSupportedPlatform()) {
    return null;
  }
  try {
    return require("react-native-purchases") as typeof import("react-native-purchases");
  } catch {
    return null;
  }
}

/**
 * RevenueCat SDK の初期化（同一セッションで 1 回のみ）。
 * app.json / app.config の extra に API キーがない場合は false。
 */
export function ensureRevenueCatConfigured(): boolean {
  if (!isRevenueCatSupportedPlatform()) {
    return false;
  }
  if (purchasesConfiguredWithValidKey) {
    return true;
  }
  const lib = getRevenueCatLibrary();
  if (!lib) {
    return false;
  }
  const apiKey = getApiKeyFromExtra();
  if (!apiKey) {
    return false;
  }
  lib.default.configure({ apiKey });
  void lib.default.setLogLevel(__DEV__ ? lib.LOG_LEVEL.DEBUG : lib.LOG_LEVEL.WARN);
  purchasesConfiguredWithValidKey = true;
  return true;
}

/**
 * Firebase Auth の UID を RevenueCat の appUserId に紐付け。
 * メール未検証やログアウト時は logOut で匿名ユーザーに戻す。
 */
export async function syncRevenueCatWithFirebaseUser(opts: {
  uid: string | null;
  emailVerified: boolean;
}): Promise<void> {
  if (!isRevenueCatSupportedPlatform()) {
    return;
  }
  if (!ensureRevenueCatConfigured()) {
    return;
  }

  const lib = getRevenueCatLibrary();
  if (!lib) {
    return;
  }

  const targetUid = opts.uid && opts.emailVerified ? opts.uid : null;
  if (targetUid === lastLinkedUid) {
    return;
  }

  try {
    if (targetUid) {
      await lib.default.logIn(targetUid);
      lastLinkedUid = targetUid;
    } else {
      await lib.default.logOut();
      lastLinkedUid = null;
    }
  } catch (e) {
    console.warn("[RevenueCat] syncRevenueCatWithFirebaseUser", e);
  }
}
