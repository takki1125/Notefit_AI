# NoteFit AI（notefit-ai）プロジェクト仕様書

本書は、本リポジトリを初めて扱う第三者（他社製 AI、新規参画エンジニア、外部パートナー）に対し、**依存関係・アーキテクチャ・データモデル・サーバー API・運用上の注意**を省略せずに伝えるための技術仕様である。

---

## 1. プロダクト概要

- **形態**: モバイル向けフィットネス／食事／体重管理アプリ（日本語 UI 中心）。
- **ブランド識別子（Expo / EAS）**:
  - `app.json` 上の `slug`: `notefit-ai`
  - Android アプリ ID: `com.takimoto.shoa.notefitai`（`app.json`）
  - Expo owner: `takki-and-shoa`
- **主要機能の柱**:
  - Firebase による**メール認証**（未認証ユーザーは verify 画面へ誘導）。
  - **オンボーディング**: プロフィール（目標フェーズ・目標体重・目標カロリー等）未設定時は専用フローへ。
  - **ホーム**: カレンダー、当日トレ、栄養、AI アドバイス、体重入力、目標進捗などを**ドラッグ並び替え可能なウィジェット**として表示。
  - **トレーニング**: 種目マスタ（`master_data`）＋ユーザー定義種目、ルーティン保存、ワークアウト記録を Firestore に保存。
  - **食事**: 手入力・または **Cloud Function 経由の OpenAI による PFC／カロリー推定**。日次の食事一覧は AsyncStorage にキャッシュし、日付が変わるとリセット。Firestore の `food_logs` に日次サマリを保存。
  - **記録（stats）**: 体重推移・食事履歴・ワークアウトの可視化（チャート系ライブラリ使用）。
  - **AI 相談タブ**: チャット形式。サーバー側でコイン消費（Remote Config で単価設定）後、OpenAI で返答。
  - **設定（モーダルスタック）**: プロフィール、目標、食事リマインダー、AI コーチの口調／スタイル、マネタイズ（コイン）画面など。

---

## 2. 技術スタック（リポジトリ内で確認したバージョン）

### 2.1 クライアント（ルート `package.json`）

| 区分 | パッケージ | バージョン（目安） | 役割 |
|------|------------|-------------------|------|
| ランタイム | `expo` | ~54.0.33 | Expo SDK |
| ナビゲーション | `expo-router` | ^5.0.7 | ファイルベースルーティング。`main` は `expo-router/entry` |
| UI 基盤 | `react` / `react-native` | 19.1.0 / 0.81.5 | |
| Web | `react-dom` / `react-native-web` | 19.1.0 / ~0.21.0 | `npm run web` で Web プレビュー可能 |
| Firebase クライアント | `firebase` | ^12.9.0 | Auth / Firestore / Functions（Callable） |
| 永続化 | `@react-native-async-storage/async-storage` | 2.2.0 | 認証永続化、食事タブの日次キャッシュ等 |
| 通知 | `expo-notifications` | ~0.32.16 | 食事リマインダー（**Expo Go では制限あり**。実装は `Constants.appOwnership !== 'expo'` のときのみモジュール読込） |
| 日時ピッカー | `@react-native-community/datetimepicker` | 8.4.4 | |
| ジェスチャー／アニメーション | `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` | 各 Expo 推奨版 | リスト操作・ドラッグ等 |
| ナビゲーション（補助） | `@react-navigation/native`, `bottom-tabs`, `stack`, `elements` | ^7 系 | Tabs / Stack と連携 |
| アイコン | `@expo/vector-icons`, `lucide-react-native`, `expo-symbols` | | |
| 画像 | `expo-image` | ~3.0.11 | |
| その他 Expo | `expo-constants`, `expo-font`, `expo-haptics`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `expo-web-browser`, `@expo/ngrok` | | 開発・体験向上 |
| グラフ | `react-native-chart-kit`, `react-native-gifted-charts`, `react-native-svg` | | 記録画面等 |
| リスト | `react-native-draggable-flatlist` | ^4.0.3 | ホームウィジェット並び替え |
| **AI SDK（クライアント）** | `openai` | ^6.29.0 | **現状のソースgrepではクライアント TS/TSX から未使用。OpenAI 呼び出しは Cloud Functions 側。** 依存は将来用または削除検討可。 |

