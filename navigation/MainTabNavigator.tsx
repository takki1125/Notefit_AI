import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Home, Dumbbell, Utensils, BarChart2 } from 'lucide-react-native';

import { styles } from '../theme/styles';
import HomeStackNavigator from './HomeStackNavigator';
import TrainingScreen from '../screens/training/TrainingScreen';
import FoodScreen from '../screens/food/FoodScreen';
import StatsScreen from '../screens/stats/StatsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#2ecc71',
        tabBarInactiveTintColor: '#666',
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarIcon: ({ color }) => <Home color={color} size={28} /> }}
      />
      <Tab.Screen
        name="TrainingTab"
        component={TrainingScreen}
        options={{ tabBarIcon: ({ color }) => <Dumbbell color={color} size={28} /> }}
      />
      <Tab.Screen
        name="FoodTab"
        component={FoodScreen}
        options={{ tabBarIcon: ({ color }) => <Utensils color={color} size={28} /> }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{ tabBarIcon: ({ color }) => <BarChart2 color={color} size={28} /> }}
      />
    </Tab.Navigator>
  );
}

