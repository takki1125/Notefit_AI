import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

/** RevenueCat Webhook event（必要フィールドのみ） */
export type RcWebhookEventPayload = {
  id?: string;
  type?: string;
  app_user_id?: string;
  expiration_at_ms?: number;
};

/**
 * aiCoachChat 等が参照するプレミアム期限（Unix ms）。
 * Webhook でのみ更新（クライアントは書けない private_meta）。
 */
export async function getPremiumUntilMs(uid: string): Promise<number> {
  const snap = await db.doc(`users/${uid}/private_meta/revenuecat_subscription`).get();
  if (!snap.exists) return 0;
  const v = snap.data()?.premium_until_ms;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export async function isPremiumSubscriptionActive(uid: string): Promise<boolean> {
  return (await getPremiumUntilMs(uid)) > Date.now();
}

/**
 * 課金ライフサイクルイベントごとにサブスクミラーを更新。
 * expiration_at_ms が無いイベントはプレミアム期限を上書きしない。
 */
export async function syncPremiumMirrorFromRevenueCatEvent(
  uid: string,
  event: RcWebhookEventPayload,
): Promise<void> {
  const type = typeof event.type === "string" ? event.type.trim() : "";
  const ref = db.doc(`users/${uid}/private_meta/revenuecat_subscription`);
  const expMsRaw = event.expiration_at_ms;
  const expMs = typeof expMsRaw === "number" && Number.isFinite(expMsRaw) ? expMsRaw : null;

  if (type === "EXPIRATION" || type === "SUBSCRIPTION_PAUSED") {
    await ref.set(
      {
        premium_until_ms: 0,
        last_rc_event_type: type,
        last_rc_event_id: typeof event.id === "string" ? event.id : null,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  if (expMs != null) {
    const now = Date.now();
    const premiumUntil = expMs > now ? expMs : 0;
    await ref.set(
      {
        premium_until_ms: premiumUntil,
        last_rc_event_type: type,
        last_rc_event_id: typeof event.id === "string" ? event.id : null,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  logger.info("syncPremiumMirror: skipped (no expiration_at_ms)", { uid, type });
}
