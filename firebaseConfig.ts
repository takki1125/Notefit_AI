// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import * as FirebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Persistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// 瀧本さんのプロジェクトの鍵情報
const firebaseConfig = {
  apiKey: "AIzaSyADqV3zHIJRE2nI2cBIPxx-_7rJMr6joJU",
  authDomain: "kennkoukannri-kari.firebaseapp.com",
  projectId: "kennkoukannri-kari",
  storageBucket: "kennkoukannri-kari.firebasestorage.app",
  messagingSenderId: "311390133774",
  appId: "1:311390133774:web:f46a2e1c422c651814665f",
  measurementId: "G-862D2LVL00",
} as const;

/**
 * メール確認リンク完了後のリダイレクト先。Firebase Hosting で `public/` をデプロイし、
 * Authentication の「承認済みドメイン」に `{projectId}.web.app` を含めてください。
 * メール件名・本文は Console の「Authentication → テンプレート → メールアドレスの確認」で日本語化（%LINK% 等）。
 */
export const emailVerificationContinueUrl = `https://${firebaseConfig.projectId}.web.app/email-verified.html`;

export const emailVerificationActionCodeSettings = {
  url: emailVerificationContinueUrl,
  handleCodeInApp: false,
} as const;

const app = initializeApp(firebaseConfig);

/** Long polling は RN / 一部ネット環境で WebSocket 失敗時の接続安定化に効くことがある */
function getFirestoreForApp() {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = getFirestoreForApp();

type AuthModuleWithReactNativePersistence = {
  getReactNativePersistence?: (storage: typeof ReactNativeAsyncStorage) => Persistence;
};

function getFirebaseAuth() {
  try {
    // `getReactNativePersistence` is available at runtime on React Native builds but not always typed on this import path.
    const maybeGetReactNativePersistence = (FirebaseAuth as AuthModuleWithReactNativePersistence)
      .getReactNativePersistence;
    if (typeof maybeGetReactNativePersistence === "function") {
      return initializeAuth(app, {
        persistence: maybeGetReactNativePersistence(ReactNativeAsyncStorage),
      });
    }
    return initializeAuth(app);
  } catch {
    return getAuth(app);
  }
}

export const auth = getFirebaseAuth();
