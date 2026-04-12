import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ChevronLeft, Menu, Pin, Plus, Send, Sparkles } from "lucide-react-native";

// ★ 追加：Copilotのインポート
import { CopilotProvider, CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";

import { auth } from "../../firebaseConfig";
import { useCoinBalance } from "../../hooks/useCoinBalance";
import { styles as themeStyles } from "../../theme/styles";
import { fetchAdviceNutrition, fetchAdviceWorkouts } from "../../utils/adviceContext";
import { calcAgeYearsFromBirthDate } from "../../utils/demographics";
import { formatDateId, getDailyMetric, getDailyMetricsLastNDays } from "../../utils/firestoreDailyMetrics";
import { getAiCoachSettings, getUserDemographics, getUserProfile } from "../../utils/firestoreProfile";
import type { AiCoachSettings } from "../../utils/models";
import { DISPLAY_FALLBACK_AI_CHAT_COIN_COST } from "../../utils/monetizationTypes";

const STORAGE_KEY_BASE = "@ai_chats_v1_";
const MAX_SESSIONS = 40;
const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.88, 360);

// ★ 追加：光らせるためのラップコンポーネント
const WalkthroughableView = walkthroughable(View);

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  pinned?: boolean;
  userEditedTitle?: boolean;
};

function newSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "新しい会話";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 22 ? `${t.slice(0, 22)}…` : t;
}

function trimSessionsForStorage(sessions: ChatSession[]): ChatSession[] {
  if (sessions.length <= MAX_SESSIONS) return sessions;
  let next = [...sessions];
  while (next.length > MAX_SESSIONS) {
    const unpinned = next.filter((s) => !s.pinned).sort((a, b) => a.updatedAt - b.updatedAt);
    if (unpinned.length > 0) {
      const victim = unpinned[0];
      next = next.filter((s) => s.id !== victim.id);
    } else {
      next = [...next].sort((a, b) => a.updatedAt - b.updatedAt).slice(1);
    }
  }
  return next;
}

