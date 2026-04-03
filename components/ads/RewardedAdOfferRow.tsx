import { PlayCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRewardedAd } from "react-native-google-mobile-ads";

import { requestGrantRewardAdCoins } from "../../utils/coinBalance";
import { getRewardedAdUnitId } from "../../utils/adMobUnits";
import { ensureMobileAdsInitialized } from "../../utils/mobileAdsInit";
import { FeatureStatusBadge } from "../monetization/FeatureStatusBadge";
import type { RewardedAdOfferRowProps } from "./RewardedAdOfferRowProps";

function firebaseErrorMessage(err: unknown): string {
  const code = typeof (err as { code?: string })?.code === "string" ? (err as { code: string }).code : "";
  const msg = typeof (err as { message?: string })?.message === "string" ? (err as { message: string }).message : "";
  if (code === "functions/resource-exhausted") {
    return "本日の獲得上限に達しています。また明日お試しください。";
  }
  return msg || "エラーが発生しました。";
}

export function RewardedAdOfferRow({ themeCardStyle }: RewardedAdOfferRowProps) {
  const unitId = getRewardedAdUnitId();
  const rewarded = useRewardedAd(unitId.length > 0 ? unitId : null);
  const grantLock = useRef(false);

  useEffect(() => {
    if (!unitId) return;
    let alive = true;
    void ensureMobileAdsInitialized().then(() => {
      if (alive) rewarded.load();
    });
    return () => {
      alive = false;
    };
  }, [unitId, rewarded.load]);

  useEffect(() => {
    if (!unitId) return;
    if (rewarded.isClosed && !rewarded.isLoaded && !rewarded.error) {
      rewarded.load();
    }
  }, [unitId, rewarded.isClosed, rewarded.isLoaded, rewarded.error, rewarded.load]);

  useEffect(() => {
    if (!rewarded.isEarnedReward) {
      grantLock.current = false;
      return;
    }
    if (grantLock.current) return;
    grantLock.current = true;
    void (async () => {
      try {
        const res = await requestGrantRewardAdCoins();
        if (res.granted && res.amount != null) {
          Alert.alert("コイン獲得", `${res.amount} コインを付与しました。`);
        } else {
          Alert.alert("完了", "広告は視聴済みですが、今回はコインを付与できませんでした。");
        }
      } catch (e: unknown) {
        Alert.alert("付与エラー", firebaseErrorMessage(e));
      }
    })();
  }, [rewarded.isEarnedReward]);

  const onPress = useCallback(() => {
    if (!unitId) {
      Alert.alert("設定エラー", "広告ユニット ID が取得できません。");
      return;
    }
    if (rewarded.error) {
      rewarded.load();
      return;
    }
    if (rewarded.isLoaded) {
      rewarded.show();
    } else {
      void ensureMobileAdsInitialized().then(() => rewarded.load());
    }
  }, [unitId, rewarded]);

  const busy = !!unitId && !rewarded.isLoaded && !rewarded.error;

  return (
    <TouchableOpacity
      style={[themeCardStyle, styles.rewardBtn]}
      onPress={onPress}
      disabled={rewarded.isShowing}
      activeOpacity={0.85}
    >
      <PlayCircle color="#2ecc71" size={26} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rewardTitle}>動画広告を見てコイン</Text>
        <Text style={styles.rewardSub}>
          {rewarded.error
            ? "読み込みに失敗しました。タップで再試行"
            : busy
              ? "広告を読み込み中…"
              : "AdMob リワード完了でコイン付与（1 日に上限あり）"}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color="#4facfe" />
      ) : (
        <FeatureStatusBadge variant="live" label="AdMob" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rewardBtn: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  rewardTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  rewardSub: { color: "#888", fontSize: 12, marginTop: 4 },
});
