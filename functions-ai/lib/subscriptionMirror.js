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
exports.getPremiumUntilMs = getPremiumUntilMs;
exports.isPremiumSubscriptionActive = isPremiumSubscriptionActive;
exports.syncPremiumMirrorFromRevenueCatEvent = syncPremiumMirrorFromRevenueCatEvent;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
/**
 * aiCoachChat 等が参照するプレミアム期限（Unix ms）。
 * Webhook でのみ更新（クライアントは書けない private_meta）。
 */
async function getPremiumUntilMs(uid) {
    const snap = await db.doc(`users/${uid}/private_meta/revenuecat_subscription`).get();
    if (!snap.exists)
        return 0;
    const v = snap.data()?.premium_until_ms;
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
async function isPremiumSubscriptionActive(uid) {
    return (await getPremiumUntilMs(uid)) > Date.now();
}
/**
 * 課金ライフサイクルイベントごとにサブスクミラーを更新。
 * expiration_at_ms が無いイベントはプレミアム期限を上書きしない。
 */
async function syncPremiumMirrorFromRevenueCatEvent(uid, event) {
    const type = typeof event.type === "string" ? event.type.trim() : "";
    const ref = db.doc(`users/${uid}/private_meta/revenuecat_subscription`);
    const expMsRaw = event.expiration_at_ms;
    const expMs = typeof expMsRaw === "number" && Number.isFinite(expMsRaw) ? expMsRaw : null;
    if (type === "EXPIRATION" || type === "SUBSCRIPTION_PAUSED") {
        await ref.set({
            premium_until_ms: 0,
            last_rc_event_type: type,
            last_rc_event_id: typeof event.id === "string" ? event.id : null,
            updated_at: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return;
    }
    if (expMs != null) {
        const now = Date.now();
        const premiumUntil = expMs > now ? expMs : 0;
        await ref.set({
            premium_until_ms: premiumUntil,
            last_rc_event_type: type,
            last_rc_event_id: typeof event.id === "string" ? event.id : null,
            updated_at: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return;
    }
    logger.info("syncPremiumMirror: skipped (no expiration_at_ms)", { uid, type });
}
