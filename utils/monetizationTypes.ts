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
  created_at?: Timestamp;
};
