/**
 * purchasePackage / restorePurchases の失敗理由をユーザー向けに整形。
 */
export function interpretRevenueCatPurchaseError(e: unknown): {
  userCancelled: boolean;
  message: string;
} {
  const any = e as {
    userCancelled?: boolean;
    message?: string;
    underlyingErrorMessage?: string;
  };
  if (any.userCancelled === true) {
    return { userCancelled: true, message: "" };
  }
  const msg =
    (typeof any.message === "string" && any.message) ||
    (typeof any.underlyingErrorMessage === "string" && any.underlyingErrorMessage) ||
    "ストアとの通信に失敗しました。ネットワークを確認してから再度お試しください。";
  return { userCancelled: false, message: msg };
}
