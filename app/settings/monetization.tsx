import { useRouter } from "expo-router";
import {
  Crown,
  Gift,
  Megaphone,
  PlayCircle,
  ShoppingBag,
  Target,
  X,
  Zap,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FeatureStatusBadge } from "../../components/monetization/FeatureStatusBadge";
import {
  PREVIEW_COIN_PACKS,
  PREVIEW_DAILY_MISSIONS_FREE,
  PREVIEW_LOGIN_STREAK_DAYS,
  PREVIEW_SUBSCRIPTION_TIERS,
  PREVIEW_TIER_EXTRA_MISSIONS,
} from "../../constants/monetizationPreview";
import { useCoinBalance } from "../../hooks/useCoinBalance";
import { styles as theme } from "../../theme/styles";
import {
  COIN_EXPIRY_DAYS_FROM_GRANT,
  DISPLAY_FALLBACK_AI_CHAT_COIN_COST,
  dailyMissionSlotCount,
} from "../../utils/monetizationTypes";

function plannedAlert(name: string) {
  Alert.alert(
    "準備中",
    `${name}は RevenueCat・AdMob・Cloud Functions 連携後に有効になる予定です。`,
    [{ text: "OK" }],
  );
}

export default function MonetizationScreen() {
  const router = useRouter();
  const balance = useCoinBalance();
  const slotsFree = dailyMissionSlotCount("free");
  const slotsPaid = dailyMissionSlotCount("tier1");

  return (
    <SafeAreaView style={theme.container}>
      <View style={theme.modalHeader}>
        <Text style={theme.modalTitle}>コイン・プラン</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[theme.scrollContent, local.scrollPad]}>
        <View style={local.hero}>
          <Text style={local.heroLabel}>利用可能コイン</Text>
          <Text style={local.heroBalance}>{balance === null ? "…" : balance}</Text>
          <Text style={local.heroSub}>
            付与から {COIN_EXPIRY_DAYS_FROM_GRANT} 日で失効するコインがあります（サーバー記録に準拠）。
          </Text>
        </View>

        {/* --- 実装済み --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>いま使える機能</Text>
            <FeatureStatusBadge variant="live" />
          </View>

          <View style={theme.card}>
            <View style={local.bulletRow}>
              <Zap color="#2ecc71" size={18} />
              <Text style={local.cardText}>
                <Text style={local.bold}>AI相談タブ</Text>
                送信でコインを消費します（1 回 約 {DISPLAY_FALLBACK_AI_CHAT_COIN_COST} 〜、Remote Config）。
              </Text>
            </View>
            <View style={[local.bulletRow, { marginTop: 12 }]}>
              <Gift color="#f1c40f" size={18} />
              <Text style={local.cardText}>
                <Text style={local.bold}>初回登録ボーナス</Text>
                ホーム表示時に 1 回だけ自動付与（Firestore / Cloud Functions）。
              </Text>
            </View>
            <View style={[local.bulletRow, { marginTop: 12 }]}>
              <Target color="#4facfe" size={18} />
              <Text style={local.cardText}>
                <Text style={local.bold}>コイン残高</Text>
                ホーム・AI相談・この画面で確認できます。取引の改ざん防止のため残高はサーバー集計です。
              </Text>
            </View>
          </View>
        </View>

        {/* --- 準備中: ミッション・ログイン --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>デイリーミッション・ログイン</Text>
            <FeatureStatusBadge variant="planned" />
          </View>
          <Text style={local.sectionDesc}>
            無料は 1 日 {slotsFree} 枠、Tier1/2 は {slotsPaid}
            枠を想定（プレースホルダー表示のみ）。
          </Text>

          <View style={theme.card}>
            <Text style={local.missionHead}>ログインボーナス（予定）</Text>
            <Text style={local.streakText}>連続ログイン {PREVIEW_LOGIN_STREAK_DAYS} 日 • 明日からカウント開始予定</Text>
          </View>

          <Text style={local.missionListTitle}>今日のミッション（UIのみ）</Text>
          {PREVIEW_DAILY_MISSIONS_FREE.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[theme.routineItem, local.missionRow]}
              activeOpacity={0.75}
              onPress={() => plannedAlert("デイリーミッション")}
            >
              <View style={{ flex: 1 }}>
                <Text style={theme.routineNameText}>{m.title}</Text>
                <Text style={theme.routineDescText}>
                  報酬 {m.rewardCoins} コイン • {m.progressLabel}
                </Text>
              </View>
              <FeatureStatusBadge variant="planned" label="未接続" />
            </TouchableOpacity>
          ))}
          <Text style={local.missionListTitle}>サブスク枠拡張イメージ（+{PREVIEW_TIER_EXTRA_MISSIONS.length} 枠）</Text>
          {PREVIEW_TIER_EXTRA_MISSIONS.map((m) => (
            <View key={m.id} style={[theme.routineItem, local.missionRow, { opacity: 0.65 }]}>
              <View style={{ flex: 1 }}>
                <Text style={theme.routineNameText}>{m.title}</Text>
                <Text style={theme.routineDescText}>Tier1 以上で解放予定</Text>
              </View>
              <FeatureStatusBadge variant="planned" label="ロック" />
            </View>
          ))}
        </View>

        {/* --- 準備中: サブスク --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>サブスクリプション</Text>
            <FeatureStatusBadge variant="planned" />
          </View>
          <Text style={local.sectionDesc}>全プラン 1 週間無料トライアル（.store 設定・RevenueCat 想定）</Text>

          {PREVIEW_SUBSCRIPTION_TIERS.map((t) => (
            <TouchableOpacity
              key={t.tier}
              style={[theme.card, local.tierCard, t.highlight && local.tierHighlight]}
              activeOpacity={0.85}
              onPress={() => plannedAlert("サブスクリプション購入")}
            >
              <View style={local.tierTitleRow}>
                <Crown color={t.highlight ? "#f1c40f" : "#888"} size={20} />
                <Text style={local.tierName}>{t.nameJa}</Text>
                {t.highlight ? <FeatureStatusBadge variant="planned" label="おすすめ" /> : null}
              </View>
              <Text style={local.tierPrice}>{t.priceJa}</Text>
              {t.bullets.map((line) => (
                <Text key={line} style={local.tierBullet}>
                  • {line}
                </Text>
              ))}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={local.linkBtn}
            onPress={() =>
              plannedAlert("ストアのサブスクリプション管理")
            }
          >
            <Text style={local.linkBtnText}>購入の復元・管理（今後）</Text>
          </TouchableOpacity>
        </View>

        {/* --- 準備中: コイン購入・リワード --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>コイン追加・リワード</Text>
            <FeatureStatusBadge variant="planned" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.packScroll}>
            {PREVIEW_COIN_PACKS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={local.packCard}
                onPress={() => plannedAlert("コインパック購入")}
              >
                <ShoppingBag color="#4facfe" size={22} />
                <Text style={local.packLabel}>{p.label}</Text>
                <Text style={local.packCoins}>{p.coins} コイン</Text>
                <Text style={local.packPrice}>{p.priceJa}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[theme.card, local.rewardBtn]} onPress={() => plannedAlert("リワード広告")}>
            <PlayCircle color="#2ecc71" size={26} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={local.rewardTitle}>動画広告を見てコイン（予定）</Text>
              <Text style={local.rewardSub}>AdMob リワード完了で少量付与</Text>
            </View>
            <FeatureStatusBadge variant="planned" />
          </TouchableOpacity>
        </View>

        {/* --- 準備中: 広告枠プレビュー --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>広告表示（フリープラン想定）</Text>
            <FeatureStatusBadge variant="planned" />
          </View>

          <View style={local.adBannerMock}>
            <Megaphone color="#666" size={20} />
            <Text style={local.adBannerText}>バナー広告枠（画面下部想定・AdMob）</Text>
          </View>
          <Text style={local.adCaption}>
            Tier1 以上ではバナー・インタースティシャルを出さない想定。リワードは任意で残します。
          </Text>
        </View>

        <Text style={local.footnote}>
          表示は開発用のプレビューです。課金・広告・付与ロジックはストア審査・法的表記と合わせて順次接続してください。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  scrollPad: { paddingBottom: 40 },
  hero: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  heroLabel: { color: "#888", fontSize: 13, marginBottom: 6 },
  heroBalance: { color: "#f1c40f", fontSize: 42, fontWeight: "800" },
  heroSub: { color: "#666", fontSize: 11, textAlign: "center", marginTop: 10, lineHeight: 16, paddingHorizontal: 12 },
  sectionBlock: { marginTop: 20 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sectionDesc: { color: "#888", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardText: { color: "#ccc", fontSize: 14, lineHeight: 21, flex: 1 },
  bold: { fontWeight: "700", color: "#fff" },
  missionHead: { color: "#fff", fontWeight: "700", marginBottom: 6 },
  streakText: { color: "#888", fontSize: 13 },
  missionListTitle: { color: "#aaa", fontSize: 12, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  missionRow: { marginBottom: 10 },
  tierCard: { marginBottom: 12 },
  tierHighlight: { borderWidth: 1, borderColor: "rgba(241, 196, 64, 0.45)" },
  tierTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  tierName: { color: "#fff", fontSize: 17, fontWeight: "700", flex: 1 },
  tierPrice: { color: "#888", fontSize: 13, marginBottom: 10 },
  tierBullet: { color: "#bbb", fontSize: 13, lineHeight: 20, marginBottom: 4 },
  linkBtn: { marginTop: 8, paddingVertical: 12, alignItems: "center" },
  linkBtnText: { color: "#4facfe", fontSize: 14 },
  packScroll: { gap: 12, paddingVertical: 4, marginBottom: 12 },
  packCard: {
    width: 140,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  packLabel: { color: "#fff", fontWeight: "700", marginTop: 10 },
  packCoins: { color: "#f1c40f", fontSize: 18, fontWeight: "800", marginTop: 4 },
  packPrice: { color: "#666", fontSize: 11, marginTop: 8 },
  rewardBtn: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  rewardTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  rewardSub: { color: "#888", fontSize: 12, marginTop: 4 },
  adBannerMock: {
    height: 56,
    backgroundColor: "#252525",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  adBannerText: { color: "#666", fontSize: 12 },
  adCaption: { color: "#555", fontSize: 11, marginTop: 10, lineHeight: 16 },
  footnote: { color: "#444", fontSize: 11, marginTop: 28, lineHeight: 16, textAlign: "center" },
});
