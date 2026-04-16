# Google Play Store リリースチェックリスト

> **最終更新**: 2026-04-16

---

## Phase 1: 事前準備

### Google Play Console
- [x] デベロッパー登録 ($25) 完了
- [x] 本人確認 完了

### Firebase
- [ ] Firebase Console で Android アプリを追加済み（パッケージ名: `com.takimoto.shoa.notefitai`）
- [ ] `google-services.json` をダウンロードしてプロジェクトルートに配置
- [ ] `app.json` の `android.googleServicesFile` が `"./google-services.json"` を指していることを確認

### アプリ署名
- [x] EAS Build で自動管理（`eas.json` 設定済み）
- [ ] Play Console で「Play App Signing」を有効化（初回アップロード時）

---

## Phase 2: 本番設定

### AdMob
- [ ] AdMob Console で本番アプリを作成
- [ ] 本番 Android App ID を取得し `app.json` の `react-native-google-mobile-ads` plugin 設定を更新
  - 現在テスト ID: `ca-app-pub-3940256099942544~3347511713` → 本番 ID に置換
- [ ] 本番広告ユニット ID を `.env` に設定
  - `ADMOB_BANNER_UNIT_ID`
  - `ADMOB_REWARDED_UNIT_ID`
  - `ADMOB_INTERSTITIAL_UNIT_ID`

### RevenueCat
- [ ] RevenueCat ダッシュボードで Android アプリを追加
- [ ] Play Console のサービスアカウント JSON を RevenueCat に連携
- [ ] Android API キーを `.env` に設定（`REVENUECAT_ANDROID_API_KEY`）
- [ ] Play Console で定期購入商品を作成（tier1 / tier2）
- [ ] RevenueCat でプロダクト設定・エンタイトルメントを確認

### プライバシーポリシー
- [ ] `docs/PRIVACY_POLICY.md` の `[メールアドレスを記入]` を実際のアドレスに置換
- [ ] プライバシーポリシーを公開 URL に配置（GitHub Pages / Notion / 独自サイト等）
- [ ] Play Console にプライバシーポリシー URL を登録

### アカウント削除（実データ削除要件）
- [ ] `functions-ai` の callable `deleteMyAccount` をデプロイ済み（`firebase deploy --only functions:ai`）
- [ ] `app/settings/index.tsx` が `deleteUser` 直呼びではなく `deleteMyAccount` を呼んでいることを確認
- [ ] 削除時に `users/{uid}` 配下（`workouts` / `food_logs` / `daily_metrics` / `coin_transactions` など）が再帰削除されることを実機で確認
- [ ] 削除後、Firebase Auth のユーザーも削除され再ログイン不可になることを確認

---

## Phase 3: ストア掲載情報

### アセット作成
- [ ] アプリアイコン（512x512 PNG）— 既存の `assets/images/icon.png` をベースに高解像度版を用意
- [ ] フィーチャーグラフィック（1024x500 PNG）
- [ ] スクリーンショット最低 4 枚（phone サイズ）
  - ホーム画面
  - 食事記録画面（AI 解析）
  - トレーニング記録画面
  - 統計画面
- [ ] （任意）タブレット用スクリーンショット

### ストア掲載テキスト
- [ ] アプリ名: `NoteFit AI`
- [ ] 短い説明文（80文字以内）
- [ ] 詳細な説明文（4000文字以内）
- [ ] カテゴリ: `健康＆フィットネス`
- [ ] コンテンツのレーティング質問への回答

### データセーフティ
- [ ] Play Console の「データセーフティ」フォーム記入:
  - **収集するデータ**:
    - メールアドレス（アカウント管理）
    - 身長・体重・体脂肪率（健康＆フィットネス）
    - 食事内容（健康＆フィットネス）
    - トレーニング記録（健康＆フィットネス）
    - 広告 ID（広告配信）
    - 購入履歴（サブスクリプション管理）
  - **データの共有先**: OpenAI（食事テキストのみ）、Google AdMob（広告ID）
  - **暗号化**: 送信時・保管時ともに暗号化
  - **データ削除**: ユーザーがアプリ内からリクエスト可能

---

## Phase 4: ビルド・テスト・提出

### 本番ビルド
```bash
# EAS で Android 本番ビルド
eas build --platform android --profile production

# ビルド状況確認
eas build:list --platform android
```

### 内部テスト
- [ ] Play Console の「内部テスト」トラックにAABをアップロード
- [ ] テスターを追加（最低 20 名を推奨）
- [ ] 14 日間のテスト実施（Google の新規アプリ要件）
- [ ] 主要機能の動作確認:
  - [ ] 新規登録 → メール認証 → オンボーディング
  - [ ] 食事記録（AI 解析 + 手動入力）
  - [ ] トレーニング記録
  - [ ] 体重記録
  - [ ] AI アドバイス表示
  - [ ] AI チャット（コイン消費）
  - [ ] サブスクリプション購入フロー
  - [ ] リワード広告 → コイン獲得
  - [ ] 設定変更（プロフィール、目標、リマインダー等）
  - [ ] アカウント削除

### EAS Submit
```bash
# Play Console に提出（内部テストトラック）
eas submit --platform android --profile production
```

### 本番公開
- [ ] 内部テスト完了 → クローズドテスト（任意）
- [ ] クローズドテスト完了 → 本番公開申請
- [ ] 審査通過を確認（通常 1〜3 日、初回は長引く場合あり）

---

## リリース後

- [ ] クラッシュレポート監視（Play Console / Firebase Crashlytics）
- [ ] ユーザーレビュー対応
- [ ] `versionCode` は `eas.json` の `autoIncrement: true` で自動管理済み
- [ ] 次回アップデート時は `app.json` の `version` を手動で更新

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `app.json` | アプリ名、バンドルID、AdMob App ID、バージョン |
| `app.config.js` | `.env` の環境変数をマージ |
| `eas.json` | EAS Build/Submit 設定 |
| `.env` / `.env.example` | 環境変数（AdMob ユニットID、RevenueCat キー等） |
| `google-services.json` | Firebase Android 設定（Firebase Console からダウンロード） |
| `pc-api-service-account.json` | Play Console API サービスアカウント（EAS Submit 用） |
| `docs/PRIVACY_POLICY.md` | プライバシーポリシーのひな形 |
| `app/settings/index.tsx` | アプリ内のアカウント削除 UI（`deleteMyAccount` 呼び出し） |
| `functions-ai/src/accountDeletion.ts` | Firestore 実データ + Auth アカウントの削除 callable |
