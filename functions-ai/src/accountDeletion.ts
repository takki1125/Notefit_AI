import * as admin from "firebase-admin";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

// GAS から送られる共有トークン（Secret Manager で管理）
const GAS_WEBHOOK_SECRET = defineSecret("GAS_WEBHOOK_SECRET");

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

/**
 * GAS（Google Apps Script）からの HTTP POST で呼ばれるアカウント削除エンドポイント。
 * Googleフォーム → GAS → この関数 の連携で、メールアドレスを元に
 * Firestore（サブコレクション含む全データ）と Firebase Auth を削除する。
 */
export const deleteUserByEmail = onRequest(
  {
    region: "asia-northeast1",
    secrets: [GAS_WEBHOOK_SECRET],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { email, token } = req.body ?? {};

    // Secret Manager の GAS_WEBHOOK_SECRET は secrets オプションにより実行時に process.env に注入される
    const secret = process.env.GAS_WEBHOOK_SECRET;
    if (!secret || typeof token !== "string" || token !== secret) {
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
      logger.info(`deleteUserByEmail: Firestore data deleted`, { uid, email: emailTrimmed });

      // Firebase Auth ユーザーを削除
      await admin.auth().deleteUser(uid);
      logger.info(`deleteUserByEmail: Auth user deleted`, { uid, email: emailTrimmed });

      res.status(200).send(`User data for ${emailTrimmed} deleted successfully.`);
    } catch (error: any) {
      logger.error("deleteUserByEmail error:", { email: emailTrimmed, error });

      if (error.code === "auth/user-not-found") {
        // Auth にユーザーが見つからない場合（既に削除済み等）
        res.status(404).send(`User not found: ${emailTrimmed}`);
        return;
      }

      res.status(500).send(`Error: ${error.message}`);
    }
  },
);