### 2.2 開発ツール（ルート）

- `typescript` ~5.9.2（`strict: true`）
- `eslint` ^9.25.0 + `eslint-config-expo` ~10.0.0
- `tsconfig`: `expo/tsconfig.base` 継承、パスエイリアス `@/*` → リポジトリルート

### 2.3 Cloud Functions（`functions/` と `functions-ai/`）

両方とも **Node 20**、`firebase-admin` ^12、`firebase-functions` ^5、`openai` ^4 系（サーバー用）。

---

## 3. リポジトリ構成

```
notefit-ai/
├── app/                    # Expo Router 画面（ファイル＝ルート）
│   ├── _layout.tsx         # ルート：認証ガード、Settings をモーダルで積む
│   ├── index.tsx           # `/` → `/home` へ Redirect
│   ├── (auth)/             # login, verify, onboarding
│   ├── (tabs)/             # home, ai-advice, training, food, stats
│   └── settings/           # 設定スタック（modal 内）
├── components/             # 再利用 UI（ai, home, metrics, monetization, training 等）
├── screens/                # 一部画面ロジック（HomeScreen, TrainingScreen 等）
├── hooks/                  # useAuthState, useRoutines, useCoinBalance 等
├── utils/                  # Firestore アクセス、通知、マネタイズ型、advice 用コンテキスト組み立て
├── theme/                  # スタイル
├── constants/              # homeWidgets, monetizationPreview 等
├── firebaseConfig.ts       # Firebase 初期化（**秘密情報が平文で含まれる。後述**）
├── app.json / eas.json     # Expo / EAS 設定
├── firebase.json           # Firestore + 2  codebase の Functions 定義
├── firestore.rules         # セキュリティルール
├── firestore.indexes.json  # 現状 indexes 空配列
├── functions/              # Cloud Functions codebase: default（analyzeFoodPFC のみ）
├── functions-ai/           # Cloud Functions codebase: ai（本番相当の AI・コイン一式）
├── App.js                  # レガシー構成の名残（`package.json` の entry は expo-router）
└── serviceAccountKey.json  # **Firebase 管理用キー。リポジトリにある場合は極めて高リスク（後述）**
```

---

## 4. アプリのナビゲーションと認証フロー

### 4.1 エントリ

- `package.json` の `"main": "expo-router/entry"` により **`app/` 以下が実体**。

### 4.2 ルートレイアウト（`app/_layout.tsx`）

1. `useAuthState` で Firebase Auth を購読。
2. メール **未検証**のログインユーザーは `/verify` へ。
3. 検証済みで **Firestore に目標プロフィールが無い**場合は `/onboarding`（`getUserProfile` が `null`）。
4. 上記を満たしたユーザーが `(auth)` 配下にいる場合は `/home` へ。
5. 未ログインは `/login`。
6. UI ツリーは `Stack`：`"(tabs)"`, `"(auth)"`, `"settings"`（**settings は `presentation: 'modal'`**）。

### 4.3 タブ（`app/(tabs)/_layout.tsx`）

| ルート名 | タブラベル | 役割 |
|----------|------------|------|
| `home` | ホーム | ウィジェット集約、AI 日次アドバイスカード等 |
| `ai-advice` | AI相談 | `aiCoachChat` Callable、コイン残高表示 |
| `training` | トレ | セッション・ルーティン・マスタ参照 |
| `food` | 食事 | PFC 記録、`analyzeFoodPFC` |
| `stats` | 記録 | グラフ・履歴 |

### 4.4 設定（`app/settings/`）

- `index`（メニュー）、`profile`, `goals`, `meal-reminders`, `ai-coach`, `monetization` が `_layout` で登録されている。

