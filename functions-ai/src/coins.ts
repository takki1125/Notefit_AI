import { createHash } from "crypto";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/** monetizationTypes.ts の REMOTE_CONFIG_KEYS と一致 */
const RC_KEYS = {
  aiConsultCoinsPerTurn: "ai_consult_coins_per_turn",
  registrationBonusCoins: "registration_bonus_coins",
  subscriptionInitialPurchaseCoins: "subscription_initial_purchase_coins",
  subscriptionRenewalCoins: "subscription_renewal_coins",
  aiModelDefault: "ai_model_default",
  aiModelPremium: "ai_model_premium",
} as const;

const DEFAULT_AI_MODEL_FREE = "gpt-4o-mini";
const DEFAULT_AI_MODEL_PREMIUM = "gpt-4o";

const DEFAULT_AI_CHAT_COST = 10;
const DEFAULT_REGISTRATION_BONUS = 300;
/** 初回サブスク付与のフォールバック（Remote Config 未設定時） */
const DEFAULT_SUBSCRIPTION_INITIAL_COINS = 200;
/** 更新時付与のフォールバック */
const DEFAULT_SUBSCRIPTION_RENEWAL_COINS = 100;

export const COIN_EXPIRY_DAYS = 179;

/**
 * 消費レコード用の「事実上の無期限」。旧コードの 864e15ms は Instant 換算で秒が範囲外になり、
 * Android 向け Firestore が Timestamp を読むとクラッシュする（例: seconds must be within … but was: 8640000000000）。
 */
const NEVER_EXPIRES_AT: Timestamp = Timestamp.fromMillis(253402300799999);

function expiryTimestamp(): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + COIN_EXPIRY_DAYS);
  return Timestamp.fromDate(d);
}

function parseRcString(
  template: admin.remoteConfig.RemoteConfigTemplate,
  key: string,
  fallback: string,
): string {
  try {
    const param = template.parameters[key];
    const dv = param?.defaultValue as { value?: string } | undefined;
    const str = typeof dv?.value === "string" ? dv.value.trim() : "";
    if (str.length > 0) return str;
  } catch {
    /* fallback */
  }
  return fallback;
}

function parseRcInt(template: admin.remoteConfig.RemoteConfigTemplate, key: string, fallback: number): number {
  try {
    const param = template.parameters[key];
    const dv = param?.defaultValue as { value?: string } | undefined;
    const str = typeof dv?.value === "string" ? dv.value.trim() : "";
    const n = parseInt(str, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  } catch {
    /* fallback */
  }
  return fallback;
}

export async function getAiConsultCoinCost(): Promise<number> {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const n = parseRcInt(template, RC_KEYS.aiConsultCoinsPerTurn, DEFAULT_AI_CHAT_COST);
    return Math.max(0, n);
  } catch (e) {
    logger.warn("getAiConsultCoinCost: Remote Config fallback", e);
    return DEFAULT_AI_CHAT_COST;
  }
}

export async function getRegistrationBonusAmount(): Promise<number> {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const n = parseRcInt(template, RC_KEYS.registrationBonusCoins, DEFAULT_REGISTRATION_BONUS);
    return Math.max(0, n);
  } catch (e) {
    logger.warn("getRegistrationBonusAmount: Remote Config fallback", e);
    return DEFAULT_REGISTRATION_BONUS;
  }
}

/** AI 相談チャット用モデル（サブスクは Webhook 同期済みプレミアム期限で判定） */
export async function resolveAiCoachChatModel(isPremium: boolean): Promise<string> {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const key = isPremium ? RC_KEYS.aiModelPremium : RC_KEYS.aiModelDefault;
    const fallback = isPremium ? DEFAULT_AI_MODEL_PREMIUM : DEFAULT_AI_MODEL_FREE;
    const id = parseRcString(template, key, fallback);
    return id.length > 0 ? id : fallback;
  } catch (e) {
    logger.warn("resolveAiCoachChatModel: Remote Config fallback", e);
    return isPremium ? DEFAULT_AI_MODEL_PREMIUM : DEFAULT_AI_MODEL_FREE;
  }
}

export async function getSubscriptionInitialPurchaseCoins(): Promise<number> {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const n = parseRcInt(
      template,
      RC_KEYS.subscriptionInitialPurchaseCoins,
      DEFAULT_SUBSCRIPTION_INITIAL_COINS,
    );
    return Math.max(0, n);
  } catch (e) {
    logger.warn("getSubscriptionInitialPurchaseCoins: Remote Config fallback", e);
    return DEFAULT_SUBSCRIPTION_INITIAL_COINS;
  }
}

export async function getSubscriptionRenewalCoins(): Promise<number> {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const n = parseRcInt(template, RC_KEYS.subscriptionRenewalCoins, DEFAULT_SUBSCRIPTION_RENEWAL_COINS);
    return Math.max(0, n);
  } catch (e) {
    logger.warn("getSubscriptionRenewalCoins: Remote Config fallback", e);
    return DEFAULT_SUBSCRIPTION_RENEWAL_COINS;
  }
}

