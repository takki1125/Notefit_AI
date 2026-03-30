import type { SubscriptionTier } from "../utils/monetizationTypes";

/** UI プレビュー用（未接続の将来機能の見た目・文言） */

export type PreviewMission = {
  id: string;
  title: string;
  rewardCoins: number;
  progressLabel: string;
};

export const PREVIEW_LOGIN_STREAK_DAYS = 0;

export const PREVIEW_DAILY_MISSIONS_FREE: PreviewMission[] = [
  { id: "w1", title: "ワークアウトを1回記録する", rewardCoins: 15, progressLabel: "0 / 1" },
  { id: "w2", title: "体重を記録する", rewardCoins: 10, progressLabel: "0 / 1" },
  { id: "w3", title: "食事を1件記録する", rewardCoins: 10, progressLabel: "0 / 1" },
];

export const PREVIEW_TIER_EXTRA_MISSIONS: PreviewMission[] = [
  { id: "t1", title: "週間目標を確認する", rewardCoins: 20, progressLabel: "—" },
  { id: "t2", title: "ストレッチ10分", rewardCoins: 15, progressLabel: "—" },
];

export type TierPreview = {
  tier: SubscriptionTier;
  nameJa: string;
  priceJa: string;
  bullets: string[];
  highlight?: boolean;
};

export const PREVIEW_SUBSCRIPTION_TIERS: TierPreview[] = [
  {
    tier: "free",
    nameJa: "フリープラン",
    priceJa: "¥0",
    bullets: [
      "広告あり（バナー・インタースティシャル）",
      "AI: 通常モデル・デイリーミッション3枠/日",
      "トレ種目追加に上限あり",
    ],
  },
  {
    tier: "tier1",
    nameJa: "ベーシック（Tier 1）",
    priceJa: "サブスク（7日無料トライアル予定）",
    highlight: true,
    bullets: [
      "バナー・インタースティシャル非表示",
      "種目追加無制限",
      "デイリーミッション5枠/日",
    ],
  },
  {
    tier: "tier2",
    nameJa: "プレミアム（Tier 2）",
    priceJa: "サブスク（7日無料トライアル予定）",
    bullets: [
      "Tier 1 の特典すべて",
      "AIをより高精度モデルで利用",
      "契約更新時にボーナスコイン付与（予定）",
    ],
  },
];

export const PREVIEW_COIN_PACKS = [
  { id: "s", label: "スターター", coins: 120, priceJa: "¥240（今後 IAP）" },
  { id: "m", label: "お得パック", coins: 400, priceJa: "¥680（今後 IAP）" },
  { id: "l", label: "がっつり", coins: 900, priceJa: "¥1,280（今後 IAP）" },
];
