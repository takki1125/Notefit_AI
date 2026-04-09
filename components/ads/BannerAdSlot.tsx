import React from "react";
import { StyleSheet, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

import { getBannerAdUnitId } from "../../utils/adMobUnits";

type Props = {
  /** サブスク加入者など、広告を出さないとき true */
  suppressed?: boolean;
};

export function BannerAdSlot({ suppressed = false }: Props) {
  if (suppressed) return null;
  const unitId = getBannerAdUnitId();
  if (!unitId) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    overflow: "hidden",
  },
});
