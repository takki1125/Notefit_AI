import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  User 
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Alert } from 'react-native'; // アラート用

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 起動時のユーザーチェック
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("状態変化:", currentUser ? "ログイン中" : "未ログイン");
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ログイン
  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      console.error(e);
      Alert.alert("ログイン失敗", e.message); // 画面にエラーを出す
    }
  };

  // ★修正版：新規登録
  const signup = async (email: string, pass: string) => {
    try {
      // 1. ユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser = userCredential.user;
      
      // 2. 少し待ってからメール送信（タイミング問題を回避）
      if (newUser) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待つ
        await sendEmailVerification(newUser);
        Alert.alert("成功", "確認メールを送信しました！メールボックスを見てください。");
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("登録エラー", e.message); // 画面にエラーを出す
      
      // エラーが出たのにログイン状態になってしまうのを防ぐため、強制ログアウト
      if (auth.currentUser) {
        await signOut(auth);
      }
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  // 最新状態を取得（リロード）
  const reloadUser = async () => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        setUser({ ...auth.currentUser }); // 強制的に画面更新
        return auth.currentUser.emailVerified;
      } catch (e: any) {
        Alert.alert("更新エラー", e.message);
      }
    }
    return false;
  };

  // メール再送
  const resendEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        Alert.alert("再送成功", "メールをもう一度送りました。");
      } catch (e: any) {
        Alert.alert("再送失敗", "少し時間を空けて試してください。\n" + e.message);
      }
    }
  };

  return { user, loading, login, signup, logout, reloadUser, resendEmail };
};