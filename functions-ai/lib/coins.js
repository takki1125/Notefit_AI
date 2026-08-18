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
exports.TEST_ACCOUNT_GRANT_AMOUNT = exports.COIN_EXPIRY_DAYS = void 0;
exports.getAiConsultCoinCost = getAiConsultCoinCost;
exports.getRegistrationBonusAmount = getRegistrationBonusAmount;
exports.resolveAiCoachChatModel = resolveAiCoachChatModel;
exports.getSubscriptionInitialPurchaseCoins = getSubscriptionInitialPurchaseCoins;
exports.getSubscriptionRenewalCoins = getSubscriptionRenewalCoins;
exports.grantSubscriptionCoinsFromRevenueCatWebhook = grantSubscriptionCoinsFromRevenueCatWebhook;
exports.isTestAccountAuthEmail = isTestAccountAuthEmail;
exports.grantTestAccountDebugCoins = grantTestAccountDebugCoins;
exports.applyRewardAdCoinGrant = applyRewardAdCoinGrant;
exports.computeCoinBalance = computeCoinBalance;
exports.spendCoinsForAiChatOrThrow = spendCoinsForAiChatOrThrow;
exports.refundAiChatCoins = refundAiChatCoins;
exports.grantMissionRewardInTransaction = grantMissionRewardInTransaction;
exports.grantRegistrationBonusIfNeeded = grantRegistrationBonusIfNeeded;
const crypto_1 = require("crypto");
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
    subscriptionInitialPurchaseCoins: "subscription_initial_purchase_coins",
    subscriptionRenewalCoins: "subscription_renewal_coins",
    aiModelDefault: "ai_model_default",
    aiModelPremium: "ai_model_premium",
};
const DEFAULT_AI_MODEL_FREE = "gpt-4o-mini";
const DEFAULT_AI_MODEL_PREMIUM = "gpt-4o";
const DEFAULT_AI_CHAT_COST = 10;
const DEFAULT_REGISTRATION_BONUS = 300;
/** 初回サブスク付与のフォールバック（Remote Config 未設定時） */
const DEFAULT_SUBSCRIPTION_INITIAL_COINS = 200;
/** 更新時付与のフォールバック */
const DEFAULT_SUBSCRIPTION_RENEWAL_COINS = 100;
exports.COIN_EXPIRY_DAYS = 179;
/**
 * 消費レコード用の「事実上の無期限」。旧コードの 864e15ms は Instant 換算で秒が範囲外になり、
 * Android 向け Firestore が Timestamp を読むとクラッシュする（例: seconds must be within … but was: 8640000000000）。
 */
