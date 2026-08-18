import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { grantMissionRewardInTransaction } from "./coins";
import { requireAuth } from "./callableAuth";
import { isPremiumSubscriptionActive } from "./subscriptionMirror";

const TZ = "Asia/Tokyo";

const publicCallableOpts = {
  region: "asia-northeast1" as const,
  cors: true,
  invoker: "public" as const,
};

function tokyoYmd(ref: Date = new Date()): string {
  const z = toZonedTime(ref, TZ);
  return format(z, "yyyy-MM-dd");
}

function weekRangeTokyo(ref: Date = new Date()): { start: string; end: string } {
  const z = toZonedTime(ref, TZ);
  const mon = startOfWeek(z, { weekStartsOn: 1 });
  const sun = endOfWeek(z, { weekStartsOn: 1 });
  return { start: format(mon, "yyyy-MM-dd"), end: format(sun, "yyyy-MM-dd") };
}

function workoutTokyoYmd(data: admin.firestore.DocumentData): string | null {
  const ts = data.date;
  if (ts && typeof ts.toDate === "function") {
    return tokyoYmd(ts.toDate());
  }
  if (typeof data.dateObj === "string") {
    const d = new Date(data.dateObj);
    if (!Number.isNaN(d.getTime())) {
      return tokyoYmd(d);
    }
  }
  return null;
}

async function countWorkoutsTokyoDay(uid: string, ymd: string): Promise<number> {
  const db = admin.firestore();
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("workouts")
    .orderBy("date", "desc")
    .limit(150)
    .get();
  let n = 0;
  for (const doc of snap.docs) {
    const y = workoutTokyoYmd(doc.data());
    if (y === ymd) n++;
  }
  return n;
}

async function countWorkoutsTokyoWeek(uid: string, start: string, end: string): Promise<number> {
  const db = admin.firestore();
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("workouts")
    .orderBy("date", "desc")
    .limit(200)
    .get();
  let n = 0;
  for (const doc of snap.docs) {
    const y = workoutTokyoYmd(doc.data());
    if (y != null && y >= start && y <= end) n++;
  }
  return n;
}

async function hasWeightTokyoDay(uid: string, ymd: string): Promise<boolean> {
  const db = admin.firestore();
  const direct = await db.collection("users").doc(uid).collection("daily_metrics").doc(ymd).get();
  if (direct.exists) {
    const w = direct.data()?.weight;
    if (typeof w === "number" && Number.isFinite(w)) return true;
  }
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("daily_metrics")
    .orderBy("date", "desc")
    .limit(25)
    .get();
  for (const d of snap.docs) {
    const data = d.data();
    const dt = typeof data.date === "string" ? data.date : d.id;
    if (dt === ymd && typeof data.weight === "number" && Number.isFinite(data.weight)) {
      return true;
    }
  }
  return false;
}

async function countDistinctWeightDaysTokyoWeek(uid: string, start: string, end: string): Promise<number> {
  const db = admin.firestore();
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("daily_metrics")
    .orderBy("date", "desc")
    .limit(80)
    .get();
  const days = new Set<string>();
  for (const d of snap.docs) {
    const data = d.data();
    const dt = typeof data.date === "string" ? data.date : d.id;
    if (typeof dt === "string" && dt >= start && dt <= end) {
      if (typeof data.weight === "number" && Number.isFinite(data.weight)) {
        days.add(dt);
      }
    }
  }
  return days.size;
}

/** その日の食事「件数」（food_logs は 1 日 1 ドキュメントに meals が乗る想定） */
async function countFoodItemsTokyoDay(uid: string, ymd: string): Promise<number> {
  const db = admin.firestore();
  let snap: admin.firestore.QuerySnapshot;
  try {
    snap = await db.collection("users").doc(uid).collection("food_logs").orderBy("date", "desc").limit(40).get();
  } catch (e) {
    logger.warn("countFoodItemsTokyoDay: orderBy date failed, fallback scan", e);
    snap = await db.collection("users").doc(uid).collection("food_logs").limit(40).get();
  }
  for (const doc of snap.docs) {
    const data = doc.data();
    const ts = data.date;
    if (ts && typeof ts.toDate === "function") {
      if (tokyoYmd(ts.toDate()) === ymd) {
        const meals = data.meals;
        return Array.isArray(meals) ? meals.length : 0;
      }
    }
  }
  return 0;
}

type MissionVerify =
  | "workout_today_gte_1"
  | "weight_today"
  | "food_today_gte_1"
  | "workout_today_gte_2"
  | "food_today_gte_3"
  | "workout_week_gte_3"
  | "weight_week_distinct_gte_3";

type MissionDef = {
  id: string;
  title: string;
  reward: number;
  bucket: "daily" | "weekly";
  requiresPremium: boolean;
  verify: MissionVerify;
};

