import { Tabs } from "expo-router";
import { BarChart2, Dumbbell, Home, Utensils } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // ★ここを追加：これで全タブの上のダサい自動タイトルが消える！
        headerShown: false, 
        tabBarStyle: {
          backgroundColor: "#2a2a2a",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
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