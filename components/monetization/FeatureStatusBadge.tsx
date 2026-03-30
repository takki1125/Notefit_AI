import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Variant = "live" | "planned";

export function FeatureStatusBadge({ variant, label }: { variant: Variant; label?: string }) {
  const isLive = variant === "live";
  return (
    <View style={[styles.wrap, isLive ? styles.live : styles.planned]}>
      <Text style={[styles.text, isLive ? styles.liveText : styles.plannedText]}>
        {label ?? (isLive ? "実装済み" : "準備中")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  live: { backgroundColor: "rgba(46, 204, 113, 0.2)" },
  planned: { backgroundColor: "rgba(79, 172, 254, 0.15)" },
  text: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  liveText: { color: "#2ecc71" },
  plannedText: { color: "#4facfe" },
});