const MISSIONS: MissionDef[] = [
  {
    id: "dm_workout_1",
    title: "ワークアウトを1回記録",
    reward: 15,
    bucket: "daily",
    requiresPremium: false,
    verify: "workout_today_gte_1",
  },
  {
    id: "dm_weight_1",
    title: "体重を記録",
    reward: 10,
    bucket: "daily",
    requiresPremium: false,
    verify: "weight_today",
  },
  {
    id: "dm_food_1",
    title: "食事を1件記録",
    reward: 10,
    bucket: "daily",
    requiresPremium: false,
    verify: "food_today_gte_1",
  },
  {
    id: "dm_workout_2",
    title: "ワークアウトを2回記録",
    reward: 20,
    bucket: "daily",
    requiresPremium: true,
    verify: "workout_today_gte_2",
  },
  {
    id: "dm_food_3",
    title: "食事を3件記録",
    reward: 15,
    bucket: "daily",
    requiresPremium: true,
    verify: "food_today_gte_3",
  },
  {
    id: "wm_workouts_3",
    title: "今週ワークアウトを3回",
    reward: 25,
    bucket: "weekly",
    requiresPremium: false,
    verify: "workout_week_gte_3",
  },
  {
    id: "wm_weight_3d",
    title: "今週3日以上で体重記録",
    reward: 20,
    bucket: "weekly",
    requiresPremium: false,
    verify: "weight_week_distinct_gte_3",
  },
];

function stableMissionDocId(bucket: "daily" | "weekly", periodKey: string, missionId: string): string {
  const raw = `mission_${bucket}_${periodKey}_${missionId}`;
  return raw.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 450);
}

async function evaluateMission(
  uid: string,
  m: MissionDef,
  today: string,
  week: { start: string; end: string },
): Promise<{ met: boolean; progressLabel: string }> {
  switch (m.verify) {
    case "workout_today_gte_1": {
      const c = await countWorkoutsTokyoDay(uid, today);
      return { met: c >= 1, progressLabel: `${Math.min(c, 1)}/1` };
    }
    case "workout_today_gte_2": {
      const c = await countWorkoutsTokyoDay(uid, today);
      return { met: c >= 2, progressLabel: `${Math.min(c, 2)}/2` };
    }
    case "weight_today": {
      const ok = await hasWeightTokyoDay(uid, today);
      return { met: ok, progressLabel: ok ? "1/1" : "0/1" };
    }
    case "food_today_gte_1": {
      const c = await countFoodItemsTokyoDay(uid, today);
      return { met: c >= 1, progressLabel: `${Math.min(c, 1)}/1` };
    }
    case "food_today_gte_3": {
      const c = await countFoodItemsTokyoDay(uid, today);
      return { met: c >= 3, progressLabel: `${Math.min(c, 3)}/3` };
    }
    case "workout_week_gte_3": {
      const c = await countWorkoutsTokyoWeek(uid, week.start, week.end);
      return { met: c >= 3, progressLabel: `${Math.min(c, 3)}/3` };
    }
    case "weight_week_distinct_gte_3": {
      const c = await countDistinctWeightDaysTokyoWeek(uid, week.start, week.end);
      return { met: c >= 3, progressLabel: `${Math.min(c, 3)}/3` };
    }
    default:
      return { met: false, progressLabel: "—" };
  }
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

export const getMissionsSnapshot = onCall(publicCallableOpts, async (request) => {
  const { uid } = requireAuth(request);
  const premium = await isPremiumSubscriptionActive(uid);
  const today = tokyoYmd();
  const week = weekRangeTokyo();
  const db = admin.firestore();

  const rows: MissionSnapshotRow[] = [];

  for (const m of MISSIONS) {
    if (m.requiresPremium && !premium) {
      continue;
    }
    const periodKey = m.bucket === "daily" ? today : week.start;
    const docId = stableMissionDocId(m.bucket, periodKey, m.id);
    const claimedSnap = await db.collection("users").doc(uid).collection("mission_events").doc(docId).get();
    const claimed = claimedSnap.exists;
    const evald = await evaluateMission(uid, m, today, week);
    const canClaim = !claimed && evald.met && (!m.requiresPremium || premium);
    rows.push({
      id: m.id,
      title: m.title,
      rewardCoins: m.reward,
      bucket: m.bucket,
      requiresPremium: m.requiresPremium,
      claimed,
      canClaim,
      progressLabel: evald.progressLabel,
    });
  }

  return {
    premium,
    tokyoToday: today,
    weekStart: week.start,
    weekEnd: week.end,
    missions: rows,
  };
});

export const claimMissionReward = onCall(publicCallableOpts, async (request) => {
  const { uid } = requireAuth(request);
  const missionId = typeof request.data?.missionId === "string" ? request.data.missionId.trim() : "";
  const bucket = request.data?.bucket === "weekly" ? "weekly" : "daily";
  if (!missionId) {
    throw new HttpsError("invalid-argument", "missionId が必要です。");
  }

  const def = MISSIONS.find((m) => m.id === missionId && m.bucket === bucket);
  if (!def) {
    throw new HttpsError("not-found", "ミッションが見つかりません。");
  }

  const premium = await isPremiumSubscriptionActive(uid);
  if (def.requiresPremium && !premium) {
    throw new HttpsError("permission-denied", "このミッションはプレミアム専用です。");
  }

  const today = tokyoYmd();
  const week = weekRangeTokyo();
  const periodKey = bucket === "daily" ? today : week.start;

  const evald = await evaluateMission(uid, def, today, week);
  if (!evald.met) {
    throw new HttpsError("failed-precondition", "ミッション条件を達成していません。");
  }

  const docId = stableMissionDocId(bucket, periodKey, missionId);
  const res = await grantMissionRewardInTransaction(uid, docId, def.reward, {
    missionId,
    bucket,
    periodKey,
  });

  if (res.duplicate) {
    return { granted: false, duplicate: true, amount: def.reward };
  }
  return { granted: true, duplicate: false, amount: res.amount };
});
