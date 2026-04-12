import AsyncStorage from "@react-native-async-storage/async-storage";

/** 旧バージョンの端末グローバル既読フラグ */
export const TUTORIAL_HOME_LEGACY_KEY = "@tutorial_home";

export function tutorialHomeKeyForUser(uid: string) {
  return `@tutorial_home_${uid}`;
}

export async function hasSeenHomeTutorial(uid: string) {
  const [legacy, perUser] = await Promise.all([
    AsyncStorage.getItem(TUTORIAL_HOME_LEGACY_KEY),
    AsyncStorage.getItem(tutorialHomeKeyForUser(uid)),
  ]);
  return legacy === "true" || perUser === "true";
}

export async function clearHomeTutorialSeen(uid: string) {
  await AsyncStorage.multiRemove([TUTORIAL_HOME_LEGACY_KEY, tutorialHomeKeyForUser(uid)]);
}

/** チュートリアル完了時に呼ぶ（uid 単位の既読のみ。legacy は触らない＝マルチアカウントで共有しない） */
export async function markHomeTutorialSeen(uid: string) {
  await AsyncStorage.setItem(tutorialHomeKeyForUser(uid), "true");
}

/**
 * 設定から「再表示」を選んだあと、ホームで Copilot を開始するまでの保留フラグ（値は uid）
 */
export const TUTORIAL_REPLAY_PENDING_KEY = "@tutorial_replay_home_pending";
