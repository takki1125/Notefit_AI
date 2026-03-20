// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
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
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

function getFirebaseAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = getFirebaseAuth();
