// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null); // ログイン中のユーザー情報
  const [loading, setLoading] = useState(true);

  // アプリ起動時に「ログインしてる？」と確認する
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ログイン機能
  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      console.log("✅ ログイン成功！");
    } catch (error: any) {
      console.error("❌ ログイン失敗", error.message);
      throw error;
    }
  };

  // 会員登録機能
  const signup = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      console.log("✅ 登録成功！");
    } catch (error: any) {
      console.error("❌ 登録失敗", error.message);
      throw error;
    }
  };

  // ログアウト機能
  const logout = async () => {
    await signOut(auth);
    console.log("👋 ログアウトしました");
  };

  return { user, loading, login, signup, logout };
};