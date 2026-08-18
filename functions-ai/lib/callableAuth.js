"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const https_1 = require("firebase-functions/v2/https");
function requireAuth(request, opts = {}) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    if (opts.emailVerified !== false && request.auth.token.email_verified !== true) {
        throw new https_1.HttpsError("failed-precondition", "メールアドレスの確認が必要です。");
    }
    return { uid: request.auth.uid };
}