### 4.5 補助効果

- ログアウト時: `cancelMealReminderNotifications()` でローカル通知スケジュールを掃除。
- プロフィール確定後: `getMealReminderSettings` → `syncMealReminderSchedules` で通知再同期。

---

## 5. Firebase プロジェクト設定

- **`.firebaserc` の default プロジェクト ID**: `kennkoukannri-kari`
- **`firebaseConfig.ts`**: 同プロジェクト向けの Web API キー等がコードに埋め込まれている（クライアント公開前提の設定だが、**原則として環境変数化・別管理を推奨**）。
- **Firestore ロケーション**（`firebase.json`）: `asia-northeast1`
- **Callable Functions のリージョン**（クライアント呼び出し）: `getFunctions(app, "asia-northeast1")` で統一されている。

---

## 6. Firestore データモデル

### 6.1 トップレベル

| コレクション | 用途 | クライアント書き込み（ルール基準） |
|--------------|------|-----------------------------------|
| `master_data/{docId}` | 種目マスタ等。**構造例**: ドキュメントに `label`, `categories: { [key]: { exercises: string[] } }` または `exercises: string[]` | **読み取りのみ**（書込 `false`） |
| `users/{userId}` | ユーザープロフィール・設定フラグの本体 | 本人のみ read/write |

### 6.2 `users/{uid}` ドキュメント（主要フィールドの目安）

実装は `utils/firestoreProfile.ts` 等で `setDoc(..., { merge: true })`。

- **目標・プロフィール**: `phase` (`cut` | `maintain` | `bulk`), `targetWeight`, `targetCal`, `isDetailedTrackingEnabled`
- **身体情報（任意）**: `heightCm`, `birthDate`（`YYYY-MM-DD`）
- **食事リマインダー**: `mealRemindersEnabled`, `mealReminderBreakfastHour` ほか各 `*Hour/*Minute`
- **AI コーチ設定**: `aiCoachStyle`, `aiTonePreset`, `aiCustomInstructions`
- **その他**: `username`, `updatedAt` 等

### 6.3 `users/{uid}` サブコレクション

| パス | 用途 | 備考 |
|------|------|------|
| `daily_metrics/{YYYY-MM-DD}` | 日次体重・体脂肪率 | `orderBy('date')` で直近 N 日取得 |
| `daily_advice/{YYYY-MM-DD}` | その日の AI アドバイス本文キャッシュ | `contextFingerprint` で再生成判定に利用 |
| `food_logs/{docId}` | 日次食事ログ | **docId 規則**: `${YYYY-MM-DD}_Food`（`food.tsx` と `adviceContext.ts` で共通） |
| `food_dictionary/{foodName}` | ユーザー別の食品辞書（PFC 付き） | ドキュメント ID に食品名を用いる実装あり |
| `workouts/{docId}` | トレーニングセッション | `date`, `dateObj`, `routineName`, `durationSeconds`, `exercises[]`（セット・重量等） |
| `routines/{docId}` | 保存ルーティン | `name`, `exercises`, `createdAt` 等 |
| `custom_exercises/{docId}` | ユーザー定義種目 | |
| `coin_transactions/{txId}` | **コイン台帳** | **`registration_bonus` は固定 docId で冪等マーカー**として `create` 使用。クライアントからの write **禁止** |
| `mission_events/{eventId}` | ミッション等の監査ログ想定 | ルール上クライアント write **禁止** |

### 6.4 インデックス

- `firestore.indexes.json` は **空**。`daily_metrics` の `orderBy('date')` 等は単一フィールドオーダーで運用されている想定（データ量増加時は複合インデックス要確認）。

---

## 7. Firestore セキュリティルール要約（`firestore.rules`）

- `master_data`: 認証ユーザーのみ read、write 不可。
- `users/{userId}`: 本人のみ read/write。
- `coin_transactions`, `mission_events`: 本人 read のみ、**write 全拒否**（サーバー Admin のみ想定）。
- `workouts`, `food_logs`, `food_dictionary`, `routines`, `custom_exercises`, `daily_advice`, `daily_metrics`: 本人 read/write 可。

