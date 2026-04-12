import React from "react";

type Props = {
  suppressed?: boolean;
};

/** Web は AdMob ネイティブ SDK 非対応 */
export function BannerAdSlot(_props: Props) {
  return null;
}
