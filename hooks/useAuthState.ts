import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../firebaseConfig';

// Firebase Auth のログイン状態をアプリ全体で扱いやすい形にラップするカスタムフック
export type AuthState = {
  // 現在ログイン中のユーザー（未ログインなら null）
  user: User | null;
  // 初回の認証状態チェック中かどうか
  initializing: boolean;
  // ユーザー情報を明示的に再読み込みするための関数
  forceRefreshUser: () => Promise<void>;
};

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Firebase Auth の状態変更（ログイン/ログアウトなど）を購読
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (initializing) {
        setInitializing(false);
      }
    });

    // コンポーネントのアンマウント時に購読解除
    return unsubscribe;
  }, [initializing]);

  const forceRefreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      // 新しいオブジェクトをセットして再レンダリングを強制
      setUser({ ...(auth.currentUser as User) });
    }
  };

  return { user, initializing, forceRefreshUser };
}

