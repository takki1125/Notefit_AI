/** ホームタブで並べ替え可能なウィジェット ID（この順序がデフォルトになります） */
export const HOME_WIDGET_IDS = [
  "calendar",  // ★ 1番上：継続の証！
  "workout",   // ★ 2番目：今日のメインディッシュ
  "nutrition", // ★ 3番目：食事管理
  "ai",        // 4番目：AIの知恵
  "metrics",   // 5番目：日々の計測
  "goal",      // 6番目：最終目標
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

/** 保存済みの並び（非表示は配列に含めない）を復元。無効 ID は除外。 */
export function parseVisibleWidgetOrder(saved: string[] | null | undefined): HomeWidgetId[] {
  const seen = new Set<HomeWidgetId>();
  const result: HomeWidgetId[] = [];
  for (const id of saved ?? []) {
    // HOME_WIDGET_IDS を配列として扱うために type-cast
    if ((HOME_WIDGET_IDS as readonly string[]).includes(id) && !seen.has(id as HomeWidgetId)) {
      const w = id as HomeWidgetId;
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

export function defaultHomeWidgetOrder(): HomeWidgetId[] {
  // ここで HOME_WIDGET_IDS を返しているので、上の配列順がそのまま初期状態になる
  return [...HOME_WIDGET_IDS];
}

/** 現在ホームに表示していないウィジェット ID */
export function hiddenWidgetIds(visible: HomeWidgetId[]): HomeWidgetId[] {
  return HOME_WIDGET_IDS.filter((id) => !visible.includes(id));
}

export const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
  calendar: "カレンダー",
  workout: "トレーニング",
  nutrition: "栄養",
  ai: "AIアドバイス",
  metrics: "今日の体重",
  goal: "目標の進捗",
};