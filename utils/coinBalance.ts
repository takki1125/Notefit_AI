import { getApp } from "firebase/app";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  Timestamp,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable, httpsCallableFromURL } from "firebase/functions";
import { db } from "../firebaseConfig";
import {
  getGrantRewardCallableOverrideUrl,
  GRANT_REWARD_CALLABLE_NAME_CANDIDATES,
} from "./grantRewardCallableConfig";
import { USER_SUBCOLLECTIONS } from "./monetizationTypes";

/** Cloud Functions と同じ基準で利用可能コインを合算 */
export function computeSpendableCoinBalance(docs: QueryDocumentSnapshot[]): number {
  const now = Timestamp.now();
  let sum = 0;
  for (const d of docs) {
    const data = d.data();
    const amt = Number(data.amount);
    if (!Number.isFinite(amt)) continue;
    if (amt < 0) {
      sum += amt;
      continue;
    }
    const exp = data.expires_at;
    if (!exp || !(exp instanceof Timestamp)) continue;
    if (exp.toMillis() <= now.toMillis()) continue;
    sum += amt;
  }
  return Math.floor(sum);
}

export function subscribeUserCoinBalance(
  uid: string,
  onBalance: (n: number) => void,
): () => void {
  const col = collection(db, "users", uid, USER_SUBCOLLECTIONS.coinTransactions);
  return onSnapshot(
    col,
    (snap) => onBalance(computeSpendableCoinBalance(snap.docs)),
    () => onBalance(0),
  );
}

export async function fetchUserCoinBalance(uid: string): Promise<number> {
  const col = collection(db, "users", uid, USER_SUBCOLLECTIONS.coinTransactions);
  const snap = await getDocs(col);
  return computeSpendableCoinBalance(snap.docs);
}

export type RegistrationBonusResult = { granted: boolean; amount?: number };

export async function requestRegistrationBonus(): Promise<RegistrationBonusResult> {
  const fn = httpsCallable(getFunctions(getApp(), "asia-northeast1"), "grantRegistrationBonus");
  const res = await fn({});
  return res.data as RegistrationBonusResult;
}

export type GrantRewardAdResult = { granted: boolean; amount?: number };

function isFunctionsNotFound(e: unknown): boolean {
  return typeof (e as { code?: string })?.code === "string" && (e as { code: string }).code === "functions/not-found";
}

export async function requestGrantRewardAdCoins(): Promise<GrantRewardAdResult> {
  const region = getFunctions(getApp(), "asia-northeast1");
  const overrideUrl = getGrantRewardCallableOverrideUrl();
  if (overrideUrl) {
    const fn = httpsCallableFromURL(region, overrideUrl);
    const res = await fn({});
    return res.data as GrantRewardAdResult;
  }

  let lastError: unknown;
  for (const name of GRANT_REWARD_CALLABLE_NAME_CANDIDATES) {
    try {
      const fn = httpsCallable(region, name);
      const res = await fn({});
      return res.data as GrantRewardAdResult;
    } catch (e) {
      lastError = e;
      if (isFunctionsNotFound(e)) continue;
      throw e;
    }
  }
  throw lastError;
}
