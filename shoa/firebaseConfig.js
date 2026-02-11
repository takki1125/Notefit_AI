import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// ↓↓↓ ログイン用に追加した部分 ↓↓↓
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyADqV3zHIJRE2nI2cBIPxx-_7rJMr6joJU",
    authDomain: "[kennkoukannri-kari.firebaseapp.com](http://kennkoukannri-kari.firebaseapp.com/)",
    projectId: "kennkoukannri-kari",
    storageBucket: "kennkoukannri-kari.firebasestorage.app",
    messagingSenderId: "311390133774",
    appId: "1:311390133774:web:f46a2e1c422c651814665f",
    measurementId: "G-862D2LVL00"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ログイン状態を保存するための設定
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { db, auth };