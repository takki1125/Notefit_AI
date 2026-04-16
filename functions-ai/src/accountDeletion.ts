import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const publicCallableOpts = {
  region: "asia-northeast1" as const,
  cors: true,
  invoker: "public" as const,
};

/**
 * アカウント削除（審査要件対応）
 * 1) users/{uid} 配下を Admin SDK で再帰削除
 * 2) Firebase Auth ユーザーを削除
 *
 * クライアントは権限上削除できないサブコレクションがあるため、
 * 必ずサーバー側で実行する。
 */
export const deleteMyAccount = onCall(publicCallableOpts, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const uid = request.auth.uid;
  const userRootRef = admin.firestore().collection("users").doc(uid);

  try {
    await admin.firestore().recursiveDelete(userRootRef);
  } catch (error) {
    logger.error("deleteMyAccount: recursiveDelete failed", { uid, error });
    throw new HttpsError("internal", "ユーザーデータの削除に失敗しました。");
  }

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    logger.error("deleteMyAccount: auth delete failed", { uid, error });
    throw new HttpsError(
      "internal",
      "認証アカウントの削除に失敗しました。時間をおいて再度お試しください。",
    );
  }

  return { ok: true };
});
