import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../firebaseConfig";
import { subscribeUserCoinBalance } from "../utils/coinBalance";

/** ログイン中ユーザーの利用可能コイン残高（未ログインは null） */
export function useCoinBalance(): number | null {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let unsubscribeCoins: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeCoins?.();
      unsubscribeCoins = undefined;
      if (!user) {
        setBalance(null);
        return;
      }
      unsubscribeCoins = subscribeUserCoinBalance(user.uid, setBalance);
    });
    return () => {
      unsubscribeAuth();
      unsubscribeCoins?.();
    };
  }, []);

  return balance;
}
