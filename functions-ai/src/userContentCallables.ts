import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { isPremiumSubscriptionActive } from "./subscriptionMirror";
import { requireAuth } from "./callableAuth";

const db = admin.firestore();

const publicCallableOpts = {
  region: "asia-northeast1" as const,
  cors: true,
  invoker: "public" as const,
};

const FREE_CUSTOM_EXERCISES = 5;
const FREE_MEAL_ROUTINES = 3;

type NormalizedMealItem = { name: string; cal: number; pro: number; fat: number; carb: number };

function normalizeMealsPayload(raw: unknown): NormalizedMealItem[] {
  if (!Array.isArray(raw)) {
    throw new HttpsError("invalid-argument", "meals は配列である必要があります。");
  }
  if (raw.length === 0 || raw.length > 40) {
    throw new HttpsError("invalid-argument", "ルーティーンの品目数が不正です。");
  }
  const out: NormalizedMealItem[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") {
      throw new HttpsError("invalid-argument", "食事データの形式が不正です。");
    }
    const o = m as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.replace(/\0/g, "").trim().slice(0, 120) : "";
    if (!name) {
      throw new HttpsError("invalid-argument", "料理名が空です。");
    }
    const cal = Math.max(0, Math.min(20000, Math.floor(Number(o.cal) || 0)));
    const pro = Math.max(0, Math.min(2000, Math.floor(Number(o.pro) || 0)));
    const fat = Math.max(0, Math.min(2000, Math.floor(Number(o.fat) || 0)));
    const carb = Math.max(0, Math.min(2000, Math.floor(Number(o.carb) || 0)));
    out.push({ name, cal, pro, fat, carb });
  }
  return out;
}

/** マイ種目追加（無料は最大 5、プレミアムは実質無制限） */
export const createCustomExercise = onCall(publicCallableOpts, async (request) => {
  const { uid } = requireAuth(request);
  const name =
    typeof request.data?.name === "string" ? request.data.name.replace(/\0/g, "").trim().slice(0, 80) : "";
  const categoryLabel =
    typeof request.data?.categoryLabel === "string"
      ? request.data.categoryLabel.replace(/\0/g, "").trim().slice(0, 80)
      : "";

  if (!name) {
    throw new HttpsError("invalid-argument", "種目名を入力してください。");
  }
  if (!categoryLabel) {
    throw new HttpsError("invalid-argument", "カテゴリが不正です。");
  }

  const col = db.collection("users").doc(uid).collection("custom_exercises");
  const premium = await isPremiumSubscriptionActive(uid);
  if (!premium) {
    const agg = await col.count().get();
    const n = agg.data().count;
    if (n >= FREE_CUSTOM_EXERCISES) {
      throw new HttpsError(
        "resource-exhausted",
        `無料プランではマイ種目は最大${FREE_CUSTOM_EXERCISES}件までです。プレミアムで無制限にできます。`,
      );
    }
  }

  const ref = await col.add({
    name,
    categoryLabel,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});

/** マイ種目の名前・カテゴリ変更（書き込みは Functions のみ） */
export const updateCustomExercise = onCall(publicCallableOpts, async (request) => {
  const { uid } = requireAuth(request);
  const exerciseId =
    typeof request.data?.exerciseId === "string" ? request.data.exerciseId.trim() : "";
  const name =
    typeof request.data?.name === "string" ? request.data.name.replace(/\0/g, "").trim().slice(0, 80) : "";
  const categoryLabel =
    typeof request.data?.categoryLabel === "string"
      ? request.data.categoryLabel.replace(/\0/g, "").trim().slice(0, 80)
      : "";

  if (!exerciseId) {
    throw new HttpsError("invalid-argument", "exerciseId が必要です。");
  }
  if (!name) {
    throw new HttpsError("invalid-argument", "種目名を入力してください。");
  }
  if (!categoryLabel) {
    throw new HttpsError("invalid-argument", "カテゴリが不正です。");
  }

  const ref = db.collection("users").doc(uid).collection("custom_exercises").doc(exerciseId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "種目が見つかりません。");
  }
  await ref.update({
    name,
    categoryLabel,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const };
});

export const deleteCustomExercise = onCall(publicCallableOpts, async (request) => {
  const { uid } = requireAuth(request);
  const exerciseId =
    typeof request.data?.exerciseId === "string" ? request.data.exerciseId.trim() : "";
  if (!exerciseId) {
    throw new HttpsError("invalid-argument", "exerciseId が必要です。");
  }
  const ref = db.collection("users").doc(uid).collection("custom_exercises").doc(exerciseId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "種目が見つかりません。");
  }
  await ref.delete();
  return { ok: true as const };
});

/** 食事ルーティーン作成（無料は 3 件まで、プレミアムは実質無制限） */
export const createMealRoutine = onCall(publicCallableOpts, async (request) => {
  const { uid } = requireAuth(request);
  const name =
    typeof request.data?.name === "string" ? request.data.name.replace(/\0/g, "").trim().slice(0, 80) : "";
  if (!name) {
    throw new HttpsError("invalid-argument", "ルーティーン名を入力してください。");
  }
  const meals = normalizeMealsPayload(request.data?.meals);

  const col = db.collection("users").doc(uid).collection("meal_routines");
  const premium = await isPremiumSubscriptionActive(uid);
  if (!premium) {
    const agg = await col.count().get();
    if (agg.data().count >= FREE_MEAL_ROUTINES) {
      throw new HttpsError(
        "resource-exhausted",
        `無料プランでは食事ルーティーンは最大${FREE_MEAL_ROUTINES}件までです。プレミアムで追加できます。`,
      );
    }
  }

  const ref = await col.add({
    name,
    meals,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});

export const deleteMealRoutine = onCall(publicCallableOpts, async (request) => {
  const { uid } = requireAuth(request);
  const routineId = typeof request.data?.routineId === "string" ? request.data.routineId.trim() : "";
  if (!routineId) {
    throw new HttpsError("invalid-argument", "routineId が必要です。");
  }
  const ref = db.collection("users").doc(uid).collection("meal_routines").doc(routineId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "ルーティーンが見つかりません。");
  }
  await ref.delete();
  return { ok: true as const };
});
