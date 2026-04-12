import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

import { auth } from "../firebaseConfig";

function aiFunctions() {
  return getFunctions(getApp(), "asia-northeast1");
}

const NAME_CANDIDATES = (base: string) =>
  [base, `ai-${base}`, `ai_${base}`, `default-${base}`] as const;

async function invokeCallable<T, R>(baseName: string, data: T): Promise<R> {
  if (!auth.currentUser) {
    throw new Error("ログインが必要です");
  }
  const fns = aiFunctions();
  let lastErr: unknown;
  for (const name of NAME_CANDIDATES(baseName)) {
    try {
      const fn = httpsCallable<T, R>(fns, name);
      const res = await fn(data);
      return res.data;
    } catch (e) {
      lastErr = e;
      const code =
        typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
      if (code === "functions/not-found") {
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Callable の呼び出しに失敗しました。");
}

export type MissionSnapshotRow = {
  id: string;
  title: string;
  rewardCoins: number;
  bucket: "daily" | "weekly";
  requiresPremium: boolean;
  claimed: boolean;
  canClaim: boolean;
  progressLabel: string;
};

export type MissionsSnapshotResponse = {
  premium: boolean;
  tokyoToday: string;
  weekStart: string;
  weekEnd: string;
  missions: MissionSnapshotRow[];
};

export async function fetchMissionsSnapshot(): Promise<MissionsSnapshotResponse> {
  return invokeCallable<object, MissionsSnapshotResponse>("getMissionsSnapshot", {});
}

export async function claimMissionReward(
  missionId: string,
  bucket: "daily" | "weekly",
): Promise<{ granted: boolean; duplicate?: boolean; amount?: number }> {
  return invokeCallable("claimMissionReward", { missionId, bucket });
}
