import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { styles } from './theme/styles';
import RootNavigator from './navigation/RootNavigator';
import { useAuthState } from './hooks/useAuthState';

// アプリ全体のエントリーポイント。
// ログイン状態（Firebase Auth）を監視しつつ、ナビゲーションツリーを描画する。
export default function App() {
  // Firebaseの認証状態を管理するカスタムフック
  // user: ログイン中ユーザー情報
  // initializing: 認証状態の初期読み込み中フラグ
  // forceRefreshUser: ユーザー情報を手動で再取得するための関数
  const { user, initializing, forceRefreshUser } = useAuthState();

  // 認証状態の初期読み込み中はローディングスピナーだけを表示する
  if (initializing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  // NavigationContainer配下で画面遷移を管理
  // RootNavigator 内で「ログイン前画面 or メインタブ」などの分岐を行う
  return (
    <NavigationContainer>
      <RootNavigator user={user} forceRefreshUser={forceRefreshUser} />
    </NavigationContainer>
  );
}

