import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";

type Props = {
  source: number;
};

export default function TutorialDetailVideo({ source }: Props) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
      nativeControls={false}
    />
  );
}
