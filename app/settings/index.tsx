import React from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Trash2, X, User, ChevronRight, Target, Bell } from 'lucide-react-native';
import { deleteUser, signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import { getUserProfile, setDetailedTrackingEnabled } from '../../utils/firestoreProfile';

export default function SettingsScreen() {
  const router = useRouter();
  const [detailedEnabled, setDetailedEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        setDetailedEnabled(!!profile?.isDetailedTrackingEnabled);
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