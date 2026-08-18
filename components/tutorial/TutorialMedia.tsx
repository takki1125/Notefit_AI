import { requireOptionalNativeModule } from "expo-modules-core";
import React from "react";
import { Image, Text, View } from "react-native";

type Props = {
  video?: number;
  image?: number;
};

function VideoFallback() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ color: "#888", textAlign: "center" }}>
        この環境では動画を再生できません
      </Text>
    </View>
  );
}

function hasExpoVideoNativeModule() {
  return requireOptionalNativeModule("ExpoVideo") != null;
}

export default function TutorialMedia({ video, image }: Props) {
  if (video) {
    // Skip loading expo-video unless the installed native app includes it.
    // A JS-only try/catch around require() still crashes older development builds.
    if (hasExpoVideoNativeModule()) {
      const TutorialDetailVideo = require("./TutorialDetailVideo").default as React.ComponentType<{
        source: number;
      }>;
      return <TutorialDetailVideo source={video} />;
    }
    return <VideoFallback />;
  }
  if (image) {
    return (
      <Image
        source={image}
        style={{ width: "100%", height: "100%", borderRadius: 20 }}
        resizeMode="contain"
      />
    );
  }
  return <Text style={{ color: "#666" }}>メディアがありません</Text>;
}
