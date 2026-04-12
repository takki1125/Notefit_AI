import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Trash2, X, User, ChevronRight, Target, Bell, Sparkles, CheckSquare, Coins, BookOpen } from 'lucide-react-native';
import { deleteUser, signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import { getUserProfile, setDetailedTrackingEnabled } from '../../utils/firestoreProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearHomeTutorialSeen, TUTORIAL_REPLAY_PENDING_KEY } from '../../utils/homeTutorialStorage';

export default function SettingsScreen() {
  const router = useRouter();
  const [detailedEnabled, setDetailedEnabled] = useState(false);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        setDetailedEnabled(!!profile?.isDetailedTrackingEnabled);
        
        // ローカルから自動チェックの設定を読み込む
        const autoCheckVal = await AsyncStorage.getItem('@auto_check_set');
        setAutoCheckEnabled(autoCheckVal === 'true');

      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const handleReplayHomeTutorial = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await clearHomeTutorialSeen(user.uid);
      await AsyncStorage.setItem(TUTORIAL_REPLAY_PENDING_KEY, user.uid);
      router.back();
    } catch {
      Alert.alert('エラー', '操作に失敗しました。');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('アカウント削除', '本当に削除しますか？\nこの操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '完全に削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (user) await deleteUser(user);
          } catch (error: any) {
            if (error.code === 'auth/requires-recent-login') {
              Alert.alert('エラー', '再ログインしてから実行してください。');
            }
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>設定</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* セクション：コイン・課金（プレビュー含む） */}
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>コイン・プレミアム</Text>
          <TouchableOpacity
            style={[styles.routineItem, { marginBottom: 10 }]}
            onPress={() => router.push('/settings/monetization')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#352a10', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <Coins color="#f1c40f" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>コイン・プラン・ミッション</Text>
                <Text style={styles.routineDescText}>残高の確認・将来のサブスク/UIプレビュー</Text>
              </View>
              <ChevronRight color="#444" size={20} />
            </View>
          </TouchableOpacity>
        </View>

        {/* セクション：AI */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>AI</Text>
          <TouchableOpacity
            style={[styles.routineItem, { marginBottom: 10 }]}
            onPress={() => router.push('/settings/ai-coach')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <Sparkles color="#4facfe" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>AIコーチのスタイル</Text>
                <Text style={styles.routineDescText}>トーン・口調・追加の希望</Text>
              </View>
              <ChevronRight color="#444" size={20} />
            </View>
          </TouchableOpacity>
        </View>

        {/* セクション：ガイド */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>ガイド</Text>
          <TouchableOpacity
            style={[styles.routineItem, { marginBottom: 10 }]}
            onPress={handleReplayHomeTutorial}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <BookOpen color="#2ecc71" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>ホームのチュートリアルを再表示</Text>
                <Text style={styles.routineDescText}>画面の案内をもう一度見る</Text>
              </View>
              <ChevronRight color="#444" size={20} />
            </View>
          </TouchableOpacity>
        </View>

        {/* セクション：記録 */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>TRACKING</Text>
          
          <TouchableOpacity
            style={[styles.routineItem, { marginBottom: 10 }]}
            onPress={() => router.push('/settings/meal-reminders')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <Bell color="#2ecc71" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>食事の記録リマインダー</Text>
                <Text style={styles.routineDescText}>朝・昼・夕に通知で記録を促す</Text>
              </View>
              <ChevronRight color="#444" size={20} />
            </View>
          </TouchableOpacity>

          <View style={styles.routineItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineNameText}>詳細な身体データを記録する</Text>
              <Text style={styles.routineDescText}>体脂肪率などの入力欄を表示</Text>
            </View>
            <Switch
              value={detailedEnabled}
              onValueChange={async (v) => {
                setDetailedEnabled(v);
                const user = auth.currentUser;
                if (!user) return;
                try {
                  await setDetailedTrackingEnabled(user.uid, v);
                } catch {
                  setDetailedEnabled(!v);
                  Alert.alert('エラー', '設定の保存に失敗しました。');
                }
              }}
              disabled={loading}
              trackColor={{ false: '#333', true: '#2ecc71' }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        {/* セクション：ワークアウト */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>WORKOUT</Text>
          
          <View style={styles.routineItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <CheckSquare color="#4facfe" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>セットを自動で「完了」にする</Text>
                <Text style={styles.routineDescText}>種目追加時にチェックを入れた状態にする</Text>
              </View>
            </View>
            <Switch
              value={autoCheckEnabled}
              onValueChange={async (v) => {
                setAutoCheckEnabled(v);
                await AsyncStorage.setItem('@auto_check_set', v ? 'true' : 'false');
              }}
              disabled={loading}
              trackColor={{ false: '#333', true: '#4facfe' }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        {/* セクション：プロフィール */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>PROFILE</Text>
          <TouchableOpacity
            style={styles.routineItem}
            onPress={() => router.push("/settings/goals")}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <Target color="#2ecc71" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>目標を再設定</Text>
                <Text style={styles.routineDescText}>フェーズ・目標体重・目標カロリー</Text>
              </View>
              <ChevronRight color="#444" size={20} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.routineItem} 
            onPress={() => router.push("/settings/profile")}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <User color="#2ecc71" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>プロフィール編集</Text>
                <Text style={styles.routineDescText}>名前の変更など</Text>
              </View>
              <ChevronRight color="#444" size={20} />
            </View>
          </TouchableOpacity>
        </View>

        {/* セクション：アカウント */}
        <View style={{ marginTop: 30 }}>
          <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>ACCOUNT</Text>
          
          <TouchableOpacity style={styles.routineItem} onPress={handleSignOut}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <LogOut color="#fff" size={20} />
              </View>
              <Text style={styles.routineNameText}>ログアウト</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.routineItem, { marginTop: 10 }]} 
            onPress={handleDeleteAccount}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#333', padding: 8, borderRadius: 10, marginRight: 15 }}>
                <Trash2 color="#ff4444" size={20} />
              </View>
              <Text style={[styles.routineNameText, { color: '#ff4444' }]}>アカウントを削除</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}