// app/(tabs)/index.tsx
import { useState } from "react";
import { Text, View, TextInput, Button, Alert } from "react-native";
import { useAuth } from "../../hooks/useAuth";

export default function Index() {
  const { user, login, signup, logout } = useAuth();
  
  // 入力欄のための変数
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (e: any) {
      Alert.alert("エラー", "ログインできませんでした");
    }
  };

  const handleSignup = async () => {
    try {
      await signup(email, password);
      Alert.alert("成功", "アカウントを作成しました！");
    } catch (e: any) {
      Alert.alert("エラー", "登録に失敗しました");
    }
  };

  // もしログインしていたら...
  if (user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 20, marginBottom: 20 }}>
          ようこそ、{user.email} さん！
        </Text>
        <Text style={{ color: "#aaa", marginBottom: 40 }}>UID: {user.uid}</Text>
        <Button title="ログアウト" onPress={logout} color="red" />
      </View>
    );
  }

  // ログインしていないなら...
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 24, marginBottom: 20, textAlign: "center" }}>
        Notefit AI ログイン
      </Text>
      
      <TextInput 
        placeholder="メールアドレス" 
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        style={{ backgroundColor: "#333", color: "#fff", padding: 15, borderRadius: 8, marginBottom: 10 }}
      />
      
      <TextInput 
        placeholder="パスワード" 
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry // パスワードを●●にする
        style={{ backgroundColor: "#333", color: "#fff", padding: 15, borderRadius: 8, marginBottom: 20 }}
      />

      <View style={{ gap: 10 }}>
        <Button title="ログイン" onPress={handleLogin} />
        <Button title="新規登録" onPress={handleSignup} color="#888" />
      </View>
    </View>
  );
}