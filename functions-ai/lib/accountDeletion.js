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
exports.deleteUserByEmail = exports.deleteMyAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const logger = __importStar(require("firebase-functions/logger"));
const callableAuth_1 = require("./callableAuth");
if (!admin.apps.length) {
    admin.initializeApp();
}
// GAS から送られる共有トークン（Secret Manager で管理）
const GAS_WEBHOOK_SECRET = (0, params_1.defineSecret)("GAS_WEBHOOK_SECRET");
const publicCallableOpts = {
    region: "asia-northeast1",
    cors: true,
    invoker: "public",
};
function tokenMatchesSecret(token, secret) {
    if (typeof token !== "string" || !secret)
        return false;
    try {
        const a = Buffer.from(token, "utf8");
        const b = Buffer.from(secret, "utf8");
        if (a.length !== b.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(a, b);
    }
    catch {
        return false;
    }
}
/**
 * アカウント削除（審査要件対応）
 * 1) users/{uid} 配下を Admin SDK で再帰削除
 * 2) Firebase Auth ユーザーを削除
 *
 * クライアントは権限上削除できないサブコレクションがあるため、
 * 必ずサーバー側で実行する。
 */
exports.deleteMyAccount = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    const { uid } = (0, callableAuth_1.requireAuth)(request, { emailVerified: false });
    const userRootRef = admin.firestore().collection("users").doc(uid);
    try {
        await admin.firestore().recursiveDelete(userRootRef);
    }
    catch (error) {
        logger.error("deleteMyAccount: recursiveDelete failed", { uid, error });
        throw new https_1.HttpsError("internal", "ユーザーデータの削除に失敗しました。");
    }
    try {
        await admin.auth().deleteUser(uid);
    }
    catch (error) {
        logger.error("deleteMyAccount: auth delete failed", { uid, error });
        throw new https_1.HttpsError("internal", "認証アカウントの削除に失敗しました。時間をおいて再度お試しください。");
    }
    return { ok: true };
});
/**
 * GAS（Google Apps Script）からの HTTP POST で呼ばれるアカウント削除エンドポイント。
 * Googleフォーム → GAS → この関数 の連携で、メールアドレスを元に
 * Firestore（サブコレクション含む全データ）と Firebase Auth を削除する。
 */
exports.deleteUserByEmail = (0, https_1.onRequest)({
    region: "asia-northeast1",
    secrets: [GAS_WEBHOOK_SECRET],
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const { email, token } = req.body ?? {};
    const secret = process.env.GAS_WEBHOOK_SECRET;
    if (!secret || !tokenMatchesSecret(token, secret)) {
        res.status(403).send("Forbidden: Invalid Token");
        return;
    }
    const emailTrimmed = typeof email === "string" ? email.trim() : "";
    if (!emailTrimmed) {
        res.status(400).send("Bad Request: No email provided");
        return;
    }
    try {
        // メールアドレスから Firebase Auth ユーザーを検索
        const userRecord = await admin.auth().getUserByEmail(emailTrimmed);
        const uid = userRecord.uid;
        // Firestore: users/{uid} 配下のサブコレクションを含めて再帰削除
        const userRootRef = admin.firestore().collection("users").doc(uid);
        await admin.firestore().recursiveDelete(userRootRef);
        logger.info("deleteUserByEmail: Firestore data deleted", { uid });
        // Firebase Auth ユーザーを削除
        await admin.auth().deleteUser(uid);
        logger.info("deleteUserByEmail: Auth user deleted", { uid });
        res.status(200).send("User data deleted successfully.");
    }
    catch (error) {
        logger.error("deleteUserByEmail error:", { error });
        if (error.code === "auth/user-not-found") {
            res.status(404).send("User not found");
            return;
        }
        res.status(500).send("Error deleting user data");
    }
});
