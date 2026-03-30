import { getApp } from "firebase/app";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  Timestamp,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebaseConfig";
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
