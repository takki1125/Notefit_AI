import { Redirect } from 'expo-router';

/**
 * ルート `/` は認証ガード（_layout）のあとでここに来る。
 * ログイン前は _layout が `/login` に飛ばすため、ここに来るのは主にログイン後の初期表示。
 * (tabs)/home へ寄せてプレースホルダーを出さない。
 */
export default function IndexScreen() {
  return <Redirect href="/home" />;
}
