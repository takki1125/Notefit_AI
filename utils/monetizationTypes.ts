import type { Timestamp } from "firebase/firestore";

/**
 * マネタイズ／コイン／ミッション要件に対応するクライアント側の型・定数（Cloud Functions と共有する契約）。
 * 実際の付与・消費・FIFO はサーバー（Admin SDK）で行う。
 */

/** 資金決済法対応: 獲得から 180 日未満で失効（運用例: 179 日後 23:59 などは CF 側で expires_at を計算） */
export const COIN_EXPIRY_DAYS_FROM_GRANT = 179;

/** 画面表示用の目安（Remote Config とサーバーデフォルトに合わせる・未取得時の文言用） */
export const DISPLAY_FALLBACK_AI_CHAT_COIN_COST = 10;

/** Firebase Remote Config のパラメータ名（コンソールと一致させる） */
export const REMOTE_CONFIG_KEYS = {
  /** AI 相談 1 回あたりのコイン消費量（整数） */
  aiConsultCoinsPerTurn: "ai_consult_coins_per_turn",
  /** 無料／Tier1 で使う OpenAI モデル識別子（例: gpt-4o-mini） */
  aiModelDefault: "ai_model_default",
  /** Tier2 で使う OpenAI モデル識別子（例: gpt-4o） */
  aiModelPremium: "ai_model_premium",
  /** 新規登録ボーナスコイン量 */
  registrationBonusCoins: "registration_bonus_coins",
  /** リワード広告 1 回あたりの付与コイン */
  rewardAdCoins: "reward_ad_coins",
  /** ログインボーナス基礎コイン */
  loginBonusBaseCoins: "login_bonus_base_coins",
  /** サブスク初回購入（RevenueCat Webhook INITIAL_PURCHASE 等）で付与するコイン */
  subscriptionInitialPurchaseCoins: "subscription_initial_purchase_coins",
  /** サブスク自動更新（RENEWAL）ごとに付与するコイン */
  subscriptionRenewalCoins: "subscription_renewal_coins",
} as const;

export const USER_SUBCOLLECTIONS = {
  coinTransactions: "coin_transactions",
  missionEvents: "mission_events",
} as const;

export type SubscriptionTier = "free" | "tier1" | "tier2";

/** RevenueCat / 自社キャッシュとマッピングする想定のエンタイトルメント */
export const SUBSCRIPTION_ENTITLEMENTS = {
  tier1: "tier1",
  tier2: "tier2",
} as const;

/**
 * RevenueCat ダッシュボードの Entitlement identifier と一致させる。
 * 単一の「プレミアム」ID だけでも可（下位互換で tier1/tier2 もプレミアム扱い）。
 */
export const REVENUECAT_ENTITLEMENTS = {
  /** 広告非表示（単体エンタイトルメント運用時） */
  noAds: "no_ads",
  /** 追加種目など機能拡張（単体エンタイトルメント運用時） */
  extraExercises: "extra_exercises",
  /** まとめてプレミアムを付与する場合の推奨 ID */
  premium: "premium",
} as const;

export type SubscriptionFeatureFlags = {
  /** バナー・インタースティシャル等（リワード広告は除く）を出さない */
  hideAds: boolean;
  /** マイ種目・食事ルーティーンなどのプレミアム上限解放（Entitlement と同期） */
  unlockExtraExercises: boolean;
};

/** CustomerInfo.entitlements.active を解決して UI 制御に使う */
export function resolveSubscriptionFeatureFlags(activeEntitlementIds: Set<string>): SubscriptionFeatureFlags {
  const hasTier =
    activeEntitlementIds.has(SUBSCRIPTION_ENTITLEMENTS.tier1) ||
    activeEntitlementIds.has(SUBSCRIPTION_ENTITLEMENTS.tier2);
  const premium = hasTier || activeEntitlementIds.has(REVENUECAT_ENTITLEMENTS.premium);
  const noAds =
    premium ||
    activeEntitlementIds.has(REVENUECAT_ENTITLEMENTS.noAds);
  const unlockExtraExercises =
    premium ||
    activeEntitlementIds.has(REVENUECAT_ENTITLEMENTS.extraExercises);
  return { hideAds: noAds, unlockExtraExercises };
}

/** 1 日のデイリーミッション枠（要件: 無料 3 / 有料 5） */
export function dailyMissionSlotCount(tier: SubscriptionTier): number {
  return tier === "free" ? 3 : 5;
}

export type CoinTransactionType =
  | "registration_bonus"
  | "iap_purchase"
  | "reward_ad"
  | "login_bonus"
  | "daily_mission"
  | "subscription_grant"
  | "ai_consume"
  | "admin_adjust";

/**
 * Firestore: users/{uid}/coin_transactions/{transactionId}
 * 残高はトランザクションドキュメントの amount の合算（未消費分のみ有効期限内）で表すか、
 * または消費時に分割・減算する設計は Cloud Functions 側で統一する。
 */
export type CoinTransactionDoc = {
  amount: number;
  type: CoinTransactionType;
  /** 失効日時（この時刻を過ぎた未消費分は無効） */
  expires_at: Timestamp;
  created_at?: Timestamp;
  /** 冪等性・監査用（IAP トランザクション ID、広告完了トークンなど） */
  idempotency_key?: string;
  /** 人間可読メモ（任意） */
  note?: string;
};

/**
 * Firestore: users/{uid}/mission_events/{eventId}
 * ミッション達成・ログインボーナス受領などの監査ログ（クライアントは読み取りのみ想定）
 */
export type MissionEventDoc = {
  kind: "daily_mission_complete" | "login_bonus" | "mission_reset";
  coins_granted?: number;
  mission_id?: string;
  local_date?: string;
  bucket?: "daily" | "weekly";
  created_at?: Timestamp;
};
