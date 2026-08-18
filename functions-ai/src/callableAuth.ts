import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

type RequireAuthOptions = {
  /** 未確認メールでも通す（アカウント削除など） */
  emailVerified?: boolean;
};

export function requireAuth(
  request: CallableRequest,
  opts: RequireAuthOptions = {},
): { uid: string } {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }
  if (opts.emailVerified !== false && request.auth.token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "メールアドレスの確認が必要です。");
  }
  return { uid: request.auth.uid };
}