---

## 8. Cloud Functions

### 8.1 デプロイ構成（`firebase.json`）

| codebase | source | runtime | 備考 |
|----------|--------|---------|------|
| **default** | `functions/` | nodejs20 | エクスポート: **`analyzeFoodPFC` のみ**（`functions/src/index.ts`） |
| **ai** | `functions-ai/` | nodejs20 | predeploy: `npm run build`。**`grantRegistrationBonus`, `analyzeFoodPFC`, `generateDailyAIAdvice`, `aiCoachChat`** |

### 8.2 重要: 関数名の重複

- **`analyzeFoodPFC` が `functions` と `functions-ai` の両方に存在する。**
- Firebase のマルチ codebase でも**同一プロジェクト内で同名のデプロイ対象関数が競合する可能性が高い**。実際にどちらが有効かはデプロイ順・設定次第。**運用上はどちらか一方を残し、もう一方を削除またはリネームすることを強く推奨。**
- クライアント（`food.tsx`）は **`httpsCallable(..., "analyzeFoodPFC")`** のみ呼び出しており、**名前空間のプレフィックスは付けていない**。

### 8.3 シークレット・環境

- **Gen2 Callable** で `defineSecret("OPENAI_API_KEY")` を使用。
- デプロイ前に Firebase Secret Manager に `OPENAI_API_KEY` を設定する必要がある。
- **`grantRegistrationBonus`** は `secrets` に **含めず** `publicCallableOpts`（CORS とリージョンのみ）。認証は `request.auth` で確認。

### 8.4 リージョン

- いずれも **`asia-northeast1`**。

---

## 9. Callable API 仕様（クライアント〜サーバー契約）

以下は **`functions-ai`** の実装に基づく（`functions` の `analyzeFoodPFC` はロジックほぼ同等だが重複）。

### 9.1 `grantRegistrationBonus`

- **認証**: 必須（未認証は `unauthenticated`）。
- **リクエスト**: 空オブジェクトで可（`{}`）。
- **レスポンス**: `{ granted: boolean, amount?: number }`
- **挙動**: Remote Config の `registration_bonus_coins`（未設定時デフォルト **300**）を、`coin_transactions/registration_bonus` ドキュメントの **`create` で冪等化**。既に存在すれば `granted: false`。
- **クライアント**: `utils/coinBalance.ts` の `requestRegistrationBonus()`。

### 9.2 `analyzeFoodPFC`

- **認証**: 必須。
- **入力**（`request.data`）:
  - `text: string` — 食事内容の自然文（必須・非空）。
  - `demographics?: { heightCm?, birthDate? (YYYY-MM-DD), ageYears? }` — 任意。サーバーでバリデーション。
- **出力**:  
  `{ total: { name, cal, pro, fat, carb }, items: Array<{ name, cal, pro, fat, carb }> }`
- **モデル**: OpenAI `gpt-4o-mini`, `response_format: json_object`, `temperature` 0.2。

### 9.3 `generateDailyAIAdvice`

- **認証**: 必須。
- **入力**（主要）:
  - `phase`: `'cut' | 'maintain' | 'bulk'`
  - `targetWeight`, `targetCal`: 正の数値
  - `today`: `{ weight, bodyFatPercentage? }` — `weight` 必須（正の数）
  - `recentWeights`: `{ dateId, weight, bodyFatPercentage? }[]`
  - `todayNutrition`: `adviceContext.ts` の `AdviceNutritionPayload` に対応する形（`hasData`, 合算 PFC, `mealNames`）
  - `recentWorkouts`: ワークアウト要約（`dateId`, `routineName`, `durationMinutes`, `isToday`, `exerciseLines`）
  - **AI コーチ**: `coachStyle`, `tone`, `customInstructions`（500 文字上限・サニタイズ）
  - `demographics`: 任意（上記と同形）
