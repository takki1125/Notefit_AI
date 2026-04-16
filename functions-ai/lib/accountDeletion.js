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
exports.deleteMyAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const publicCallableOpts = {
    region: "asia-northeast1",
    cors: true,
    invoker: "public",
};
/**
 * アカウント削除（審査要件対応）
 * 1) users/{uid} 配下を Admin SDK で再帰削除
 * 2) Firebase Auth ユーザーを削除
 *
 * クライアントは権限上削除できないサブコレクションがあるため、
 * 必ずサーバー側で実行する。
 */
exports.deleteMyAccount = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
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
