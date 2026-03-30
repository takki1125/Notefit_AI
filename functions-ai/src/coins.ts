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
} as const;

const DEFAULT_AI_CHAT_COST = 10;
const DEFAULT_REGISTRATION_BONUS = 300;

export const COIN_EXPIRY_DAYS = 179;

function expiryTimestamp(): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + COIN_EXPIRY_DAYS);
  return Timestamp.fromDate(d);
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
    expires_at: Timestamp.fromMillis(8640000000000000),
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
