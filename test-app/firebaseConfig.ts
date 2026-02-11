// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// アプリとデータベースを起動して、使える状態にしておく
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);