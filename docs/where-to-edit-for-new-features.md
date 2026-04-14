# 新しい機能を実装するとき、どこをいじるか

機能の種類ごとに、**編集するファイル・フォルダ**をまとめています。

> **注意**: 本プロジェクトは **Expo Router（ファイルベースルーティング）** を使用しています。`navigation/` や `screens/` ディレクトリは存在しません。

---

## 一覧（さっと見る用）

| やりたいこと | 主にいじる場所 |
|--------------|----------------|
| **新しいタブ画面を追加する** | `app/(tabs)/` にファイルを追加 + `app/(tabs)/_layout.tsx` |
| **既存タブ画面のUI・挙動を変える** | 対応する `app/(tabs)/〇〇.tsx` |
| **設定画面を追加する** | `app/settings/` にファイルを追加 |
| **ログイン前・認証フローを変える** | `app/(auth)/` 配下のファイル |
| **ルート認証ガード・リダイレクト** | `app/_layout.tsx` |
| **共通デザイン・スタイル** | `theme/styles.ts` |
| **Firestore のデータを読む・書く** | `utils/` に関数を追加 or 既存ファイルを編集 |
| **Firebase の設定を変える** | `firebaseConfig.ts` / `firestore.rules` |
| **Cloud Functions（AI系）** | `functions-ai/src/` |
| **Cloud Functions（非AI系）** | `functions/src/` |

---

## 1. 新しい「タブ画面」を追加する

### やること

1. **`app/(tabs)/` にファイルを作る**
   - 例: `app/(tabs)/mypage.tsx`
   - `export default function MyPageScreen() { ... }` を定義
2. **`app/(tabs)/_layout.tsx` にタブを登録**
   - `<Tabs.Screen name="mypage" ... />` を追加
   - アイコンは `lucide-react-native` から import
3. 既存タブの例を参考にする: `app/(tabs)/home.tsx`, `app/(tabs)/training.tsx`

---

## 2. 既存画面の「見た目・挙動」だけ変える

- **そのファイルを直接編集**
  - 例: `app/(tabs)/food.tsx`, `app/(tabs)/home.tsx`
- **部品として切り出したい**
  - `components/` にコンポーネントを作成（例: `components/home/CalendarSection.tsx`）
  - 画面側で `import` して使う

**スタイルを共通化したい**
- `theme/styles.ts` にスタイルを追加し、各画面で `import { styles } from '../../theme/styles'` して使う

---

## 3. 設定画面を追加する

1. **`app/settings/` にファイルを作る**
   - 例: `app/settings/notifications.tsx`
2. **`app/settings/_layout.tsx`** で Stack にスクリーンが自動登録される（Expo Router のファイルベースルーティング）
3. 設定一覧（`app/settings/index.tsx`）にリンクを追加

### 既存の設定画面

- `app/settings/index.tsx` — 設定一覧
- `app/settings/goals.tsx` — 目標設定
- `app/settings/profile.tsx` — プロフィール
- `app/settings/ai-coach.tsx` — AIコーチ設定
- `app/settings/meal-reminders.tsx` — 食事リマインダー
- `app/settings/monetization.tsx` — サブスクリプション管理

---

## 4. 認証・ログインまわりを変える

| 変更内容 | 編集するファイル |
|----------|------------------|
| ログイン画面のUI・処理 | `app/(auth)/login.tsx` |
| メール認証画面 | `app/(auth)/verify.tsx` |
| オンボーディング（初期設定） | `app/(auth)/onboarding.tsx` |
| ログイン済みかどうかの分岐・リダイレクト | `app/_layout.tsx`（ルートレイアウト） |
| 認証状態の取り方（フック） | `hooks/useAuthState.ts` |
| Firebase Auth の設定 | `firebaseConfig.ts` |

---

## 5. データの取得・保存（Firestore など）を追加する

- **新しいデータの種類や API を用意する**
  - `utils/` に関数を追加（例: `utils/firestoreMeals.ts`）
  - 中で `firebaseConfig.ts` の `db` / `auth` を import して Firestore を読む・書く
- **画面ではその関数を呼ぶだけにする**

**既存のデータ関連ユーティリティ**
- `utils/firestoreProfile.ts` — ユーザープロフィール
- `utils/firestoreDailyMetrics.ts` — 日次メトリクス
- `utils/firestoreDailyAdvice.ts` — AIアドバイスキャッシュ
- `utils/firestoreUtils.ts` — ドキュメントIDサニタイズなど共通関数
- `utils/coinBalance.ts` — コイン残高

