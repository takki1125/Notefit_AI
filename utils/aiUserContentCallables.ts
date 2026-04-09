import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

import { auth } from "../firebaseConfig";

function aiFunctions() {
  return getFunctions(getApp(), "asia-northeast1");
}

const CALLABLE_NAME_CANDIDATES = (base: string) =>
  [base, `ai-${base}`, `ai_${base}`, `default-${base}`] as const;

async function invokeAiCallable<T, R>(baseName: string, data: T): Promise<R> {
  const user = auth.currentUser;
  if (!user) throw new Error("ログインが必要です");

  const fns = aiFunctions();
  let lastErr: unknown;

  for (const name of CALLABLE_NAME_CANDIDATES(baseName)) {
    try {
      const fn = httpsCallable<T, R>(fns, name);
      const res = await fn(data);
      return res.data;
    } catch (e) {
      lastErr = e;
      const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
      if (code === "functions/not-found") {
        continue;
      }
      throw e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Callable の呼び出しに失敗しました。");
}

export async function callableCreateCustomExercise(name: string, categoryLabel: string): Promise<{ id: string }> {
  return invokeAiCallable("createCustomExercise", { name, categoryLabel });
}

export async function callableDeleteCustomExercise(exerciseId: string): Promise<void> {
  await invokeAiCallable("deleteCustomExercise", { exerciseId });
}

export async function callableCreateMealRoutine(
  name: string,
  meals: Array<{ name: string; cal: number; pro: number; fat: number; carb: number }>,
): Promise<{ id: string }> {
  return invokeAiCallable("createMealRoutine", { name, meals });
}

export async function callableDeleteMealRoutine(routineId: string): Promise<void> {
  await invokeAiCallable("deleteMealRoutine", { routineId });
}
