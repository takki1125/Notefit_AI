/**
 * サブスク時にバナー・インタースティシャル等を止める（リワード広告は対象外）。
 * Entitlement 同期後にフックから更新する。
 */
let suppressNonRewardAds = false;

export function setSuppressNonRewardAds(suppress: boolean): void {
  suppressNonRewardAds = suppress;
}

export function shouldPresentNonRewardAds(): boolean {
  return !suppressNonRewardAds;
}