- **出力**:  
  `{ title, bullets: string[]（最大3）, calorieAdvice, workoutAdvice }`
- **論理**:
  - 記録が乏しい場合 **`sparseContext`** モード（推測禁止・次の一歩中心）。
  - 食事・トレ記録が無い場合、プロンプト上「ない」と明示し幻のメニューを書かせない。
- **モデル**: `gpt-4o-mini`, JSON モード, temperature 0.2〜0.3。

### 9.4 `aiCoachChat`

- **認証**: 必須。
- **入力**:
  - `messages`: `{ role: 'user'|'assistant', content: string }[]` — 末尾は必ず `user`。各内容最大 **8000** 文字、全体 **`messages` は直近40件**にサニタイズ。
  - 同じく `coachStyle`, `tone`, `customInstructions`, `demographics`、および **`generateDailyAIAdvice` と同形のコンテキスト**（`buildChatAdviceContextBlock` がホームと同種の事実ブロックを組み立てる）。
- **コイン**:
  - Remote Config `ai_consult_coins_per_turn`（未設定時デフォルト **10**）が **0 より大きい**場合、`spendCoinsForAiChatOrThrow` で消費。残高不足は `failed-precondition`。
  - OpenAI 初期化失敗・応答失敗時は **`refundAiChatCoins`** で返金を試みる。
- **出力**: `{ reply: string, coinsCharged: number }`
- **モデル**: `gpt-4o-mini`, `temperature` 0.65, `max_tokens` 1200, **JSON モードは使用しない**（自由文返答）。

---

## 10. マネタイズ・コイン設計

### 10.1 残高計算

- **サーバー**（`functions-ai/src/coins.ts`）と**クライアント**（`utils/coinBalance.ts`）の双方で、  
  `coin_transactions` の `amount` を合算するが、**正の付与は `expires_at` が未来のもののみ有効**、負の消費は無期限扱い（`expires_at` が極大値）という整合ロジック。
- **失効**: 付与から **179 日**（`COIN_EXPIRY_DAYS` / `COIN_EXPIRY_DAYS_FROM_GRANT`）。資金決済法対応コメントあり。

### 10.2 消費タイプ

- AI チャット: `type: "ai_consume"`, `note` に `ai_coach_chat` 等。

### 10.3 Remote Config キー（`utils/monetizationTypes.ts` とサーバー `RC_KEYS` の対応）

クライアント側で列挙されているキー（一部は将来用で未実装の可能性）:

| キー | 用途 |
|------|------|
| `ai_consult_coins_per_turn` | AI 相談 1 往復あたりのコイン（サーバーで実使用） |
| `registration_bonus_coins` | 登録ボーナス（サーバーで実使用） |
| `ai_model_default` / `ai_model_premium` | 注釈上は Tier 別モデル切替想定だが、**現行 Cloud Functions コードはモデル固定（gpt-4o-mini）** |
| `reward_ad_coins`, `login_bonus_base_coins` | ミッション／広告報酬等の将来拡張用の名前空間 |

### 10.4 サブスクリプション Tier 型

- `SubscriptionTier`: `free | tier1 | tier2`
- `dailyMissionSlotCount`: 無料 3 / 有料 5（**ミッション UI の実装は本ドキュメント作成時点で未確認**。型・定数のみ存在）

### 10.5 クライアントの残高購読

- `hooks/useCoinBalance.ts` → `onSnapshot` on `users/{uid}/coin_transactions`。

---

## 11. ホームウィジェットと AI アドバイス連携

- **並び順**: `constants/homeWidgets.ts` の `HOME_WIDGET_IDS` がデフォルト順。`hooks/useHomeWidgetOrder.ts` で AsyncStorage に永続化。
- **日次アドバイス**: `components/ai/DailyAIAdviceCard.tsx` が `generateDailyAIAdvice` を呼び、`utils/adviceContext.ts` で当日の `food_logs`・直近 `workouts`・`daily_metrics` からコンテキストを構築。結果は `daily_advice/{date}` にキャッシュ（フィンガープリントで更新制御）。

