import type { CustomerInfo } from "react-native-purchases";
import { useCallback, useEffect, useMemo, useState } from "react";

import { setSuppressNonRewardAds } from "../utils/adSuppression";
import {
  resolveSubscriptionFeatureFlags,
  type SubscriptionFeatureFlags,
} from "../utils/monetizationTypes";
import { ensureRevenueCatConfigured, getRevenueCatLibrary, isRevenueCatSupportedPlatform } from "../utils/revenueCat";

export type UseSubscriptionEntitlementsResult = {
  customerInfo: CustomerInfo | null;
  flags: SubscriptionFeatureFlags;
  loading: boolean;
  errorMessage: string | null;
  refreshCustomerInfo: () => Promise<void>;
  revenueCatReady: boolean;
};

/**
 * Entitlement の変化を監視し、広告非表示・追加種目などの UI フラグを返す。
 */
export function useSubscriptionEntitlements(): UseSubscriptionEntitlementsResult {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const revenueCatReady = isRevenueCatSupportedPlatform() && ensureRevenueCatConfigured();

  const refreshCustomerInfo = useCallback(async () => {
    const lib = getRevenueCatLibrary();
    if (!lib || !revenueCatReady) {
      setCustomerInfo(null);
      setLoading(false);
      return;
    }
    try {
      const info = await lib.default.getCustomerInfo();
      setCustomerInfo(info);
      setErrorMessage(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "購読状態の取得に失敗しました。";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [revenueCatReady]);

  useEffect(() => {
    const lib = getRevenueCatLibrary();
    if (!lib || !revenueCatReady) {
      setLoading(false);
      setCustomerInfo(null);
      return;
    }

    const Purchases = lib.default;
    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      setErrorMessage(null);
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    void refreshCustomerInfo();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [revenueCatReady, refreshCustomerInfo]);

  const flags = useMemo(() => {
    const active = customerInfo ? new Set(Object.keys(customerInfo.entitlements.active)) : new Set<string>();
    return resolveSubscriptionFeatureFlags(active);
  }, [customerInfo]);

  useEffect(() => {
    setSuppressNonRewardAds(flags.hideAds);
  }, [flags.hideAds]);

  return {
    customerInfo,
    flags,
    loading,
    errorMessage,
    refreshCustomerInfo,
    revenueCatReady,
  };
}
