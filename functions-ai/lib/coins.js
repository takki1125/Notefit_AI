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
exports.COIN_EXPIRY_DAYS = void 0;
exports.getAiConsultCoinCost = getAiConsultCoinCost;
exports.getRegistrationBonusAmount = getRegistrationBonusAmount;
exports.computeCoinBalance = computeCoinBalance;
exports.spendCoinsForAiChatOrThrow = spendCoinsForAiChatOrThrow;
exports.refundAiChatCoins = refundAiChatCoins;
exports.grantRegistrationBonusIfNeeded = grantRegistrationBonusIfNeeded;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/** monetizationTypes.ts の REMOTE_CONFIG_KEYS と一致 */
const RC_KEYS = {
    aiConsultCoinsPerTurn: "ai_consult_coins_per_turn",
    registrationBonusCoins: "registration_bonus_coins",
};
const DEFAULT_AI_CHAT_COST = 10;
const DEFAULT_REGISTRATION_BONUS = 300;
exports.COIN_EXPIRY_DAYS = 179;
function expiryTimestamp() {
    const d = new Date();
    d.setDate(d.getDate() + exports.COIN_EXPIRY_DAYS);
    return firestore_1.Timestamp.fromDate(d);
}
function parseRcInt(template, key, fallback) {
    try {
        const param = template.parameters[key];
        const dv = param?.defaultValue;
        const str = typeof dv?.value === "string" ? dv.value.trim() : "";
        const n = parseInt(str, 10);
        if (Number.isFinite(n) && n >= 0)
            return n;
    }
    catch {
        /* fallback */
    }
    return fallback;
}
async function getAiConsultCoinCost() {
    try {
        const rc = admin.remoteConfig();
        const template = await rc.getTemplate();
        const n = parseRcInt(template, RC_KEYS.aiConsultCoinsPerTurn, DEFAULT_AI_CHAT_COST);
        return Math.max(0, n);
    }
    catch (e) {
        logger.warn("getAiConsultCoinCost: Remote Config fallback", e);
        return DEFAULT_AI_CHAT_COST;
    }
}
async function getRegistrationBonusAmount() {
    try {
        const rc = admin.remoteConfig();
        const template = await rc.getTemplate();
        const n = parseRcInt(template, RC_KEYS.registrationBonusCoins, DEFAULT_REGISTRATION_BONUS);
        return Math.max(0, n);
    }
    catch (e) {
        logger.warn("getRegistrationBonusAmount: Remote Config fallback", e);
        return DEFAULT_REGISTRATION_BONUS;
    }
}
/** 正の付与（未失効）＋負の消費を合算した利用可能残高 */
async function computeCoinBalance(uid) {
    const snap = await db.collection("users").doc(uid).collection("coin_transactions").get();
    const now = firestore_1.Timestamp.now();
    let sum = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        const amt = Number(data.amount);
        if (!Number.isFinite(amt))
            continue;
        if (amt < 0) {
            sum += amt;
            continue;
        }
        const exp = data.expires_at;
        if (!(exp instanceof firestore_1.Timestamp))
            continue;
        if (exp.toMillis() <= now.toMillis())
            continue;
        sum += amt;
    }
    return Math.floor(sum);
}
async function appendConsume(uid, amount, note) {
    const ref = db.collection("users").doc(uid).collection("coin_transactions").doc();
    await ref.set({
        amount: -Math.abs(Math.floor(amount)),
        type: "ai_consume",
        expires_at: firestore_1.Timestamp.fromMillis(8640000000000000),
        created_at: firestore_1.FieldValue.serverTimestamp(),
        ...(note ? { note } : {}),
    });
}
async function appendRefund(uid, amount, note) {
    const ref = db.collection("users").doc(uid).collection("coin_transactions").doc();
    await ref.set({
        amount: Math.abs(Math.floor(amount)),
        type: "admin_adjust",
        expires_at: expiryTimestamp(),
        created_at: firestore_1.FieldValue.serverTimestamp(),
        note,
    });
}
async function spendCoinsForAiChatOrThrow(uid, cost) {
    if (cost <= 0)
        return;
    const balance = await computeCoinBalance(uid);
    if (balance < cost) {
        throw new https_1.HttpsError("failed-precondition", `コインが不足しています（必要 ${cost} / 残高 ${balance}）。`);
    }
    await appendConsume(uid, cost, "ai_coach_chat");
}
async function refundAiChatCoins(uid, amount) {
    if (amount <= 0)
        return;
    await appendRefund(uid, amount, "ai_coach_chat_refund_openai_error");
}
function isAlreadyExistsError(e) {
    const anyErr = e;
    if (anyErr?.code === 6)
        return true;
    if (anyErr?.code === "already-exists")
        return true;
    if (typeof anyErr?.message === "string" && /already exists/i.test(anyErr.message))
        return true;
    return false;
}
/**
 * 登録ボーナスを 1 回だけ付与（coin_transactions/registration_bonus を create で一意化）
 */
async function grantRegistrationBonusIfNeeded(uid) {
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
            created_at: firestore_1.FieldValue.serverTimestamp(),
            idempotency_key: "registration_bonus",
        });
        return { granted: true, amount: bonus };
    }
    catch (e) {
        if (isAlreadyExistsError(e)) {
            return { granted: false };
        }
        logger.error("grantRegistrationBonus create error", e);
        throw new https_1.HttpsError("internal", "登録ボーナスの付与に失敗しました。");
    }
}