function formatRelativeTime(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}日前`;
  return new Date(ts).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

// ★ 変更：メインの関数名を AiAdviceTabContent に変更
function AiAdviceTabContent() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [coach, setCoach] = useState<AiCoachSettings | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const coinBalance = useCoinBalance();

  // ★ 追加：Copilotのフック
  const { start, copilotEvents } = useCopilot();

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );
  const messages = activeSession?.messages ?? [];

  const orderedForDrawer = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [sessions]);

  // ★ 追加：チュートリアル発火ロジック（0.5秒後に1回だけ）
  useEffect(() => {
    if (!hydrated) return;
    const user = auth.currentUser;
    if (!user) return;

    let cancelled = false;
    const checkTutorial = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem(`@tutorial_ai_${user.uid}`);
        if (!hasSeen && !cancelled) {
          setTimeout(() => {
            if (!cancelled) void start();
          }, 500);
        }
      } catch (e) {}
    };
    checkTutorial();

    return () => { cancelled = true; };
  }, [hydrated, start]);

  // ★ 追加：チュートリアル完了時にフラグを保存
  useEffect(() => {
    const onStop = async () => {
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.setItem(`@tutorial_ai_${user.uid}`, "true");
      }
    };
    copilotEvents.on("stop", onStop);
    return () => {
      copilotEvents.off("stop", onStop);
    };
  }, [copilotEvents]);

  const closeDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDrawerOpen(false);
    });
  }, [slideAnim]);

  const openDrawer = useCallback(() => {
    Keyboard.dismiss();
    slideAnim.setValue(-DRAWER_WIDTH);
    setDrawerOpen(true);
    requestAnimationFrame(() => {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 65,
      }).start();
    });
  }, [slideAnim]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const c = await getAiCoachSettings(user.uid);
        if (!cancelled) setCoach(c);
      } catch {
        if (!cancelled) setCoach(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        setHydrated(true);
        return;
      }
      const key = `${STORAGE_KEY_BASE}${user.uid}`;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned: ChatSession[] = parsed
              .filter(
                (x): x is ChatSession =>
                  !!x &&
                  typeof (x as ChatSession).id === "string" &&
                  typeof (x as ChatSession).title === "string" &&
                  typeof (x as ChatSession).updatedAt === "number" &&
                  Array.isArray((x as ChatSession).messages),
              )
              .map((s) => ({
                id: s.id,
                title: s.title,
                updatedAt: s.updatedAt,
                pinned: !!(s as ChatSession).pinned,
                userEditedTitle: !!(s as ChatSession).userEditedTitle,
                messages: (s.messages || []).filter(
                  (m) =>
                    m &&
                    (m.role === "user" || m.role === "assistant") &&
                    typeof m.content === "string" &&
                    typeof m.id === "string",
                ),
              }));
            if (cleaned.length > 0) {
              setSessions(trimSessionsForStorage(cleaned));
              const pick = [...cleaned].sort((a, b) => {
                if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
                return b.updatedAt - a.updatedAt;
              })[0];
              setActiveId(pick.id);
              setHydrated(true);
              return;
            }
          }
        }
        const id = newSessionId();
        setSessions([{ id, title: "新しい会話", updatedAt: Date.now(), messages: [], pinned: false }]);
        setActiveId(id);
      } catch {
        const id = newSessionId();
        setSessions([{ id, title: "新しい会話", updatedAt: Date.now(), messages: [], pinned: false }]);
        setActiveId(id);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const user = auth.currentUser;
    if (!user) return;
    const key = `${STORAGE_KEY_BASE}${user.uid}`;
    void AsyncStorage.setItem(key, JSON.stringify(trimSessionsForStorage(sessions)));
  }, [sessions, hydrated]);

  const patchSessionById = useCallback((sessionId: string, fn: (prev: ChatSession) => ChatSession) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const next = fn(s);
        const title =
          next.userEditedTitle === true ? next.title : deriveTitle(next.messages);
        return {
          ...next,
          title,
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const createSession = useCallback(() => {
    const id = newSessionId();
    setSessions((prev) => {
      const next = [
        { id, title: "新しい会話", updatedAt: Date.now(), messages: [], pinned: false },
        ...prev,
      ];
      return trimSessionsForStorage(next);
    });
    setActiveId(id);
    setInput("");
    closeDrawer();
  }, [closeDrawer]);

  const selectSession = useCallback(
    (id: string) => {
      setActiveId(id);
      setInput("");
      closeDrawer();
    },
    [closeDrawer],
  );

  const deleteSessionById = useCallback(
    (sessionId: string) => {
      Alert.alert("会話を削除", "この会話とメッセージを削除します。", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            setSessions((prev) => {
              if (prev.length <= 1) {
                return prev.map((s) =>
                  s.id === sessionId
                    ? { ...s, messages: [], title: "新しい会話", userEditedTitle: false, updatedAt: Date.now() }
                    : s,
                );
              }
              const next = prev.filter((s) => s.id !== sessionId);
              const sorted = [...next].sort((a, b) => {
                if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
                return b.updatedAt - a.updatedAt;
              });
              const newId = sorted[0]?.id ?? null;
              Promise.resolve().then(() => setActiveId(newId));
              return next;
            });
            setInput("");
          },
        },
      ]);
    },
    [],
  );

  const togglePin = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, pinned: !s.pinned } : s)),
    );
  }, []);

  const openRename = useCallback((sessionId: string, currentTitle: string) => {
    setRenameSessionId(sessionId);
    setRenameDraft(currentTitle);
    setRenameVisible(true);
  }, []);

  const cancelRename = useCallback(() => {
    setRenameVisible(false);
    setRenameSessionId(null);
    setRenameDraft("");
  }, []);

  const commitRename = useCallback(() => {
    const id = renameSessionId;
    const t = renameDraft.trim();
    if (!id) {
      cancelRename();
      return;
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              title: t || "無題",
              userEditedTitle: true,
              updatedAt: Date.now(),
            }
          : s,
      ),
    );
    cancelRename();
  }, [renameDraft, renameSessionId, cancelRename]);

  const showSessionActions = useCallback(
    (s: ChatSession) => {
      const pinLabel = s.pinned ? "ピンを外す" : "ピン留め";
      const buttons: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [
        {
          text: pinLabel,
          onPress: () => togglePin(s.id),
        },
        {
          text: "名前を変更",
          onPress: () => openRename(s.id, s.title),
        },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteSessionById(s.id),
        },
        { text: "キャンセル", style: "cancel" },
      ];
      Alert.alert(s.title, undefined, buttons);
    },
    [deleteSessionById, openRename, togglePin],
  );

  const onSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !activeId) return;

    const user = auth.currentUser;
    if (!user) return;

    const sendSessionId = activeId;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const sessionSnapshot = sessions.find((s) => s.id === sendSessionId);
    const baseMessages = sessionSnapshot?.messages ?? [];
    const nextMessages = [...baseMessages, userMsg];

    patchSessionById(sendSessionId, (s) => ({
      ...s,
      messages: [...s.messages, userMsg],
    }));
    setInput("");
    setSending(true);

    try {
      const todayId = formatDateId(new Date());
      const [
        profile,
        demographics,
        todayMetric,
        nutrition,
        workoutBundle,
        recentMetrics,
        aiCoach,
      ] = await Promise.all([
        getUserProfile(user.uid),
        getUserDemographics(user.uid),
        getDailyMetric(user.uid, todayId),
        fetchAdviceNutrition(user.uid, todayId),
        fetchAdviceWorkouts(user.uid, todayId),
        getDailyMetricsLastNDays(user.uid, 7),
        coach ?? getAiCoachSettings(user.uid),
      ]);

      const ageYears = demographics.birthDate
        ? calcAgeYearsFromBirthDate(demographics.birthDate)
        : undefined;

      const recentPoints = recentMetrics.map((m) => ({
        dateId: m.date,
        weight: m.weight,
        ...(typeof m.bodyFatPercentage === "number" ? { bodyFatPercentage: m.bodyFatPercentage } : {}),
      }));

      const app = getApp();
      const functions = getFunctions(app, "asia-northeast1");
      const callable = httpsCallable(functions, "aiCoachChat");

      const res = await callable({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        coachStyle: aiCoach.coachStyle,
        tone: aiCoach.tone,
        customInstructions: aiCoach.customInstructions,
        demographics: {
          ...(typeof demographics.heightCm === "number" ? { heightCm: demographics.heightCm } : {}),
          ...(demographics.birthDate ? { birthDate: demographics.birthDate } : {}),
          ...(typeof ageYears === "number" ? { ageYears } : {}),
        },
        ...(profile
          ? {
              phase: profile.phase,
              targetWeight: profile.targetWeight,
              targetCal: profile.targetCal,
            }
          : {}),
        ...(todayMetric
          ? {
              today: {
                weight: todayMetric.weight,
                ...(typeof todayMetric.bodyFatPercentage === "number"
                  ? { bodyFatPercentage: todayMetric.bodyFatPercentage }
                  : {}),
              },
            }
          : {}),
        recentWeights: recentPoints,
        todayNutrition: {
          hasData: nutrition.hasData,
          totalCal: nutrition.totalCal,
          totalPro: nutrition.totalPro,
          totalFat: nutrition.totalFat,
          totalCarb: nutrition.totalCarb,
          mealNames: nutrition.mealNames,
        },
        recentWorkouts: workoutBundle.sessions.map((s) => ({
          dateId: s.dateId,
          routineName: s.routineName,
          durationMinutes: s.durationMinutes,
          isToday: s.isToday,
          exerciseLines: s.exerciseLines,
        })),
      });

      const data = res.data as { reply?: string };
      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (!reply) {
        throw new Error("応答が空でした。");
      }

      const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", content: reply };
      patchSessionById(sendSessionId, (s) => ({
        ...s,
        messages: [...s.messages, assistantMsg],
      }));
    } catch (e: any) {
      const code = typeof e?.code === "string" ? e.code : "";
      const rawMsg = typeof e?.message === "string" ? e.message : "送信に失敗しました。";
      patchSessionById(sendSessionId, (s) => ({
        ...s,
        messages: s.messages.filter((m) => m.id !== userMsg.id),
      }));
      setInput(trimmed);
      if (code === "functions/failed-precondition" && /コイン/.test(rawMsg)) {
        Alert.alert("コインが不足しています", rawMsg);
      } else {
        Alert.alert("エラー", rawMsg);
      }
    } finally {
      setSending(false);
    }
  }, [activeId, coach, input, patchSessionById, sending, sessions]);

  if (!hydrated) {
    return (
      <SafeAreaView style={[themeStyles.container, local.centered]} edges={["top"]}>
        <ActivityIndicator color="#2ecc71" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themeStyles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={local.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* ★ 追加：ここで全体をサンドイッチ */}
        <CopilotStep
          text="ここはAIコーチの相談部屋です！トレーニングメニューの作成や食事の悩みなど、何でも気軽に聞いてみましょう。"
          order={1}
          name="aiIntro"
        >
          <WalkthroughableView style={local.flex}>
            <View style={local.header}>
              <TouchableOpacity
                onPress={openDrawer}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="会話履歴を開く"
                style={local.headerIconBtn}
              >
                <Menu color="#fff" size={26} />
              </TouchableOpacity>
              <View style={local.headerCenter}>
                <Sparkles color="#4facfe" size={18} />
                <View style={local.headerTitleBlock}>
                  <Text style={local.headerTitle} numberOfLines={1}>
                    {activeSession?.title ?? "AIアドバイス"}
                  </Text>
                  {coinBalance !== null ? (
                    <Text style={local.headerCoinSub} numberOfLines={1}>
                      コイン {coinBalance}
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                onPress={createSession}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="新しい会話"
                style={local.headerIconBtn}
              >
                <Plus color="#2ecc71" size={26} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={local.scroll}
              contentContainerStyle={local.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              {messages.length === 0 ? (
                <View style={local.emptyWrap}>
                  <Text style={local.emptyTitle}>気になることを自由に相談</Text>
                  <Text style={local.emptyBody}>
                    1 回の送信で約 {DISPLAY_FALLBACK_AI_CHAT_COIN_COST} コインを消費します（サーバー設定）。残高は上部に表示されます。
                  </Text>
                  <Text style={local.emptyBody}>
                    左上のメニューから過去の会話を開けます。長押しでピン留め・名前変更・削除。履歴はこの端末に保存されます。
                  </Text>
                  <TouchableOpacity
                    style={local.emptyLink}
                    onPress={() => router.push("/settings/monetization")}
                    activeOpacity={0.85}
                  >
                    <Text style={local.emptyLinkText}>コイン・プラン・今後の機能を見る →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      local.bubbleWrap,
                      m.role === "user" ? local.bubbleWrapUser : local.bubbleWrapAssistant,
                    ]}
                  >
                    <View
                      style={[
                        local.bubble,
                        m.role === "user" ? local.bubbleUser : local.bubbleAssistant,
                      ]}
                    >
                      <Text style={m.role === "user" ? local.bubbleTextUser : local.bubbleTextAssistant}>
                        {m.content}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={local.inputRow}>
              <TextInput
                style={local.input}
                placeholder="メッセージを入力…"
                placeholderTextColor="#666"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={4000}
                editable={!sending}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[local.sendBtn, (!input.trim() || sending) && local.sendBtnDisabled]}
                onPress={onSend}
                disabled={!input.trim() || sending}
                accessibilityLabel="送信"
              >
                {sending ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Send color="#000" size={22} />
                )}
              </TouchableOpacity>
            </View>
          </WalkthroughableView>
        </CopilotStep>
      </KeyboardAvoidingView>

      <Modal visible={drawerOpen} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={local.drawerRoot}>
          <Pressable style={local.drawerBackdrop} onPress={closeDrawer} />
          <Animated.View style={[local.drawerPanel, { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] }]}>
            <SafeAreaView style={local.drawerSafe} edges={["top", "left"]}>
              <View style={local.drawerHeader}>
                <Text style={local.drawerHeaderTitle}>会話履歴</Text>
                <TouchableOpacity onPress={closeDrawer} hitSlop={12}>
                  <Text style={local.drawerClose}>閉じる</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={orderedForDrawer}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={local.drawerList}
                renderItem={({ item: s }) => {
                  const active = s.id === activeId;
                  return (
                    <TouchableOpacity
                      style={[local.drawerRow, active && local.drawerRowActive]}
                      onPress={() => selectSession(s.id)}
                      onLongPress={() => showSessionActions(s)}
                      delayLongPress={380}
                      activeOpacity={0.7}
                    >
                      {s.pinned ? (
                        <Pin color="#2ecc71" size={16} style={local.drawerPin} />
                      ) : (
                        <View style={local.drawerPinSpacer} />
                      )}
                      <View style={local.drawerRowText}>
                        <Text style={local.drawerRowTitle} numberOfLines={2}>
                          {s.title}
                        </Text>
                        <Text style={local.drawerRowSub}>{formatRelativeTime(s.updatedAt)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={local.drawerEmpty}>会話がありません</Text>
                }
              />
              <TouchableOpacity style={local.drawerNewChat} onPress={createSession} activeOpacity={0.8}>
                <Plus color="#000" size={20} />
                <Text style={local.drawerNewChatText}>新しい会話</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={renameVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={cancelRename}
      >
        <SafeAreaView style={local.renameScreen} edges={["top", "bottom"]}>
          <StatusBar style="light" />
          <KeyboardAvoidingView
            style={local.renameKb}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={local.renameTopBar}>
              <TouchableOpacity
                style={local.renameBackBtn}
                onPress={cancelRename}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="戻る"
              >
                <ChevronLeft color="#fff" size={26} />
                <Text style={local.renameBackLabel}>戻る</Text>
              </TouchableOpacity>
              <Text style={local.renameTopTitle} numberOfLines={1}>
                会話名を編集
              </Text>
              <View style={local.renameTopRightSpacer} />
            </View>

            <ScrollView
              style={local.renameScroll}
              contentContainerStyle={local.renameScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={local.renameLabel}>表示名</Text>
              <TextInput
                style={local.renameInput}
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder="この会話の名前"
                placeholderTextColor="#666"
                autoFocus
                maxLength={80}
                autoCorrect={false}
              />
              <Text style={local.renameHint}>履歴一覧に表示される名前です。</Text>
            </ScrollView>

            <View style={local.renameFooter}>
              <TouchableOpacity style={local.renameSaveWide} onPress={commitRename} activeOpacity={0.85}>
                <Text style={local.renameSaveWideText}>保存する</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ★ 追加：ファイルの一番下にエクスポート用プロバイダーを配置
export default function AiAdviceTabScreen() {
  return (
    <CopilotProvider
      stopOnOutsideClick={true}
      androidStatusBarVisible={true}
      // ★ マージン（margin）を追加して、画面端から少し離す
      tooltipStyle={{ 
        backgroundColor: "#ffffff", 
        borderRadius: 12,
        margin: 16 // ←これを追加（左右に16pxの余白ができる）
      }} 
      stepNumberComponent={() => null}
      labels={{ skip: "スキップ", previous: "前へ", next: "次へ", finish: "OK" }}
    >
      <AiAdviceTabContent />
    </CopilotProvider>
  );
}

const local = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    gap: 8,
  },
  headerIconBtn: { padding: 8, width: 44, alignItems: "center" },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  headerTitleBlock: { flex: 1, minWidth: 0, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "bold", flexShrink: 1 },
  headerCoinSub: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  emptyWrap: { paddingVertical: 24, paddingHorizontal: 8 },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  emptyBody: { color: "#999", fontSize: 14, lineHeight: 22, marginBottom: 12 },
  emptyLink: {
    marginTop: 8,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1c40f55",
  },
  emptyLinkText: { color: "#f1c40f", fontSize: 14, fontWeight: "700" },
  bubbleWrap: { marginBottom: 12, width: "100%" },
  bubbleWrapUser: { alignItems: "flex-end" },
  bubbleWrapAssistant: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { backgroundColor: "#2ecc71" },
  bubbleAssistant: { backgroundColor: "#333" },
  bubbleTextUser: { color: "#000", fontSize: 15, lineHeight: 22 },
  bubbleTextAssistant: { color: "#eee", fontSize: 15, lineHeight: 22 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
    backgroundColor: "#1a1a1a",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "#2a2a2a",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    color: "#fff",
    fontSize: 15,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2ecc71",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.45 },
  drawerRoot: { flex: 1, flexDirection: "row" },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 1,
  },
  drawerPanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: "#1e1e1e",
    borderRightWidth: 1,
    borderRightColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerSafe: { flex: 1 },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  drawerHeaderTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  drawerClose: { color: "#4facfe", fontSize: 16 },
  drawerList: { paddingVertical: 8, paddingBottom: 88 },
  drawerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
    gap: 8,
  },
  drawerRowActive: { backgroundColor: "#2a3d32" },
  drawerPin: { marginTop: 3 },
  drawerPinSpacer: { width: 16 },
  drawerRowText: { flex: 1, minWidth: 0 },
  drawerRowTitle: { color: "#eee", fontSize: 15, fontWeight: "600", lineHeight: 20 },
  drawerRowSub: { color: "#777", fontSize: 12, marginTop: 4 },
  drawerEmpty: { color: "#666", textAlign: "center", padding: 24 },
  drawerNewChat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: "#2ecc71",
    borderRadius: 12,
  },
  drawerNewChatText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  renameScreen: { flex: 1, backgroundColor: "#1a1a1a" },
  renameKb: { flex: 1 },
  renameTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#1a1a1a",
  },
  renameBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    minWidth: 92,
    gap: 2,
  },
  renameBackLabel: { color: "#4facfe", fontSize: 17, fontWeight: "600" },
  renameTopTitle: { flex: 1, textAlign: "center", color: "#fff", fontSize: 17, fontWeight: "bold" },
  renameTopRightSpacer: { width: 92 },
  renameScroll: { flex: 1 },
  renameScrollContent: { padding: 20, paddingBottom: 32 },
  renameLabel: { color: "#888", fontSize: 13, marginBottom: 10, fontWeight: "600" },
  renameInput: {
    backgroundColor: "#2a2a2a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#444",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
  },
  renameHint: { color: "#666", fontSize: 12, marginTop: 14, lineHeight: 18 },
  renameFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
    backgroundColor: "#1a1a1a",
  },
  renameSaveWide: {
    backgroundColor: "#2ecc71",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  renameSaveWideText: { color: "#000", fontSize: 17, fontWeight: "bold" },
});