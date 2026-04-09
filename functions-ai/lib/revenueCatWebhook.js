"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueCatWebhook = void 0;
const crypto_1 = require("crypto");
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const coins_1 = require("./coins");
const subscriptionMirror_1 = require("./subscriptionMirror");
/**
 * RevenueCat ダッシュボード「Webhooks」で設定する Authorization と同一のトークン。
 * 推奨: Bearer 形式はクライアント送信仕様に合わせ、ここでは生トークンを Secret に保存し
 * `Bearer <token>` または生 `<token>` の両方を許容して比較する。
 */
const REVENUECAT_WEBHOOK_AUTH_TOKEN = (0, params_1.defineSecret)("REVENUECAT_WEBHOOK_AUTH_TOKEN");
function extractBearerToken(headerVal) {
    if (!headerVal || typeof headerVal !== "string")
        return "";
    const t = headerVal.trim();
    if (t.toLowerCase().startsWith("bearer ")) {
        return t.slice(7).trim();
    }
    return t;
}
function authHeaderMatchesSecret(headerVal, secret) {
    const received = extractBearerToken(headerVal);
    const expected = secret.trim();
    if (!received || !expected)
        return false;
    try {
        const a = Buffer.from(received, "utf8");
        const b = Buffer.from(expected, "utf8");
        if (a.length !== b.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(a, b);
    }
    catch {
        return false;
    }
}
function isBillableEventType(t) {
    return t === "INITIAL_PURCHASE" || t === "RENEWAL";
}
function pickAppUserId(event) {
    const raw = typeof event.app_user_id === "string" ? event.app_user_id.trim() : "";
    if (raw.length > 0)
        return raw;
    const orig = typeof event.original_app_user_id === "string" ? event.original_app_user_id.trim() : "";
    return orig.length > 0 ? orig : null;
}
/**
 * RevenueCat → Cloud Functions (Gen2)
 * 署名: Authorization ヘッダ（ダッシュボード設定と Secret を一致させる）
 * 冪等: grantSubscriptionCoinsFromRevenueCatWebhook 内で Firestore create
 */
exports.revenueCatWebhook = (0, https_1.onRequest)({
    region: "asia-northeast1",
    secrets: [REVENUECAT_WEBHOOK_AUTH_TOKEN],
    invoker: "public",
}, async (req, res) => {
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
    let body;
    try {
        body = typeof req.body === "object" && req.body !== null ? req.body : {};
        if (Object.keys(body).length === 0 && typeof req.body === "string") {
            body = JSON.parse(req.body);
        }
    }
    catch (e) {
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
        await (0, subscriptionMirror_1.syncPremiumMirrorFromRevenueCatEvent)(uid, {
            id: eventId,
            type: eventType,
            expiration_at_ms,
        });
    }
    catch (e) {
        logger.error("revenueCatWebhook: mirror error", e);
        res.status(500).send("Internal Server Error");
        return;
    }
    let coin = null;
    if (isBillableEventType(eventType)) {
        try {
            coin = await (0, coins_1.grantSubscriptionCoinsFromRevenueCatWebhook)(uid, eventId, eventType);
            if (coin.duplicate) {
                logger.info("revenueCatWebhook: idempotent duplicate", { eventId, eventType, uid });
            }
            else if (coin.granted) {
                logger.info("revenueCatWebhook: coins granted", {
                    eventId,
                    eventType,
                    uid,
                    amount: coin.amount,
                });
            }
            else {
                logger.info("revenueCatWebhook: zero amount skipped", { eventId, eventType, uid });
            }
        }
        catch (e) {
            logger.error("revenueCatWebhook: coin grant error", e);
            res.status(500).send("Internal Server Error");
            return;
        }
    }
    else {
        logger.info("revenueCatWebhook: coin grant skipped for event type", { eventId, eventType, uid });
    }
    res.status(200).json({ ok: true, mirror: true, coin });
});
