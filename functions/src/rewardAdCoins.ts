/**
 * リワード広告のコイン付与（default codebase からデプロイし、クライアントの関数名と一致させる）
 */
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const REWARD_AD_COINS_PER_VIEW = 10;
const MAX_REWARD_AD_GRANTS_PER_DAY = 25;
const COIN_EXPIRY_DAYS = 179;

function expiryTimestamp(): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + COIN_EXPIRY_DAYS);
  return Timestamp.fromDate(d);
}

function tokyoDateKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

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
