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
exports.applyRewardAdCoinGrant = applyRewardAdCoinGrant;
/**
 * リワード広告のコイン付与（default codebase からデプロイし、クライアントの関数名と一致させる）
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const REWARD_AD_COINS_PER_VIEW = 10;
const MAX_REWARD_AD_GRANTS_PER_DAY = 25;
const COIN_EXPIRY_DAYS = 179;
function expiryTimestamp() {
    const d = new Date();
    d.setDate(d.getDate() + COIN_EXPIRY_DAYS);
    return firestore_1.Timestamp.fromDate(d);
}
function tokyoDateKey() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}
async function applyRewardAdCoinGrant(uid) {
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
                const d = snap.data();
                storedDay = typeof d.day_key === "string" ? d.day_key : dayKey;
                count = Number.isFinite(Number(d.count)) ? Number(d.count) : 0;
            }
            if (storedDay !== dayKey) {
                count = 0;
            }
            if (count >= MAX_REWARD_AD_GRANTS_PER_DAY) {
                throw new https_1.HttpsError("resource-exhausted", "本日のリワード広告によるコイン獲得上限に達しています。");
            }
            const txRef = db.collection("users").doc(uid).collection("coin_transactions").doc();
            tx.set(txRef, {
                amount,
                type: "reward_ad",
                expires_at: expiryTimestamp(),
                created_at: firestore_1.FieldValue.serverTimestamp(),
                idempotency_key: `reward_ad_${dayKey}_${count + 1}`,
            });
            tx.set(stateRef, {
                day_key: dayKey,
                count: count + 1,
                updated_at: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        logger.error("applyRewardAdCoinGrant", e);
        throw new https_1.HttpsError("internal", "コイン付与に失敗しました。");
    }
    return { granted: true, amount };
}
