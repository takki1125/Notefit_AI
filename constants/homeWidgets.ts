/** ホームタブで並べ替え可能なウィジェット ID（順序はユーザー保存） */
export const HOME_WIDGET_IDS = [
  "metrics",
  "goal",
  "ai",
  "calendar",
  "workout",
  "nutrition",
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

/** 保存済みの並び（非表示は配列に含めない）を復元。無効 ID は除外。 */
export function parseVisibleWidgetOrder(saved: string[] | null | undefined): HomeWidgetId[] {
  const seen = new Set<HomeWidgetId>();
  const result: HomeWidgetId[] = [];
  for (const id of saved ?? []) {
    if (HOME_WIDGET_IDS.includes(id as HomeWidgetId) && !seen.has(id as HomeWidgetId)) {
      const w = id as HomeWidgetId;
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

export function defaultHomeWidgetOrder(): HomeWidgetId[] {
  return [...HOME_WIDGET_IDS];
}

/** 現在ホームに表示していないウィジェット ID */
export function hiddenWidgetIds(visible: HomeWidgetId[]): HomeWidgetId[] {
  return HOME_WIDGET_IDS.filter((id) => !visible.includes(id));
}

export const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
  metrics: "今日の体重",
  goal: "目標の進捗",
  ai: "AIアドバイス",
  calendar: "カレンダー",
  workout: "トレーニング",
  nutrition: "栄養",
};
