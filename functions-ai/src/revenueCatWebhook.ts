import { timingSafeEqual } from "crypto";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

import { grantSubscriptionCoinsFromRevenueCatWebhook, type RevenueCatBillableEventType } from "./coins";
import { syncPremiumMirrorFromRevenueCatEvent } from "./subscriptionMirror";

/**
 * RevenueCat ダッシュボード「Webhooks」で設定する Authorization と同一のトークン。
 * 推奨: Bearer 形式はクライアント送信仕様に合わせ、ここでは生トークンを Secret に保存し
 * `Bearer <token>` または生 `<token>` の両方を許容して比較する。
 */
const REVENUECAT_WEBHOOK_AUTH_TOKEN = defineSecret("REVENUECAT_WEBHOOK_AUTH_TOKEN");

type RcWebhookBodyV1 = {
  api_version?: string;
  event?: {
    id?: string;
    type?: string;
    app_user_id?: string;
    expiration_at_ms?: number;
    /** 匿名 ID からの移行などで別 ID が付く場合があるが、Firebase UID 運用時は app_user_id を優先 */
    original_app_user_id?: string;
  };
};

function extractBearerToken(headerVal: string | undefined): string {
  if (!headerVal || typeof headerVal !== "string") return "";
  const t = headerVal.trim();
  if (t.toLowerCase().startsWith("bearer ")) {
    return t.slice(7).trim();
  }
  return t;
}

function authHeaderMatchesSecret(headerVal: string | undefined, secret: string): boolean {
  const received = extractBearerToken(headerVal);
  const expected = secret.trim();
  if (!received || !expected) return false;
  try {
    const a = Buffer.from(received, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isBillableEventType(t: string): t is RevenueCatBillableEventType {
  return t === "INITIAL_PURCHASE" || t === "RENEWAL";
}

function pickAppUserId(event: NonNullable<RcWebhookBodyV1["event"]>): string | null {
  const raw = typeof event.app_user_id === "string" ? event.app_user_id.trim() : "";
  if (raw.length > 0) return raw;
  const orig =
    typeof event.original_app_user_id === "string" ? event.original_app_user_id.trim() : "";
  return orig.length > 0 ? orig : null;
}

/**
 * RevenueCat → Cloud Functions (Gen2)
 * 署名: Authorization ヘッダ（ダッシュボード設定と Secret を一致させる）
 * 冪等: grantSubscriptionCoinsFromRevenueCatWebhook 内で Firestore create
 */
export const revenueCatWebhook = onRequest(
  {
    region: "asia-northeast1",
    secrets: [REVENUECAT_WEBHOOK_AUTH_TOKEN],
    invoker: "public",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const secret = REVENUECAT_WEBHOOK_AUTH_TOKEN.value();
    if (!secret) {
      logger.error("revenueCatWebhook: REVENUECAT_WEBHOOK_AUTH_TOKEN is empty");
      res.status(500).send("Server configuration error");
      return;
    }

    const authHeader = req.get("authorization") ?? req.get("Authorization");
    if (!authHeaderMatchesSecret(authHeader, secret)) {
      logger.warn("revenueCatWebhook: unauthorized");
      res.status(401).send("Unauthorized");
      return;
    }

    let body: RcWebhookBodyV1;
    try {
      body = typeof req.body === "object" && req.body !== null ? (req.body as RcWebhookBodyV1) : {};
      if (Object.keys(body).length === 0 && typeof req.body === "string") {
        body = JSON.parse(req.body) as RcWebhookBodyV1;
      }
    } catch (e) {
      logger.warn("revenueCatWebhook: invalid JSON", e);
      res.status(400).send("Bad Request");
      return;
    }

    const event = body.event;
    const eventId = typeof event?.id === "string" ? event.id.trim() : "";
    const eventType = typeof event?.type === "string" ? event.type.trim() : "";
    const uid = event ? pickAppUserId(event) : null;

    if (!eventId || !eventType) {
      logger.warn("revenueCatWebhook: missing event id or type", { eventType, hasId: !!eventId });
      res.status(400).send("Bad Request");
      return;
    }

    if (!uid) {
      logger.warn("revenueCatWebhook: no app_user_id", { eventId, eventType });
      res.status(400).send("Bad Request");
      return;
    }

    const expRaw = event?.expiration_at_ms;
    const expiration_at_ms = typeof expRaw === "number" && Number.isFinite(expRaw) ? expRaw : undefined;

    try {
      await syncPremiumMirrorFromRevenueCatEvent(uid, {
        id: eventId,
        type: eventType,
        expiration_at_ms,
      });
    } catch (e) {
      logger.error("revenueCatWebhook: mirror error", e);
      res.status(500).send("Internal Server Error");
      return;
    }

    let coin:
      | Awaited<ReturnType<typeof grantSubscriptionCoinsFromRevenueCatWebhook>>
      | null = null;

    if (isBillableEventType(eventType)) {
      try {
        coin = await grantSubscriptionCoinsFromRevenueCatWebhook(uid, eventId, eventType);
        if (coin.duplicate) {
          logger.info("revenueCatWebhook: idempotent duplicate", { eventId, eventType, uid });
        } else if (coin.granted) {
          logger.info("revenueCatWebhook: coins granted", {
            eventId,
            eventType,
            uid,
            amount: coin.amount,
          });
        } else {
          logger.info("revenueCatWebhook: zero amount skipped", { eventId, eventType, uid });
        }
      } catch (e) {
        logger.error("revenueCatWebhook: coin grant error", e);
        res.status(500).send("Internal Server Error");
        return;
      }
    } else {
      logger.info("revenueCatWebhook: coin grant skipped for event type", { eventId, eventType, uid });
    }

    res.status(200).json({ ok: true, mirror: true, coin });
  },
);