const NEVER_EXPIRES_AT = firestore_1.Timestamp.fromMillis(253402300799999);
function expiryTimestamp() {
    const d = new Date();
    d.setDate(d.getDate() + exports.COIN_EXPIRY_DAYS);
    return firestore_1.Timestamp.fromDate(d);
}
function parseRcString(template, key, fallback) {
    try {
        const param = template.parameters[key];
        const dv = param?.defaultValue;
        const str = typeof dv?.value === "string" ? dv.value.trim() : "";
        if (str.length > 0)
            return str;
    }
    catch {
        /* fallback */
    }
    return fallback;
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
/** AI 相談チャット用モデル（サブスクは Webhook 同期済みプレミアム期限で判定） */
async function resolveAiCoachChatModel(isPremium) {
    try {
        const rc = admin.remoteConfig();
        const template = await rc.getTemplate();
        const key = isPremium ? RC_KEYS.aiModelPremium : RC_KEYS.aiModelDefault;
        const fallback = isPremium ? DEFAULT_AI_MODEL_PREMIUM : DEFAULT_AI_MODEL_FREE;
        const id = parseRcString(template, key, fallback);
        return id.length > 0 ? id : fallback;
    }
    catch (e) {
        logger.warn("resolveAiCoachChatModel: Remote Config fallback", e);
        return isPremium ? DEFAULT_AI_MODEL_PREMIUM : DEFAULT_AI_MODEL_FREE;
    }
}
async function getSubscriptionInitialPurchaseCoins() {
    try {
        const rc = admin.remoteConfig();
        const template = await rc.getTemplate();
        const n = parseRcInt(template, RC_KEYS.subscriptionInitialPurchaseCoins, DEFAULT_SUBSCRIPTION_INITIAL_COINS);
        return Math.max(0, n);
    }
    catch (e) {
        logger.warn("getSubscriptionInitialPurchaseCoins: Remote Config fallback", e);
        return DEFAULT_SUBSCRIPTION_INITIAL_COINS;
    }
}
async function getSubscriptionRenewalCoins() {
    try {
        const rc = admin.remoteConfig();
        const template = await rc.getTemplate();
        const n = parseRcInt(template, RC_KEYS.subscriptionRenewalCoins, DEFAULT_SUBSCRIPTION_RENEWAL_COINS);
        return Math.max(0, n);
    }
    catch (e) {
        logger.warn("getSubscriptionRenewalCoins: Remote Config fallback", e);
        return DEFAULT_SUBSCRIPTION_RENEWAL_COINS;
    }
}
async function subscriptionCoinAmountForEventType(eventType) {
    if (eventType === "INITIAL_PURCHASE") {
        return getSubscriptionInitialPurchaseCoins();
    }
    return getSubscriptionRenewalCoins();
}
/**
 * RevenueCat Webhook からのサブスクコイン付与。
 * Firestore のドキュメント ID をイベント ID ハッシュで固定し create で二重付与を防ぐ。
 */
async function grantSubscriptionCoinsFromRevenueCatWebhook(uid, revenueCatEventId, eventType) {
    if (!uid || !revenueCatEventId) {
        throw new https_1.HttpsError("invalid-argument", "uid と revenueCatEventId が必要です。");
    }
    const amount = await subscriptionCoinAmountForEventType(eventType);
    if (amount <= 0) {
        logger.info("grantSubscriptionCoinsFromRevenueCatWebhook: skip zero amount", { uid, eventType });
        return { granted: false, duplicate: false };
    }
    const docId = `sub_rc_${(0, crypto_1.createHash)("sha256").update(revenueCatEventId, "utf8").digest("hex")}`;
    const markerRef = db.collection("users").doc(uid).collection("coin_transactions").doc(docId);
    try {
        await markerRef.create({
            amount,
            type: "subscription_grant",
            expires_at: expiryTimestamp(),
            created_at: firestore_1.FieldValue.serverTimestamp(),
            idempotency_key: `revenuecat_webhook_${revenueCatEventId}`,
            note: `revenuecat:${eventType}`,
        });
        return { granted: true, amount, duplicate: false };
    }
    catch (e) {
        if (isAlreadyExistsError(e)) {
            return { granted: false, duplicate: true };
        }
        logger.error("grantSubscriptionCoinsFromRevenueCatWebhook create error", e);
        throw new https_1.HttpsError("internal", "サブスクリプションコイン付与に失敗しました。");
    }
}
const TEST_ACCOUNT_EMAIL_SUFFIX = "@notefit-dev.test";
/** テストアカウントの手動付与（1 タップあたり） */
exports.TEST_ACCOUNT_GRANT_AMOUNT = 1000;
function isTestAccountAuthEmail(email) {
    return typeof email === "string" && email.toLowerCase().endsWith(TEST_ACCOUNT_EMAIL_SUFFIX);
}
/** テストアカウント限定のデバッグ付与。回数制限なし。Auth のメールだけを信じる。 */
async function grantTestAccountDebugCoins(uid, email) {
    if (!isTestAccountAuthEmail(email)) {
        throw new https_1.HttpsError("permission-denied", "テストアカウント専用です。");
    }
    const amount = exports.TEST_ACCOUNT_GRANT_AMOUNT;
    const ref = db.collection("users").doc(uid).collection("coin_transactions").doc();
    await ref.set({
        amount,
        type: "test_grant",
        expires_at: expiryTimestamp(),
        created_at: firestore_1.FieldValue.serverTimestamp(),
        note: "test_account_debug",
    });
    return { granted: true, amount };
}
/** リワード広告 1 回あたりの付与（固定。変更はこの定数で） */
const REWARD_AD_COINS_PER_VIEW = 10;
/** 東京日付ごとのリワード広告付与上限 */
const MAX_REWARD_AD_GRANTS_PER_DAY = 25;
function tokyoDateKey() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}
/**
 * リワード広告視聴後のコイン付与（1 リクエスト = 1 回分。日次上限あり）
 * ※ 厳密な広告完了証明は SSV が理想。日次上限で過剰付与を抑える。
 */
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
        expires_at: NEVER_EXPIRES_AT,
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
 * ミッション報酬: coin_transactions と mission_events を同一 docId で atomically create（冪等）。
 */
async function grantMissionRewardInTransaction(uid, stableDocId, amount, meta) {
    if (!stableDocId || amount <= 0) {
        throw new https_1.HttpsError("invalid-argument", "ミッション付与パラメータが不正です。");
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
                created_at: firestore_1.FieldValue.serverTimestamp(),
                idempotency_key: stableDocId,
                note: `mission:${meta.bucket}:${meta.missionId}`,
            });
            tx.create(missionRef, {
                kind: "daily_mission_complete",
                mission_id: meta.missionId,
                coins_granted: amount,
                local_date: meta.periodKey,
                bucket: meta.bucket,
                created_at: firestore_1.FieldValue.serverTimestamp(),
            });
            return { granted: true, duplicate: false, amount };
        });
    }
    catch (e) {
        if (isAlreadyExistsError(e)) {
            return { granted: false, duplicate: true };
        }
        logger.error("grantMissionRewardInTransaction", e);
        throw new https_1.HttpsError("internal", "ミッション報酬の付与に失敗しました。");
    }
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