/** RevenueCat の event.type 用文字列（必要に応じて拡張） */
export type RevenueCatBillableEventType = "INITIAL_PURCHASE" | "RENEWAL";

async function subscriptionCoinAmountForEventType(eventType: RevenueCatBillableEventType): Promise<number> {
  if (eventType === "INITIAL_PURCHASE") {
    return getSubscriptionInitialPurchaseCoins();
  }
  return getSubscriptionRenewalCoins();
}

/**
 * RevenueCat Webhook からのサブスクコイン付与。
 * Firestore のドキュメント ID をイベント ID ハッシュで固定し create で二重付与を防ぐ。
 */
export async function grantSubscriptionCoinsFromRevenueCatWebhook(
  uid: string,
  revenueCatEventId: string,
  eventType: RevenueCatBillableEventType,
): Promise<{ granted: boolean; amount?: number; duplicate: boolean }> {
  if (!uid || !revenueCatEventId) {
    throw new HttpsError("invalid-argument", "uid と revenueCatEventId が必要です。");
  }

  const amount = await subscriptionCoinAmountForEventType(eventType);
  if (amount <= 0) {
    logger.info("grantSubscriptionCoinsFromRevenueCatWebhook: skip zero amount", { uid, eventType });
    return { granted: false, duplicate: false };
  }

  const docId = `sub_rc_${createHash("sha256").update(revenueCatEventId, "utf8").digest("hex")}`;
  const markerRef = db.collection("users").doc(uid).collection("coin_transactions").doc(docId);

  try {
    await markerRef.create({
      amount,
      type: "subscription_grant",
      expires_at: expiryTimestamp(),
      created_at: FieldValue.serverTimestamp(),
      idempotency_key: `revenuecat_webhook_${revenueCatEventId}`,
      note: `revenuecat:${eventType}`,
    });
    return { granted: true, amount, duplicate: false };
  } catch (e: unknown) {
    if (isAlreadyExistsError(e)) {
      return { granted: false, duplicate: true };
    }
    logger.error("grantSubscriptionCoinsFromRevenueCatWebhook create error", e);
    throw new HttpsError("internal", "サブスクリプションコイン付与に失敗しました。");
  }
}

/** リワード広告 1 回あたりの付与（固定。変更はこの定数で） */
const REWARD_AD_COINS_PER_VIEW = 10;
/** 東京日付ごとのリワード広告付与上限 */
const MAX_REWARD_AD_GRANTS_PER_DAY = 25;

function tokyoDateKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

/**
 * リワード広告視聴後のコイン付与（1 リクエスト = 1 回分。日次上限あり）
 * ※ 厳密な広告完了証明は SSV が理想。日次上限で過剰付与を抑える。
 */
export async function applyRewardAdCoinGrant(uid: string): Promise<{ granted: boolean; amount?: number }> {
  const amount = REWARD_AD_COINS_PER_VIEW;
  if (amount <= 0) {
    return { granted: false };
  }
  const dayKey = tokyoDateKey();
  const stateRef = db.collection("users").doc(uid).collection("private_meta").doc("reward_ad_daily");

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef);
      let count = 0;
      let storedDay = dayKey;
      if (snap.exists) {
        const d = snap.data()!;
        storedDay = typeof d.day_key === "string" ? d.day_key : dayKey;
        count = Number.isFinite(Number(d.count)) ? Number(d.count) : 0;
      }
      if (storedDay !== dayKey) {
        count = 0;
      }
      if (count >= MAX_REWARD_AD_GRANTS_PER_DAY) {
        throw new HttpsError(
          "resource-exhausted",
          "本日のリワード広告によるコイン獲得上限に達しています。",
        );
      }
      const txRef = db.collection("users").doc(uid).collection("coin_transactions").doc();
      tx.set(txRef, {
        amount,
        type: "reward_ad",
        expires_at: expiryTimestamp(),
        created_at: FieldValue.serverTimestamp(),
        idempotency_key: `reward_ad_${dayKey}_${count + 1}`,
      });
      tx.set(
        stateRef,
        {
          day_key: dayKey,
          count: count + 1,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error("applyRewardAdCoinGrant", e);
    throw new HttpsError("internal", "コイン付与に失敗しました。");
  }
  return { granted: true, amount };
}

/** 正の付与（未失効）＋負の消費を合算した利用可能残高 */
export async function computeCoinBalance(uid: string): Promise<number> {
  const snap = await db.collection("users").doc(uid).collection("coin_transactions").get();
  const now = Timestamp.now();
  let sum = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const amt = Number(data.amount);
    if (!Number.isFinite(amt)) continue;
    if (amt < 0) {
      sum += amt;
      continue;
    }
    const exp = data.expires_at;
    if (!(exp instanceof Timestamp)) continue;
    if (exp.toMillis() <= now.toMillis()) continue;
    sum += amt;
  }
  return Math.floor(sum);
}

