import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 設定のメインメニュー */}
      <Stack.Screen name="index" />
      {/* プロフィール編集（ここでは右スライドで動く） */}
      <Stack.Screen name="profile" />
      {/* 目標設定 */}
      <Stack.Screen name="goals" />
    </Stack>
  );
}