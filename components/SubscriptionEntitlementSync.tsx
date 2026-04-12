import { useSubscriptionEntitlements } from "../hooks/useSubscriptionEntitlements";

/** ルートに置き、Entitlement 変化でバナー／インタースティシャル抑制を同期 */
export function SubscriptionEntitlementSync() {
  useSubscriptionEntitlements();
  return null;
}
