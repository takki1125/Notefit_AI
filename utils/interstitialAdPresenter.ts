import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";

import {
  FOOD_ADDS_PER_INTERSTITIAL,
  INTERSTITIAL_MIN_INTERVAL_MS,
} from "../constants/adPlacement";
import { getInterstitialAdUnitId, isNativeAdPlatform } from "./adMobUnits";
import { ensureMobileAdsInitialized } from "./mobileAdsInit";

const STORAGE_LAST_SHOWN = "interstitial_last_shown_ms_v1";
const STORAGE_FOOD_COUNT = "interstitial_food_add_count_v1";

let interstitial: InterstitialAd | null = null;
let globalListenersAttached = false;

function attachGlobalListeners(ad: InterstitialAd) {
  if (globalListenersAttached) return;
  globalListenersAttached = true;
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    ad.load();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    ad.load();
  });
}

function getOrCreateInterstitial(): InterstitialAd | null {
  const unitId = getInterstitialAdUnitId();
  if (!unitId) return null;
  if (!interstitial) {
    interstitial = InterstitialAd.createForAdRequest(unitId);
    attachGlobalListeners(interstitial);
  }
  return interstitial;
}

async function shouldDeferForCooldown(bypass: boolean): Promise<boolean> {
  if (bypass || INTERSTITIAL_MIN_INTERVAL_MS <= 0) return false;
  const raw = await AsyncStorage.getItem(STORAGE_LAST_SHOWN);
  const last = raw ? parseInt(raw, 10) : 0;
  if (!Number.isFinite(last) || last <= 0) return false;
  return Date.now() - last < INTERSTITIAL_MIN_INTERVAL_MS;
}

async function markInterstitialPresented(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_LAST_SHOWN, String(Date.now()));
}

export function preloadInterstitial(): void {
  if (!isNativeAdPlatform()) return;
  void ensureMobileAdsInitialized().then(() => {
    const ad = getOrCreateInterstitial();
    if (!ad) return;
    if (!ad.loaded) ad.load();
  });
}

export type PresentInterstitialOptions = {
  /** true のとき INTERSTITIAL_MIN_INTERVAL_MS を無視（ワークアウト完了用） */
  bypassCooldown?: boolean;
};

/**
 * 読み込み済みなら全画面広告を表示。閉じるまで待つ（失敗・未ロード時はすぐ戻る）。
 */
export async function presentInterstitialWhenReady(
  opts: PresentInterstitialOptions = {},
): Promise<void> {
  if (!isNativeAdPlatform()) return;
  await ensureMobileAdsInitialized();
  const ad = getOrCreateInterstitial();
  if (!ad) return;

  if (await shouldDeferForCooldown(!!opts.bypassCooldown)) {
    if (!ad.loaded) ad.load();
    return;
  }

  if (!ad.loaded) {
    ad.load();
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    let unsubClosed: (() => void) | null = null;
    const finish = (recordCooldown: boolean) => {
      if (settled) return;
      settled = true;
      unsubClosed?.();
      if (recordCooldown) void markInterstitialPresented();
      resolve();
    };
    unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(true));
    ad.show().catch(() => finish(false));
    setTimeout(() => finish(false), 120_000);
  });
}

/**
 * 食事が 1 件保存されたあとに呼ぶ。FOOD_ADDS_PER_INTERSTITIAL 件に達したタイミングでインターを試みる。
 */
export async function recordFoodAddAndMaybePresentInterstitial(): Promise<void> {
  if (!isNativeAdPlatform()) return;
  const raw = await AsyncStorage.getItem(STORAGE_FOOD_COUNT);
  let count = raw ? parseInt(raw, 10) : 0;
  if (!Number.isFinite(count) || count < 0) count = 0;
  count += 1;
  if (count < FOOD_ADDS_PER_INTERSTITIAL) {
    await AsyncStorage.setItem(STORAGE_FOOD_COUNT, String(count));
    return;
  }
  await AsyncStorage.setItem(STORAGE_FOOD_COUNT, "0");
  await presentInterstitialWhenReady({ bypassCooldown: false });
}
