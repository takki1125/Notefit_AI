import { Tabs } from "expo-router";
import { BarChart2, Dumbbell, Home, Utensils } from "lucide-react-native";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#2a2a2a",
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 0, // 下の余白を強制リセット
          paddingTop: 0, // 上の余白（デフォルトで存在する場合がある）を強制リセット
        },
        tabBarItemStyle: {
          margin: 0, // タッチ領域の余白を強制リセット
          padding: 0,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarIconStyle: {
          flex: 1, // アイコンのコンテナを親の高さ(60)一杯に広げる
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarActiveTintColor: "#2ecc71",
        tabBarInactiveTintColor: "#666",
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          tabBarIcon: ({ color }) => <Dumbbell color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          tabBarIcon: ({ color }) => <Utensils color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color }) => <BarChart2 color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
