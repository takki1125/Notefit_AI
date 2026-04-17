import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// 既に admin.initializeApp() が呼ばれている前提です

export const deleteUserByEmail = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // 1. セキュリティチェック: GASからの正当なリクエストか検証
    // ※事前にFirebaseの環境変数(またはSecret Manager)に 'gas_secret_key' を設定しておきます
    const expectedSecret =
      process.env.GAS_SECRET_KEY || functions.config().api.gas_secret;
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      res.status(401).send({ error: "Unauthorized: Invalid token" });
      return;
    }

    // 2. リクエストボディからメールアドレスを取得
    const email = req.body.email;
    if (!email || typeof email !== "string") {
      res.status(400).send({ error: "Bad Request: Email is required" });
      return;
    }

    try {
      // 3. メールアドレスからFirebase Authのユーザーを取得
      const userRecord = await admin.auth().getUserByEmail(email);
      const uid = userRecord.uid;

      // 4. Firestoreのデータ削除
      // ※ 注意: サブコレクションがある場合は再帰的な削除が必要です。
      // deleteMyAccount で使っている削除ロジック（または firebase-tools の delete 処理）をここで呼び出すのが確実です。
      await admin.firestore().collection("users").doc(uid).delete();

      // 5. Firebase Authからユーザーを削除
      await admin.auth().deleteUser(uid);

      console.log(`Successfully deleted user data for: ${email}`);
      res
        .status(200)
        .send({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user by email:", error);
      // ユーザーが見つからない場合などのエラーハンドリング
      if (error.code === "auth/user-not-found") {
        res.status(404).send({ error: "User not found" });
      } else {
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
