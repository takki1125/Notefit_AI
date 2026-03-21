import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  HOME_WIDGET_IDS,
  type HomeWidgetId,
  defaultHomeWidgetOrder,
  parseVisibleWidgetOrder,
} from "../constants/homeWidgets";

const storageKey = (uid: string) => `@home_widget_order_${uid}`;

function loadOrderFromStorage(raw: string | null): HomeWidgetId[] {
  if (!raw) return defaultHomeWidgetOrder();
  try {
    const parsed = JSON.parse(raw) as unknown;
    const arr = Array.isArray(parsed) ? (parsed as string[]) : null;
    const visible = parseVisibleWidgetOrder(arr);
    return visible.length > 0 ? visible : defaultHomeWidgetOrder();
  } catch {
    return defaultHomeWidgetOrder();
  }
}

export function useHomeWidgetOrder(uid: string | undefined) {
  const [order, setOrder] = useState<HomeWidgetId[]>(() => defaultHomeWidgetOrder());
  const [hydrated, setHydrated] = useState(!uid);

  useEffect(() => {
    if (!uid) {
      setOrder(defaultHomeWidgetOrder());
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(uid));
        if (!cancelled) {
          setOrder(loadOrderFromStorage(raw));
        }
      } catch {
        if (!cancelled) setOrder(defaultHomeWidgetOrder());
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const persistOrder = useCallback(
    async (next: HomeWidgetId[]) => {
      setOrder(next);
      if (!uid) return;
      try {
        await AsyncStorage.setItem(storageKey(uid), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [uid],
  );

  const addWidget = useCallback(
    (id: HomeWidgetId) => {
      setOrder((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        if (uid) {
          void AsyncStorage.setItem(storageKey(uid), JSON.stringify(next)).catch(() => {});
        }
        return next;
      });
    },
    [uid],
  );

  return { order, persistOrder, addWidget, hydrated };
}
