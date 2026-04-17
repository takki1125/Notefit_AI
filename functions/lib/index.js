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
exports.deleteUserByEmail = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
// 初期化されていなければ初期化
if (admin.apps.length === 0) {
    admin.initializeApp();
}
/**
 * GAS（Google Apps Script）からの HTTP POST で呼ばれるアカウント削除エンドポイント
 */
exports.deleteUserByEmail = functions
    .region("asia-northeast1")
    .https.onRequest(async (req, res) => {
    // 1. APIキー（シークレット）の検証
    const apiKey = req.headers["x-api-key"];
    // ※ 本番環境ではFirebase Secret Manager等の使用を推奨しますが、まずは直書きや環境変数でテストします
    const EXPECTED_API_KEY = "NOTEFIT_SECRET_KEY_2026";
    if (apiKey !== EXPECTED_API_KEY) {
        res.status(403).send("Forbidden: Invalid API Key");
        return;
    }
    // POSTメソッドのみ許可
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const email = req.body.email;
    if (!email) {
        res.status(400).send("Email is required");
        return;
    }
    try {
        // 2. Authからユーザーを取得してUIDを特定
        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;
        // 3. Firestoreのデータ削除 (usersコレクションの該当ドキュメント)
        // ※ 注意: サブコレクションが存在する場合は、Firebase拡張機能の「Delete User Data」を併用するか、
        // ここで再帰的削除ロジックを書く必要があります。
        await admin.firestore().collection("users").doc(uid).delete();
        // 4. Firebase Authからユーザーを削除
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted user and data for: ${email}`);
        res.status(200).send({ success: true, message: "User deleted." });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ success: false, error: "Failed to delete user." });
    }
});
