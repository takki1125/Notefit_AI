import React from "react";
import { Video, ResizeMode } from "expo-av";

type Props = {
  source: number;
};

export default function TutorialDetailVideo({ source }: Props) {
  return (
    <Video
      source={source}
      style={{ width: "100%", height: "100%" }}
      resizeMode={ResizeMode.CONTAIN}
      shouldPlay
      isLooping
      isMuted
    />
  );
}
