import Constants from "expo-constants";

/**
 * Firebase Console / GCP に表示される Callable の HTTPS URL（任意）。
 * 空のときは関数名から URL を組み立て、複数パターンを順に試す。
 * 例: https://asia-northeast1-<project-id>.cloudfunctions.net/grantRewardAdCoins
 */
export function getGrantRewardCallableOverrideUrl(): string | undefined {
  const v = Constants.expoConfig?.extra?.grantRewardCallableUrl;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.startsWith("https://") ? t : undefined;
}

/**
 * grantRegistrationBonus と同じ functions-ai に載せる。
 * 環境によっては ai- プレフィックス付きの URL になるため両方試す。
 */
export const GRANT_REWARD_CALLABLE_NAME_CANDIDATES = [
  "grantRewardAdCoins",
  "ai-grantRewardAdCoins",
  "ai-grantrewardadcoins",
  "grantrewardadcoins",
  "default-grantRewardAdCoins",
  "default-grantrewardadcoins",
] as const;
