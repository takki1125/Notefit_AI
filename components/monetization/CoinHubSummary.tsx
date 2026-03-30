import { ChevronRight, Coins } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DISPLAY_FALLBACK_AI_CHAT_COIN_COST } from "../../utils/monetizationTypes";

type Props = {
  balance: number | null;
  onPress: () => void;
  /** 編集モード中はナビ用の小さなチップ */
  compact?: boolean;
};

export function CoinHubSummary({ balance, onPress, compact }: Props) {
  const display = balance === null ? "…" : balance;

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactWrap} onPress={onPress} hitSlop={8}>
        <Coins color="#f1c40f" size={18} />
        <Text style={styles.compactText}>{display}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowTop}>
        <View style={styles.iconCircle}>
          <Coins color="#f1c40f" size={22} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.kicker}>コイン・プレミアム・ミッション</Text>
          <Text style={styles.balanceLine}>
            利用可能 <Text style={styles.balanceNum}>{display}</Text>
            <Text style={styles.balanceUnit}> コイン</Text>
          </Text>
          <Text style={styles.hint}>
            AI相談 1 回 約 {DISPLAY_FALLBACK_AI_CHAT_COIN_COST} コイン〜（サーバー・Remote Config で変更）
          </Text>
        </View>
        <ChevronRight color="#666" size={22} />
      </View>
      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>登録ボーナス</Text>
          <FeatureStatusDot ok />
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>デイリーミッション</Text>
          <FeatureStatusDot ok={false} />
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>サブスク・広告</Text>
          <FeatureStatusDot ok={false} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeatureStatusDot({ ok }: { ok: boolean }) {
  return (
    <View style={[styles.dot, ok ? styles.dotOn : styles.dotOff]} accessibilityLabel={ok ? "利用可" : "準備中"} />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#352a10",
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, minWidth: 0 },
  kicker: { color: "#888", fontSize: 11, fontWeight: "600", marginBottom: 4, letterSpacing: 0.5 },
  balanceLine: { color: "#fff", fontSize: 16, fontWeight: "700" },
  balanceNum: { color: "#f1c40f", fontSize: 20 },
  balanceUnit: { color: "#ccc", fontSize: 14, fontWeight: "600" },
  hint: { color: "#777", fontSize: 11, marginTop: 6, lineHeight: 15 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#333" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: { color: "#bbb", fontSize: 11, fontWeight: "600" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { backgroundColor: "#2ecc71" },
  dotOff: { backgroundColor: "#4a6a8a" },
  compactWrap: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 8, marginRight: 4 },
  compactText: { color: "#f1c40f", fontSize: 15, fontWeight: "800" },
});