---

## 12. 食事タブのローカル状態

- **AsyncStorage キー**:  
  - `@food_meals_today_{uid}` — 当日の `Meal[]`  
  - `@food_last_opened_date_{uid}` — 日付変更検知用（`toDateString()`）
- 日付が変わるとメモリ上の食事一覧をクリアし、Firestore への日次 doc は新しい日付で別 ID になる。

---

## 13. 通知（食事リマインダー）

- `utils/mealReminderNotifications.ts`: Android チャネル ID `meal-reminders`、スケジュールデータに `mealReminder: true` を付与し、キャンセル時にフィルタ。
- **Expo Go（SDK 53+）** では通知モジュール自体を読まないガードあり。**実機ビルド（development / preview / production）で検証する想定。**

---

## 14. ビルド・デプロイ

### 14.1 Expo / EAS（`eas.json`）

- profiles: `development`（developmentClient 有効）, `preview`, `production`（`autoIncrement`）
- CLI バージョン要件: `>= 18.4.0`
- `appVersionSource`: `remote`

### 14.2 npm スクリプト（ルート）

- `npm run start` — `expo start`
- `npm run android` / `ios` / `web`
- `npm run lint` — `expo lint`

### 14.3 Functions

- `functions`: `npm run build`（`tsc`）→ `lib/`
- `functions-ai`: 同様、`firebase deploy` 時 predeploy でビルド

---

## 15. 秘密情報・セキュリティ・コンプライアンス上の注意

1. **`firebaseConfig.ts`**: Web API キー等がリポジトリに含まれる。**公開リポジトリにしないこと。環境変数・Expo の `extra` 等への移行を推奨。**
2. **`serviceAccountKey.json`**: Admin SDK 用サービスアカウント鍵。**`.gitignore` に含まれておらず、誤ってコミットされるリスクがあった**。公開・共有禁止。不要なら削除し、CI は Workload Identity 等で代替。
3. **`OPENAI_API_KEY`**: Secret Manager のみに保持。リポジトリに置かない。
4. **クライアントの `openai` パッケージ**: 未使用なら削除で攻撃面・混乱を削減。
5. **`analyzeFoodPFC` 二重定義**: デプロイ事故・挙動不透明の原因。**整理を最優先課題として扱うこと。**

---

## 16. 既存ファイル参照マップ（調査の起点）

| 関心 | ファイル |
|------|----------|
| 認証・ルートガード | `app/_layout.tsx`, `hooks/useAuthState.ts` |
| Firebase 初期化 | `firebaseConfig.ts` |
| プロフィール／コーチ設定 | `utils/firestoreProfile.ts`, `utils/aiCoachSettings.ts`, `utils/models.ts` |
| 日次体重 | `utils/firestoreDailyMetrics.ts` |
| 日次アドバイス保存 | `utils/firestoreDailyAdvice.ts`, `components/ai/DailyAIAdviceCard.tsx` |
| アドバイス用コンテキスト | `utils/adviceContext.ts` |
| 食事・PFC Callable | `app/(tabs)/food.tsx` |
| AI チャット | `app/(tabs)/ai-advice.tsx` |
| コイン | `utils/coinBalance.ts`, `hooks/useCoinBalance.ts`, `utils/monetizationTypes.ts`, `functions-ai/src/coins.ts` |
| 通知 | `utils/mealReminderNotifications.ts`, `app/settings/meal-reminders.tsx` |
| サーバー AI 本体 | `functions-ai/src/index.ts` |
| ルール | `firestore.rules` |

---

## 17. 改訂履歴

| 日付 | 内容 |
|------|------|
| 2026-03-30 | 初版（リポジトリ静的解析に基づく全件スキャン結果） |

---

*本仕様書はソースツリーから抽出した事実に基づく。実行時の Firebase コンソール設定（Authentication 有効プロバイダ、Remote Config の実値、実際にデプロイされている関数名）はデプロイ環境で要確認。*
