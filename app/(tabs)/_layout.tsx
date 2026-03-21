import { Tabs } from "expo-router";
import { BarChart2, Dumbbell, Home, Sparkles, Utensils } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // 全タブの上の自動タイトルを消す
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#2a2a2a",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 92 : 72,
          paddingBottom: Platform.OS === "ios" ? 22 : 8,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          margin: 0,
          padding: 0,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarIconStyle: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarActiveTintColor: "#2ecc71",
        tabBarInactiveTintColor: "#666",
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "ホーム",
          tabBarLabel: "ホーム",
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="ai-advice"
        options={{
          title: "AI相談",
          tabBarLabel: "AI相談",
          tabBarIcon: ({ color }) => <Sparkles color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: "トレーニング",
          tabBarLabel: "トレ",
          tabBarIcon: ({ color }) => <Dumbbell color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: "食事",
          tabBarLabel: "食事",
          tabBarIcon: ({ color }) => <Utensils color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "記録",
          tabBarLabel: "記録",
          tabBarIcon: ({ color }) => <BarChart2 color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
