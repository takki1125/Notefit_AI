import { PlayCircle } from "lucide-react-native";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { FeatureStatusBadge } from "../monetization/FeatureStatusBadge";
import type { RewardedAdOfferRowProps } from "./RewardedAdOfferRowProps";

export function RewardedAdOfferRow({ themeCardStyle }: RewardedAdOfferRowProps) {
  return (
    <TouchableOpacity
      style={[themeCardStyle, styles.rewardBtn]}
      onPress={() =>
        Alert.alert("非対応", "リワード広告は iOS / Android アプリでのみ利用できます。")
      }
    >
      <PlayCircle color="#2ecc71" size={26} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rewardTitle}>動画広告を見てコイン</Text>
        <Text style={styles.rewardSub}>AdMob リワード（モバイル専用）</Text>
      </View>
      <FeatureStatusBadge variant="planned" label="Web除外" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rewardBtn: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  rewardTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  rewardSub: { color: "#888", fontSize: 12, marginTop: 4 },
});