**セキュリティ・インデックス**
- ルール変更: `firestore.rules`
- 複合クエリ用インデックス: `firestore.indexes.json`

---

## 6. Cloud Functions を変更する

| コードベース | 場所 | 用途 |
|------------|------|------|
| `functions-ai/` | `functions-ai/src/index.ts` 他 | AI系（OpenAI）・コイン・ミッション・RevenueCat webhook |
| `functions/` | `functions/src/index.ts` | レガシー用（現在は空のエントリポイント） |

- `firebase.json` で 2 つのコードベースが定義されている
- AI に関する処理は **すべて `functions-ai/`** に集約
- デプロイ: `firebase deploy --only functions`

---

## 7. 共通レイアウト・テーマ

| やりたいこと | 編集するファイル |
|--------------|------------------|
| 色・余白・フォントなど共通スタイル | `theme/styles.ts` |
| アプリ全体のラップ（認証チェック・リダイレクトなど） | `app/_layout.tsx` |

---

## 8. フォルダ構成の対応表

```
ルート
├── app/                       … Expo Router ファイルベースルーティング
│   ├── _layout.tsx              → ルートレイアウト（認証ガード・リダイレクト）
│   ├── index.tsx                → / のエントリ（/home へリダイレクト）
│   ├── (auth)/                  → 認証系画面グループ
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── verify.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/                  → メインタブグループ
│   │   ├── _layout.tsx            → タブバー定義
│   │   ├── home.tsx
│   │   ├── training.tsx
│   │   ├── food.tsx
│   │   ├── stats.tsx
│   │   └── ai-advice.tsx
│   └── settings/                → 設定画面（モーダル表示）
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── goals.tsx
│       ├── profile.tsx
│       ├── ai-coach.tsx
│       ├── meal-reminders.tsx
│       └── monetization.tsx
├── components/                … 再利用する部品（モーダル・カードなど）
├── hooks/                     … カスタムフック（認証状態など）
├── utils/                     … ユーティリティ関数
├── constants/                 … 定数定義
├── theme/styles.ts            … 共通スタイル
├── firebaseConfig.ts          … Firebase 初期化
├── firestore.rules            … Firestore のルール
├── functions-ai/              … Cloud Functions（AI系）
├── functions/                 … Cloud Functions（レガシー/非AI）
├── google-services.json       … Firebase Android 設定（要ダウンロード）
└── pc-api-service-account.json … Play Console API キー（EAS Submit 用）
```

---

## 9. リリース・ストア公開に関する設定

| やりたいこと | 編集するファイル |
|--------------|------------------|
| アプリ表示名を変える | `app.json` → `expo.name` |
| バージョン番号を上げる | `app.json` → `expo.version` + `package.json` → `version`（`versionCode` は EAS が自動インクリメント） |
| AdMob App ID をテスト→本番に切り替え | `app.json` → `plugins` → `react-native-google-mobile-ads` の `androidAppId` / `iosAppId` |
| AdMob 広告ユニット ID を設定 | `.env` → `ADMOB_BANNER_UNIT_ID` 等 |
| RevenueCat API キーを設定 | `.env` → `REVENUECAT_ANDROID_API_KEY` 等 |
| Firebase Android 設定 | `google-services.json`（Firebase Console からダウンロード） |
| EAS Submit の設定 | `eas.json` → `submit.production.android` |
| プライバシーポリシーを編集 | `docs/PRIVACY_POLICY.md` |
| リリース手順を確認 | `docs/RELEASE_CHECKLIST.md` |

---

## まとめ

- **「新しいタブ画面」** → `app/(tabs)/` にファイル追加 + `app/(tabs)/_layout.tsx` にタブ登録
- **「新しい設定画面」** → `app/settings/` にファイル追加
- **「既存画面の変更」** → 対応する `app/` 配下のファイル or `components/`
- **「新しいデータ」** → `utils/` に関数を追加し、画面から呼ぶ
- **「見た目の統一」** → `theme/styles.ts`
- **「認証・ルートの分岐」** → `app/_layout.tsx` と `app/(auth)/`

迷ったら、似た機能の既存ファイル（同じタブの画面や同じ種類のユーティリティ）を開いて、同じパターンで追加するのがおすすめです。
