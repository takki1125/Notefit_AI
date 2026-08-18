import { useRouter } from "expo-router";
import {
  Crown,
  Gift,
  Megaphone,
  RefreshCw,
  ShoppingBag,
  Target,
  X,
  Zap,
} from "lucide-react-native";
import type { PurchasesPackage } from "react-native-purchases";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BannerAdSlot } from "../../components/ads/BannerAdSlot";
import { RewardedAdOfferRow } from "../../components/ads/RewardedAdOfferRow";
import { FeatureStatusBadge } from "../../components/monetization/FeatureStatusBadge";
import { PREVIEW_COIN_PACKS, PREVIEW_LOGIN_STREAK_DAYS, PREVIEW_SUBSCRIPTION_TIERS } from "../../constants/monetizationPreview";
import { useCoinBalance } from "../../hooks/useCoinBalance";
import { useTestAccountCoinGrant } from "../../hooks/useTestAccountCoinGrant";
import { useSubscriptionEntitlements } from "../../hooks/useSubscriptionEntitlements";
import { styles as theme } from "../../theme/styles";
import {
  COIN_EXPIRY_DAYS_FROM_GRANT,
  DISPLAY_FALLBACK_AI_CHAT_COIN_COST,
  dailyMissionSlotCount,
} from "../../utils/monetizationTypes";
import { interpretRevenueCatPurchaseError } from "../../utils/revenueCatPurchaseErrors";
import { claimMissionReward, fetchMissionsSnapshot, type MissionsSnapshotResponse } from "../../utils/missionCallables";
import { ensureRevenueCatConfigured, getRevenueCatLibrary, isRevenueCatSupportedPlatform } from "../../utils/revenueCat";

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
  const { enabled: canGrantTestCoins, busy: addingTestCoins, addCoins: addTestCoins } =
    useTestAccountCoinGrant();
  const slotsFree = dailyMissionSlotCount("free");
  const slotsPaid = dailyMissionSlotCount("tier1");
  const { flags, refreshCustomerInfo, revenueCatReady, loading: entitlementsLoading } =
    useSubscriptionEntitlements();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [purchaseBusyId, setPurchaseBusyId] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const [missionSnap, setMissionSnap] = useState<MissionsSnapshotResponse | null>(null);
  const [missionLoading, setMissionLoading] = useState(false);
  const [claimBusyId, setClaimBusyId] = useState<string | null>(null);

  const loadMissions = useCallback(async () => {
    setMissionLoading(true);
    try {
      const s = await fetchMissionsSnapshot();
      setMissionSnap(s);
    } catch {
      setMissionSnap(null);
    } finally {
      setMissionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
  }, [loadMissions]);

  const onClaimMission = async (missionId: string, bucket: "daily" | "weekly") => {
    setClaimBusyId(`${bucket}:${missionId}`);
    try {
      const r = await claimMissionReward(missionId, bucket);
      if (r.granted) {
        Alert.alert("達成", `${r.amount ?? 0} コインを獲得しました。`);
      } else if (r.duplicate) {
        Alert.alert("済み", "すでに受け取り済みです。");
      }
      await loadMissions();
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : "受け取りに失敗しました。";
      Alert.alert("エラー", msg);
    } finally {
      setClaimBusyId(null);
    }
  };

  const loadOfferings = useCallback(async () => {
    if (!isRevenueCatSupportedPlatform() || !ensureRevenueCatConfigured()) {
      setPackages([]);
      setOfferingsError(null);
      return;
    }
    const lib = getRevenueCatLibrary();
    if (!lib) {
      setOfferingsError("課金モジュールを読み込めませんでした。");
      return;
    }
    setOfferingsLoading(true);
    setOfferingsError(null);
    try {
      const offerings = await lib.default.getOfferings();
      const current = offerings.current;
      setPackages(current?.availablePackages ?? []);
      if (!current || (current.availablePackages?.length ?? 0) === 0) {
        setOfferingsError(
          "RevenueCat に Current Offering またはパッケージが設定されていません。ダッシュボードを確認してください。",
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "オファリングの取得に失敗しました。";
      setOfferingsError(msg);
      setPackages([]);
    } finally {
      setOfferingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings, revenueCatReady]);

  const onPurchasePackage = async (pkg: PurchasesPackage) => {
    const lib = getRevenueCatLibrary();
    if (!lib) return;
    const id = pkg.identifier;
    setPurchaseBusyId(id);
    try {
      await lib.default.purchasePackage(pkg);
      await refreshCustomerInfo();
      Alert.alert("購入ありがとうございます", "プレミアム特典が有効になりました。");
    } catch (e) {
      const { userCancelled, message } = interpretRevenueCatPurchaseError(e);
      if (userCancelled) {
        return;
      }
      Alert.alert("購入できませんでした", message);
    } finally {
      setPurchaseBusyId(null);
    }
  };

  const onRestorePurchases = async () => {
    const lib = getRevenueCatLibrary();
    if (!lib) {
      Alert.alert("復元できません", "この端末ではストア課金に対応していません。");
      return;
    }
    if (!ensureRevenueCatConfigured()) {
      Alert.alert("復元できません", "RevenueCat API キーが app.json の extra に設定されていません。");
      return;
    }
    setRestoreBusy(true);
    try {
      await lib.default.restorePurchases();
      await refreshCustomerInfo();
      Alert.alert("復元しました", "購読状態をストアと同期しました。");
    } catch (e) {
      const { userCancelled, message } = interpretRevenueCatPurchaseError(e);
      if (userCancelled) {
        return;
      }
      Alert.alert("復元に失敗しました", message);
    } finally {
      setRestoreBusy(false);
    }
  };

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
          {canGrantTestCoins ? (
            <TouchableOpacity
              style={local.testGrantBtn}
              onPress={() => void addTestCoins()}
              disabled={addingTestCoins}
              activeOpacity={0.85}
            >
              {addingTestCoins ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={local.testGrantText}>テスト用 +1000 コイン</Text>
              )}
            </TouchableOpacity>
          ) : null}
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

        {/* --- ミッション（サーバー検証・コイン付与） --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>デイリー＆ウィークリーミッション</Text>
            <FeatureStatusBadge variant="live" label="CF" />
          </View>
          <Text style={local.sectionDesc}>
            達成は東京日付基準で Cloud Functions が確認します。無料はデイリー {slotsFree} 種＋ウィークリー、プレミアムはデイリー {slotsPaid} 種まで表示されます。
          </Text>

          <View style={theme.card}>
            <Text style={local.missionHead}>ログインボーナス（予定）</Text>
            <Text style={local.streakText}>
              連続ログイン {PREVIEW_LOGIN_STREAK_DAYS} 日 • 別途実装予定
            </Text>
          </View>

          <View style={[local.sectionTitleRow, { marginTop: 8 }]}>
            <Text style={local.missionListTitle}>今日・今週のミッション</Text>
            <TouchableOpacity onPress={() => void loadMissions()} hitSlop={12}>
              <RefreshCw color="#888" size={18} />
            </TouchableOpacity>
          </View>
          {missionLoading ? (
            <ActivityIndicator color="#2ecc71" style={{ marginVertical: 12 }} />
          ) : !missionSnap ? (
            <Text style={local.tierBullet}>
              ミッション一覧を取得できませんでした。`firebase deploy --only functions:ai` で getMissionsSnapshot / claimMissionReward
              をデプロイしてください。
            </Text>
          ) : (
            <>
              <Text style={[local.tierBullet, { marginBottom: 8 }]}>
                今日（東京）{missionSnap.tokyoToday} ／ 週 {missionSnap.weekStart} 〜 {missionSnap.weekEnd}
              </Text>
              {missionSnap.missions
                .filter((m) => m.bucket === "daily")
                .map((m) => {
                  const busy = claimBusyId === `daily:${m.id}`;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[theme.routineItem, local.missionRow, m.claimed && { opacity: 0.7 }]}
                      activeOpacity={m.canClaim ? 0.75 : 1}
                      disabled={busy || !m.canClaim}
                      onPress={() => (m.canClaim ? void onClaimMission(m.id, "daily") : undefined)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={theme.routineNameText}>{m.title}</Text>
                        <Text style={theme.routineDescText}>
                          報酬 {m.rewardCoins} コイン • 進捗 {m.progressLabel}
                          {m.requiresPremium ? " • プレミアム" : ""}
                        </Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator color="#2ecc71" />
                      ) : m.claimed ? (
                        <FeatureStatusBadge variant="live" label="受取済" />
                      ) : m.canClaim ? (
                        <FeatureStatusBadge variant="live" label="受取" />
                      ) : (
                        <FeatureStatusBadge variant="planned" label="未達成" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              <Text style={[local.missionListTitle, { marginTop: 16 }]}>ウィークリー</Text>
              {missionSnap.missions
                .filter((m) => m.bucket === "weekly")
                .map((m) => {
                  const busy = claimBusyId === `weekly:${m.id}`;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[theme.routineItem, local.missionRow, m.claimed && { opacity: 0.7 }]}
                      activeOpacity={m.canClaim ? 0.75 : 1}
                      disabled={busy || !m.canClaim}
                      onPress={() => (m.canClaim ? void onClaimMission(m.id, "weekly") : undefined)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={theme.routineNameText}>{m.title}</Text>
                        <Text style={theme.routineDescText}>
                          報酬 {m.rewardCoins} コイン • 進捗 {m.progressLabel}
                        </Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator color="#2ecc71" />
                      ) : m.claimed ? (
                        <FeatureStatusBadge variant="live" label="受取済" />
                      ) : m.canClaim ? (
                        <FeatureStatusBadge variant="live" label="受取" />
                      ) : (
                        <FeatureStatusBadge variant="planned" label="未達成" />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </>
          )}
        </View>

        {/* --- サブスク（RevenueCat） --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>サブスクリプション</Text>
            <FeatureStatusBadge variant={revenueCatReady ? "live" : "planned"} label={revenueCatReady ? "RC" : "要設定"} />
          </View>
          <Text style={local.sectionDesc}>
            {flags.hideAds
              ? "プレミアム有効: バナー／インタースティシャル非表示（リワードは可）・AIチャット上位モデル・マイ種目無制限・食事ルーティーン無制限 など。"
              : "プラン購入で上記の特典と、Webhook 経由のサブスク更新コイン付与が有効になります（表示反映まで数秒〜数分のずれがある場合があります）。"}
          </Text>

          {Platform.OS !== "ios" && Platform.OS !== "android" ? (
            <Text style={local.tierBullet}>サブスクリプションは iOS / Android 端末でのみご利用いただけます。</Text>
          ) : !revenueCatReady ? (
            <Text style={local.tierBullet}>
              app.json の extra に revenueCatIosApiKey / revenueCatAndroidApiKey を設定し、開発ビルドを再作成してください。
            </Text>
          ) : (
            <>
              {entitlementsLoading || offeringsLoading ? (
                <ActivityIndicator color="#2ecc71" style={{ marginVertical: 16 }} />
              ) : null}
              {offeringsError ? <Text style={[local.tierBullet, { color: "#e74c3c" }]}>{offeringsError}</Text> : null}

              {packages.map((pkg) => {
                const title = pkg.product.title || pkg.identifier;
                const price = pkg.product.priceString;
                const busy = purchaseBusyId === pkg.identifier;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[theme.card, local.tierCard]}
                    activeOpacity={0.85}
                    disabled={busy}
                    onPress={() => onPurchasePackage(pkg)}
                  >
                    <View style={local.tierTitleRow}>
                      <Crown color="#f1c40f" size={20} />
                      <Text style={local.tierName}>{title}</Text>
                      {busy ? <ActivityIndicator color="#2ecc71" /> : null}
                    </View>
                    <Text style={local.tierPrice}>{price}</Text>
                    <Text style={local.tierBullet}>• タップしてストア決済画面へ</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[local.missionListTitle, { marginTop: 16 }]}>プラン例（参考・表示のみ）</Text>
              {PREVIEW_SUBSCRIPTION_TIERS.map((t) => (
                <View
                  key={t.tier}
                  style={[theme.card, local.tierCard, t.highlight && local.tierHighlight, { opacity: 0.7 }]}
                >
                  <View style={local.tierTitleRow}>
                    <Crown color={t.highlight ? "#f1c40f" : "#888"} size={20} />
                    <Text style={local.tierName}>{t.nameJa}</Text>
                  </View>
                  <Text style={local.tierPrice}>{t.priceJa}</Text>
                  {t.bullets.map((line) => (
                    <Text key={line} style={local.tierBullet}>
                      • {line}
                    </Text>
                  ))}
                </View>
              ))}

              <TouchableOpacity
                style={[local.linkBtn, restoreBusy && { opacity: 0.6 }]}
                disabled={restoreBusy}
                onPress={() => void onRestorePurchases()}
              >
                <View style={local.linkBtnRow}>
                  <RefreshCw color="#4facfe" size={18} />
                  <Text style={local.linkBtnText}>
                    {restoreBusy ? "復元処理中…" : "購入を復元（Restore）"}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={local.linkBtn} onPress={() => void loadOfferings()}>
                <Text style={local.linkBtnText}>オファリングを再読み込み</Text>
              </TouchableOpacity>
            </>
          )}
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

          <RewardedAdOfferRow themeCardStyle={theme.card} />
        </View>

        {/* --- 準備中: 広告枠プレビュー --- */}
        <View style={local.sectionBlock}>
          <View style={local.sectionTitleRow}>
            <Text style={local.sectionTitle}>バナー広告（フリープラン想定）</Text>
            <FeatureStatusBadge variant="live" label="AdMob" />
          </View>

          <View style={local.adBannerFrame}>
            <View style={local.adBannerLabelRow}>
              <Megaphone color="#666" size={18} />
              <Text style={local.adBannerLabel}>Google AdMob（開発時はテスト広告）</Text>
            </View>
            <BannerAdSlot suppressed={flags.hideAds} />
          </View>
          <Text style={local.adCaption}>
            Tier1 以上ではバナーを隠す想定。本番では app.json の extra に本番ユニット ID を設定し、開発ビルドで確認してください。
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
  testGrantBtn: {
    marginTop: 16,
    backgroundColor: "#f1c40f",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 220,
    alignItems: "center",
  },
  testGrantText: { color: "#111", fontSize: 14, fontWeight: "800" },
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
  linkBtnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  adBannerFrame: {
    backgroundColor: "#252525",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  adBannerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  adBannerLabel: { color: "#666", fontSize: 12 },
  adCaption: { color: "#555", fontSize: 11, marginTop: 10, lineHeight: 16 },
  footnote: { color: "#444", fontSize: 11, marginTop: 28, lineHeight: 16, textAlign: "center" },
});
