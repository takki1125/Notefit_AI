import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { auth } from "../firebaseConfig";
import { requestTestAccountCoins } from "../utils/coinBalance";
import { isTestAccountEmail } from "../utils/testAccounts";

export function useTestAccountCoinGrant() {
  const [busy, setBusy] = useState(false);
  const enabled = isTestAccountEmail(auth.currentUser?.email);

  const addCoins = useCallback(async () => {
    if (!enabled || busy) return;
    setBusy(true);
    try {
      await requestTestAccountCoins();
    } catch {
      Alert.alert(
        "付与失敗",
        "テスト用コインを追加できませんでした。grantTestAccountCoins をデプロイ済みか確認してください。",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, enabled]);

  return { enabled, busy, addCoins };
}
