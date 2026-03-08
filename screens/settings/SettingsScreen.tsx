import React from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LogOut, Trash2, X } from 'lucide-react-native';
import { deleteUser, signOut } from 'firebase/auth';

import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';

type SettingsScreenProps = {
  navigation: any;
};

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch {
            Alert.alert('エラー', 'ログアウトに失敗しました。');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウント削除',
      '本当にアカウントを削除しますか？\nこの操作は取り消せません。\n(記録データも全て失われます)',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '完全に削除する',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                await deleteUser(user);
              }
            } catch (error: any) {
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert('エラー', 'セキュリティのため、一度ログアウトして再ログインしてから実行してください。');
              } else {
                Alert.alert('エラー', 'アカウントの削除に失敗しました。');
              }
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRowSimple}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingsItem} onPress={handleSignOut}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <LogOut color="#fff" size={20} style={{ marginRight: 10 }} />
              <Text style={{ color: '#fff', fontSize: 16 }}>ログアウト</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { marginTop: 20, borderColor: '#ff4444', borderWidth: 1 }]}>
          <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteAccount}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trash2 color="#ff4444" size={20} style={{ marginRight: 10 }} />
              <Text style={{ color: '#ff4444', fontSize: 16, fontWeight: 'bold' }}>アカウントを削除</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