async function appendConsume(uid: string, amount: number, note?: string): Promise<void> {
  const ref = db.collection("users").doc(uid).collection("coin_transactions").doc();
  await ref.set({
    amount: -Math.abs(Math.floor(amount)),
    type: "ai_consume",
    expires_at: NEVER_EXPIRES_AT,
    created_at: FieldValue.serverTimestamp(),
    ...(note ? { note } : {}),
  });
}

async function appendRefund(uid: string, amount: number, note: string): Promise<void> {
  const ref = db.collection("users").doc(uid).collection("coin_transactions").doc();
  await ref.set({
    amount: Math.abs(Math.floor(amount)),
    type: "admin_adjust",
    expires_at: expiryTimestamp(),
    created_at: FieldValue.serverTimestamp(),
    note,
  });
}

export async function spendCoinsForAiChatOrThrow(uid: string, cost: number): Promise<void> {
  if (cost <= 0) return;
  const balance = await computeCoinBalance(uid);
  if (balance < cost) {
    throw new HttpsError(
      "failed-precondition",
      `コインが不足しています（必要 ${cost} / 残高 ${balance}）。`,
    );
  }
  await appendConsume(uid, cost, "ai_coach_chat");
}

export async function refundAiChatCoins(uid: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await appendRefund(uid, amount, "ai_coach_chat_refund_openai_error");
}

function isAlreadyExistsError(e: unknown): boolean {
  const anyErr = e as { code?: number | string; message?: string };
  if (anyErr?.code === 6) return true;
  if (anyErr?.code === "already-exists") return true;
  if (typeof anyErr?.message === "string" && /already exists/i.test(anyErr.message)) return true;
  return false;
}

export type MissionGrantMeta = {
  missionId: string;
  bucket: "daily" | "weekly";
  periodKey: string;
};

/**
 * ミッション報酬: coin_transactions と mission_events を同一 docId で atomically create（冪等）。
 */
export async function grantMissionRewardInTransaction(
  uid: string,
  stableDocId: string,
  amount: number,
  meta: MissionGrantMeta,
): Promise<{ granted: boolean; duplicate: boolean; amount?: number }> {
  if (!stableDocId || amount <= 0) {
    throw new HttpsError("invalid-argument", "ミッション付与パラメータが不正です。");
  }
  const coinRef = db.collection("users").doc(uid).collection("coin_transactions").doc(stableDocId);
  const missionRef = db.collection("users").doc(uid).collection("mission_events").doc(stableDocId);

  try {
    return await db.runTransaction(async (tx) => {
      const [cSnap, mSnap] = await Promise.all([tx.get(coinRef), tx.get(missionRef)]);
      if (cSnap.exists || mSnap.exists) {
        return { granted: false, duplicate: true };
      }
      tx.create(coinRef, {
        amount,
        type: "daily_mission",
        expires_at: expiryTimestamp(),
        created_at: FieldValue.serverTimestamp(),
        idempotency_key: stableDocId,
        note: `mission:${meta.bucket}:${meta.missionId}`,
      });
      tx.create(missionRef, {
        kind: "daily_mission_complete",
        mission_id: meta.missionId,
        coins_granted: amount,
        local_date: meta.periodKey,
        bucket: meta.bucket,
        created_at: FieldValue.serverTimestamp(),
      });
      return { granted: true, duplicate: false, amount };
    });
  } catch (e: unknown) {
    if (isAlreadyExistsError(e)) {
      return { granted: false, duplicate: true };
    }
    logger.error("grantMissionRewardInTransaction", e);
    throw new HttpsError("internal", "ミッション報酬の付与に失敗しました。");
  }
}

/**
 * 登録ボーナスを 1 回だけ付与（coin_transactions/registration_bonus を create で一意化）
 */
export async function grantRegistrationBonusIfNeeded(uid: string): Promise<{ granted: boolean; amount?: number }> {
  const bonus = await getRegistrationBonusAmount();
  if (bonus <= 0) {
    return { granted: false };
  }
  const markerRef = db.collection("users").doc(uid).collection("coin_transactions").doc("registration_bonus");
  try {
    await markerRef.create({
      amount: bonus,
      type: "registration_bonus",
      expires_at: expiryTimestamp(),
      created_at: FieldValue.serverTimestamp(),
      idempotency_key: "registration_bonus",
    });
    return { granted: true, amount: bonus };
  } catch (e: unknown) {
    if (isAlreadyExistsError(e)) {
      return { granted: false };
    }
    logger.error("grantRegistrationBonus create error", e);
    throw new HttpsError("internal", "登録ボーナスの付与に失敗しました。");
  }
}
