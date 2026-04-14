# NoteFit AI — コードベース完全ガイド

> **最終更新**: 2026-04-14
> **対象**: 本プロジェクトに新しく参加する開発者、または AI（Gemini/ChatGPT 等）にプロジェクト全体を理解させるためのリファレンス。

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構成（全体ツリー）](#3-ディレクトリ構成全体ツリー)
4. [アプリ（クライアント側）の詳細](#4-アプリクライアント側の詳細)
   - 4.1 ルーティング（Expo Router）
   - 4.2 画面一覧と役割
   - 4.3 コンポーネント（`components/`）
   - 4.4 カスタムフック（`hooks/`）
   - 4.5 ユーティリティ関数（`utils/`）
   - 4.6 定数（`constants/`）
   - 4.7 テーマ・スタイル（`theme/`）
   - 4.8 型定義（`utils/models.ts`）
5. [Cloud Functions（サーバー側）の詳細](#5-cloud-functionsサーバー側の詳細)
   - 5.1 コードベース構成（`functions/` と `functions-ai/`）
   - 5.2 `functions-ai/` 各ファイルの役割
   - 5.3 エクスポートされている Cloud Function 一覧
6. [Firebase 構成](#6-firebase-構成)
   - 6.1 Firestore データモデル
   - 6.2 Firestore セキュリティルール
   - 6.3 Firebase Auth
7. [設定ファイル一覧と役割](#7-設定ファイル一覧と役割)
8. [依存関係の詳細](#8-依存関係の詳細)
   - 8.1 クライアント dependencies
   - 8.2 クライアント devDependencies
   - 8.3 `functions-ai/` dependencies
9. [マネタイズ・課金システム](#9-マネタイズ課金システム)
10. [環境変数・シークレット管理](#10-環境変数シークレット管理)
11. [ビルド・デプロイ](#11-ビルドデプロイ)
12. [テスト](#12-テスト)
13. [開発の進め方・規約](#13-開発の進め方規約)

---

## 1. プロジェクト概要

**NoteFit AI** は、食事・トレーニング・体重を記録し、AI（OpenAI GPT-4o-mini）が PFC（タンパク質・脂質・炭水化物）推定や日次アドバイス、フリーチャット相談を提供するフィットネスアプリ。

### 主要機能

| 機能 | 概要 |
|------|------|
| **食事記録（Food タブ）** | 自然文入力 → AI が PFC/カロリーを自動推定。手動入力、食事辞書（お気に入り・履歴）、食事ルーティーン（テンプレ保存）もサポート |
| **トレーニング記録（Training タブ）** | 種目マスター＋カスタム種目。セット×レップ×重量の記録。ルーティーン（テンプレ）保存 |
| **ホーム（Home タブ）** | カレンダー＋本日の体重/体脂肪入力。AI デイリーアドバイスカード。体重推移グラフ。ウィジェット並び替え |
| **統計（Stats タブ）** | 体重推移・部位別/種目別の推定 1RM 推移グラフ |
| **AI 相談（AI Advice タブ）** | フリーチャット形式のコーチ AI。コーチスタイル/口調カスタマイズ対応 |
| **設定** | 目標設定（減量/維持/増量 + 目標体重 + 目標カロリー）、プロフィール、AI コーチ設定、食事リマインダー通知、サブスクリプション管理 |
| **マネタイズ** | RevenueCat 経由サブスク（tier1/tier2）、AdMob 広告（バナー/インタースティシャル/リワード）、コインシステム（AI チャット消費、ミッション獲得、ログインボーナス等） |

### Firebase プロジェクト

- **プロジェクト ID**: `kennkoukannri-kari`
- **リージョン**: `asia-northeast1`（東京）
- **EAS プロジェクト ID**: `1ecff325-3fa5-4e9b-ae1b-36ac4c6f76ea`
- **バンドル ID（iOS/Android共通）**: `com.takimoto.shoa.notefitai`

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | Expo SDK | ~54.0.33 |
| ルーティング | Expo Router（ファイルベース） | ~6.0.23 |
| UI | React Native | 0.81.5 |
| 言語 | TypeScript (strict) | ~5.9.2 |
| 状態管理 | React hooks（useState/useEffect/useCallback）+ AsyncStorage でローカルキャッシュ |  |
| バックエンド | Firebase (Firestore, Auth, Cloud Functions Gen2) | firebase ^12.9.0 (client), firebase-admin ^12.0.0 / firebase-functions ^5.0.0 (server) |
| AI | OpenAI API (GPT-4o-mini) via Cloud Functions | openai ^4.0.0 |
| 課金 | RevenueCat | react-native-purchases ^9.15.2 |
| 広告 | Google AdMob | react-native-google-mobile-ads ^16.3.1 |
| グラフ | react-native-chart-kit / react-native-gifted-charts | |
| アニメーション | react-native-reanimated | ~4.1.1 |
| 通知 | expo-notifications | ~0.32.16 |
| テスト | Jest + ts-jest | jest ^30.3.0 |
| ビルド | EAS Build / EAS Submit | |
| Functions ランタイム | Node.js 20 | |

---

## 3. ディレクトリ構成（全体ツリー）

```
notefit-ai/
├── app/                          # Expo Router ファイルベースルーティング（全画面）
│   ├── _layout.tsx                 # ルートレイアウト（認証ガード・リダイレクト・Stack定義）
│   ├── index.tsx                   # "/" → /home へリダイレクト
│   ├── (auth)/                     # 認証系画面グループ（未ログイン時に表示）
│   │   ├── _layout.tsx               # Stack レイアウト
│   │   ├── login.tsx                 # ログイン画面
│   │   ├── verify.tsx                # メール認証待ち画面
│   │   └── onboarding.tsx            # 初期設定（目標・体重など）
│   ├── (tabs)/                     # メインタブグループ（ログイン後）
│   │   ├── _layout.tsx               # BottomTabs 定義
│   │   ├── home.tsx                  # ホーム（カレンダー・体重入力・AIアドバイス）
│   │   ├── training.tsx              # トレーニング記録
│   │   ├── food.tsx                  # 食事記録
│   │   ├── stats.tsx                 # 統計グラフ
│   │   └── ai-advice.tsx             # AIフリーチャット相談
│   └── settings/                   # 設定画面（モーダル表示）
│       ├── _layout.tsx               # Stack レイアウト
│       ├── index.tsx                 # 設定一覧
│       ├── goals.tsx                 # 目標設定
│       ├── profile.tsx               # プロフィール編集
│       ├── ai-coach.tsx              # AIコーチスタイル設定
│       ├── meal-reminders.tsx        # 食事リマインダー通知設定
│       └── monetization.tsx          # サブスク・コイン管理
│
├── components/                   # 再利用コンポーネント
│   ├── SubscriptionEntitlementSync.tsx  # RevenueCat ↔ ローカルstate 同期
│   ├── ads/                        # 広告関連（.web.tsx はWeb向けスタブ）
│   │   ├── BannerAdSlot.tsx / .web.tsx
│   │   ├── RewardedAdOfferRow.tsx / .web.tsx
│   │   └── RewardedAdOfferRowProps.ts
│   ├── ai/
│   │   └── DailyAIAdviceCard.tsx     # ホーム用 AI アドバイスカード
│   ├── goal/
│   │   └── GoalProgressCard.tsx      # 目標進捗カード
│   ├── goals/
│   │   └── AutoCalorieModal.tsx      # カロリー自動計算モーダル
│   ├── home/
│   │   ├── CalendarSection.tsx       # カレンダー UI
│   │   └── WorkoutDetailModal.tsx    # ワークアウト詳細モーダル
│   ├── metrics/
│   │   ├── DailyMetricQuickInput.tsx # 体重・体脂肪クイック入力
│   │   └── WeightTrendCard.tsx       # 体重推移グラフカード
│   ├── monetization/
│   │   ├── CoinHubSummary.tsx        # コイン残高サマリ
│   │   └── FeatureStatusBadge.tsx    # 有料/無料バッジ表示
│   └── training/
│       ├── ExerciseSelectorModal.tsx  # 種目選択モーダル
│       └── RoutineModal.tsx          # ルーティーン選択モーダル
│
├── hooks/                        # カスタムフック
│   ├── useAuthState.ts             # Firebase Auth 状態監視
│   ├── useCoinBalance.ts           # コイン残高リアルタイム購読
│   ├── useExerciseMaster.ts        # 種目マスター + カスタム種目
│   ├── useHomeWidgetOrder.ts       # ホームウィジェット並び順
│   ├── useRoutines.ts              # トレーニングルーティーン CRUD
│   ├── useSubscriptionEntitlements.ts # RevenueCat エンタイトルメント
│   ├── useTrainingSession.ts       # トレーニングセッション管理
│   ├── useWorkoutHistory.ts        # ワークアウト履歴
│   └── useWorkoutStats.ts          # ワークアウト統計
│
├── utils/                        # ユーティリティ関数（画面から呼び出す）
│   ├── models.ts                   # 共通型定義（Phase, UserProfile, DailyMetric 等）
│   ├── firestoreProfile.ts         # ユーザープロフィール・設定の Firestore CRUD
│   ├── firestoreDailyMetrics.ts    # 日次メトリクス（体重等）の Firestore CRUD
│   ├── firestoreDailyAdvice.ts     # AIアドバイスキャッシュの Firestore CRUD
│   ├── firestoreUtils.ts           # Firestore ドキュメントID サニタイズ（sanitizeDocId）
│   ├── firestoreUtils.test.ts      # ↑のテスト
│   ├── adviceContext.ts            # AIアドバイス生成用コンテキスト収集
│   ├── aiCoachSettings.ts          # AIコーチスタイル関連定数・正規化
│   ├── aiUserContentCallables.ts   # Cloud Functions callable 呼び出し（種目・ルーティーン CRUD）
│   ├── coinBalance.ts              # コイン残高取得・登録ボーナス・リワード広告報酬
│   ├── demographics.ts             # 年齢計算（生年月日→満年齢）
│   ├── estimateCalories.ts         # BMR ベースのカロリー自動計算
│   ├── monetizationTypes.ts        # マネタイズ関連の型・定数（クライアント/サーバー共通契約）
│   ├── missionCallables.ts         # ミッション取得・報酬請求の callable 呼び出し
│   ├── revenueCat.ts               # RevenueCat SDK 初期化・ユーザー同期
│   ├── revenueCatPurchaseErrors.ts # RevenueCat 購入エラーの日本語化
│   ├── adMobUnits.ts               # AdMob 広告ユニットID 取得ヘルパー
│   ├── adSuppression.ts            # 非リワード広告の一時抑制（購入フロー中など）
│   ├── interstitialAdPresenter.ts  # インタースティシャル広告の表示ロジック
│   ├── mobileAdsInit.ts            # AdMob SDK 初期化
│   ├── grantRewardCallableConfig.ts # リワード広告報酬 callable URL 取得
│   ├── mealReminderNotifications.ts # 食事リマインダー通知スケジュール管理
│   ├── homeTutorialStorage.ts      # ホーム画面チュートリアル表示制御
│   ├── time.ts                     # 時刻フォーマット
│   └── workoutCategories.ts        # 部位分類（BodyPart）
│
├── constants/                    # 定数定義
│   ├── adPlacement.ts              # 広告表示頻度（何回食事追加でインタースティシャルを出すか等）
│   ├── homeWidgets.ts              # ホーム画面ウィジェットIDと並び順
│   ├── monetizationPreview.ts      # サブスクプラン・コインパックのプレビュー定義
│   └── subscriptionLimits.ts       # 無料プランの上限値（カスタム種目数、ルーティーン数）
│
├── theme/
│   └── styles.ts                   # アプリ全体の共通スタイル（ダークテーマ基調）
│
├── functions/                    # Cloud Functions — default コードベース（レガシー/空）
│   ├── src/index.ts                # 空のエントリポイント（export {}）
│   ├── package.json                # firebase-admin, firebase-functions のみ
│   ├── tsconfig.json
│   ├── seed_exercises.py           # 種目マスターデータ投入スクリプト（Python）
│   └── main.py                     # Python 用ヘルパー
│
├── functions-ai/                 # Cloud Functions — ai コードベース（メイン）
│   ├── src/
│   │   ├── index.ts                # エントリポイント（全 callable/webhook をエクスポート）
│   │   ├── coins.ts                # コイン台帳ロジック（付与・消費・FIFO・残高計算）
│   │   ├── missions.ts             # デイリーミッション判定・報酬付与
│   │   ├── revenueCatWebhook.ts    # RevenueCat Webhook 受信（サブスク同期・コイン付与）
│   │   ├── subscriptionMirror.ts   # サブスク状態の Firestore ミラーリング
│   │   └── userContentCallables.ts # マイ種目・食事ルーティーンの CRUD callable
│   ├── package.json                # openai, date-fns, firebase-admin, firebase-functions
│   └── tsconfig.json
│
├── docs/                         # プロジェクトドキュメント
│   ├── CODEBASE_OVERVIEW.md        # ← このファイル（プロジェクト全体の正本）
│   ├── food-ai-auto-analysis.md    # 食事AI自動解析機能の実装リファレンス
│   ├── where-to-edit-for-new-features.md # 機能追加時の編集ガイド
│   ├── PRIVACY_POLICY.md           # プライバシーポリシー（ストア掲載用ひな形）
│   └── RELEASE_CHECKLIST.md        # Google Play Store リリース手順チェックリスト
│
├── assets/images/                # アプリアイコン・スプラッシュ画像
│
├── firebaseConfig.ts             # Firebase 初期化（db, auth をエクスポート）
├── firebase.json                 # Firebase CLI 設定（Firestore + 2つの Functions コードベース）
├── .firebaserc                   # Firebase プロジェクトエイリアス
├── firestore.rules               # Firestore セキュリティルール
├── firestore.indexes.json        # Firestore 複合インデックス定義
│
├── app.json                      # Expo 静的設定（バンドルID、プラグイン、バージョン等）
├── app.config.js                 # Expo 動的設定（.env から環境変数をマージ）
├── tsconfig.json                 # TypeScript 設定（expo/tsconfig.base 拡張、strict）
├── eslint.config.js              # ESLint flat config（eslint-config-expo）
├── jest.config.js                # Jest 設定（ts-jest, node 環境）
├── eas.json                      # EAS Build / Submit 設定
├── package.json                  # npm 依存関係・スクリプト
├── .env.example                  # 環境変数テンプレート
├── .gitignore                    # Git 除外設定
└── README.md
```

---

## 4. アプリ（クライアント側）の詳細

### 4.1 ルーティング（Expo Router）

Expo Router のファイルベースルーティングを採用。`app/` ディレクトリの構造がそのままルーティングツリーになる。

```
ルートレイアウト: app/_layout.tsx
├── (auth)/ グループ        … 未ログイン/未認証時のみアクセス
│   ├── login              … /login
│   ├── verify             … /verify
│   └── onboarding         … /onboarding
├── (tabs)/ グループ        … ログイン後のメインUI（BottomTabs）
│   ├── home               … /home
│   ├── training            … /training
│   ├── food               … /food
│   ├── stats              … /stats
│   └── ai-advice          … /ai-advice
└── settings/ グループ      … モーダル表示（presentation: 'modal'）
    ├── index              … /settings
    ├── goals              … /settings/goals
    ├── profile            … /settings/profile
    ├── ai-coach           … /settings/ai-coach
    ├── meal-reminders     … /settings/meal-reminders
    └── monetization       … /settings/monetization
```

**認証ガード**（`app/_layout.tsx`）:
- `useAuthState()` で Firebase Auth のユーザー状態を監視
- 未ログイン → `/login` にリダイレクト
- ログイン済み & メール未認証 → `/verify` にリダイレクト
- メール認証済み & プロフィール未設定 → `/onboarding` にリダイレクト
- すべて完了 → `(tabs)` グループへ

### 4.2 画面一覧と役割

| 画面ファイル | URL パス | 役割 |
|-------------|---------|------|
| `app/index.tsx` | `/` | `/home` へ即リダイレクト |
| `app/(auth)/login.tsx` | `/login` | メール/パスワードログイン + 新規登録 |
| `app/(auth)/verify.tsx` | `/verify` | メール認証待ち（再送信ボタン付き） |
| `app/(auth)/onboarding.tsx` | `/onboarding` | 初回設定（フェーズ/目標体重/目標カロリー） |
| `app/(tabs)/home.tsx` | `/home` | カレンダー、体重/体脂肪入力、AIアドバイスカード、体重推移グラフ、ウィジェット並び替え |
| `app/(tabs)/training.tsx` | `/training` | トレーニング記録（種目追加、セット入力、ルーティーン、タイマー、ワークアウト保存） |
| `app/(tabs)/food.tsx` | `/food` | 食事記録（AI解析入力、手動入力、食事辞書/お気に入り、食事ルーティーン） |
| `app/(tabs)/stats.tsx` | `/stats` | 体重推移グラフ、部位別/種目別の推定1RMグラフ |
| `app/(tabs)/ai-advice.tsx` | `/ai-advice` | AIコーチとのフリーチャット（コインシステム連動） |
| `app/settings/index.tsx` | `/settings` | 設定一覧（ログアウト、アカウント削除、各種トグル） |
| `app/settings/goals.tsx` | `/settings/goals` | 減量/維持/増量、目標体重、目標カロリー（自動計算モーダル付き） |
| `app/settings/profile.tsx` | `/settings/profile` | ユーザーネーム、身長、生年月日 |
| `app/settings/ai-coach.tsx` | `/settings/ai-coach` | AIコーチスタイル（4種）、口調（4種）、追加メモ |
| `app/settings/meal-reminders.tsx` | `/settings/meal-reminders` | 朝/昼/夕の通知時刻設定 |
| `app/settings/monetization.tsx` | `/settings/monetization` | サブスクプラン、コイン残高、リワード広告、ミッション |

### 4.3 コンポーネント（`components/`）

| ファイル | 説明 |
|---------|------|
| `SubscriptionEntitlementSync.tsx` | RevenueCat のエンタイトルメント変更を監視し、広告抑制フラグ等をローカルに同期 |
| `ads/BannerAdSlot.tsx` | AdMob バナー広告スロット（Native用）。`.web.tsx` はWeb向けの null スタブ |
| `ads/RewardedAdOfferRow.tsx` | リワード広告視聴ボタン行（コイン獲得UI）。`.web.tsx` はWeb向け |
| `ai/DailyAIAdviceCard.tsx` | ホーム画面の「今日のAIアドバイス」カード。Cloud Function `generateDailyAIAdvice` を呼び出す |
| `goal/GoalProgressCard.tsx` | 目標進捗カード（目標体重と現在体重の差分表示） |
| `goals/AutoCalorieModal.tsx` | BMR + 活動量からの目標カロリー自動計算モーダル |
| `home/CalendarSection.tsx` | 月間カレンダーUI（ワークアウト記録日のハイライト） |
| `home/WorkoutDetailModal.tsx` | カレンダーから開くワークアウト詳細モーダル |
| `metrics/DailyMetricQuickInput.tsx` | 体重・体脂肪のクイック入力欄 |
| `metrics/WeightTrendCard.tsx` | 体重推移の折れ線グラフカード（react-native-chart-kit 使用） |
| `monetization/CoinHubSummary.tsx` | コイン残高のサマリ表示 |
| `monetization/FeatureStatusBadge.tsx` | 「無料」「プレミアム」バッジ |
| `training/ExerciseSelectorModal.tsx` | 種目選択モーダル（マスター + カスタム種目、カテゴリ別） |
| `training/RoutineModal.tsx` | トレーニングルーティーン選択/適用モーダル |

### 4.4 カスタムフック（`hooks/`）

| フック | 説明 |
|--------|------|
| `useAuthState` | Firebase Auth の `onAuthStateChanged` を購読し、`{ user, initializing, forceRefreshUser }` を返す |
| `useCoinBalance` | ユーザーのコイン残高をリアルタイム購読（Firestore `coin_transactions` の合算） |
| `useExerciseMaster` | Firestore `master_data/exercises` + ユーザーの `custom_exercises` を取得し、カテゴリ別にセクション化 |
| `useHomeWidgetOrder` | ホーム画面のウィジェット並び順を AsyncStorage で永続化・管理 |
| `useRoutines` | トレーニングルーティーンの Firestore CRUD + ローカルキャッシュ |
| `useSubscriptionEntitlements` | RevenueCat の CustomerInfo からサブスク状態を取得し `{ tier, flags }` を返す |
| `useTrainingSession` | トレーニングセッション中の状態管理（種目リスト、セット追加/編集、ワークアウト保存） |
| `useWorkoutHistory` | 過去のワークアウト一覧取得（Firestore `workouts` + ローカルキャッシュ） |
| `useWorkoutStats` | ワークアウト統計用データの集計 |

### 4.5 ユーティリティ関数（`utils/`）

| ファイル | エクスポート | 説明 |
|---------|-------------|------|
| `models.ts` | `Phase`, `ActivityLevel`, `CalorieEstimateSex`, `UserProfile`, `DailyMetric`, `UserDemographics`, `MealReminderSettings`, `DailyAIAdvice`, `AiCoachStylePreset`, `AiTonePreset`, `AiCoachSettings`, `DEFAULT_AI_COACH_SETTINGS` | 全画面・全機能で共有する型定義集 |
| `firestoreProfile.ts` | `getUserProfile`, `setUserProfile`, `getMealReminderSettings`, `setMealReminderSettings`, `getAiCoachSettings`, `setAiCoachSettings`, `getCalorieEstimatePrefs`, `setCalorieEstimatePrefs`, `getUserDemographics`, `mergeUserDemographicsFields`, `setDetailedTrackingEnabled`, `DEFAULT_MEAL_REMINDER_SETTINGS` | ユーザードキュメント（`users/{uid}`）の読み書き全般 |
| `firestoreDailyMetrics.ts` | `formatDateId`, `getDailyMetric`, `upsertDailyMetric`, `getDailyMetricsLastNDays`, `getLatestWeightKg` | 日次メトリクス（`users/{uid}/daily_metrics/{date}`）の CRUD |
| `firestoreDailyAdvice.ts` | `getDailyAIAdvice`, `setDailyAIAdvice` | AIアドバイスキャッシュ（`users/{uid}/daily_advice/{date}`）の読み書き |
| `firestoreUtils.ts` | `sanitizeDocId` | Firestore ドキュメントID のサニタイズ（`/` → `_` 等） |
| `adviceContext.ts` | `fetchAdviceNutrition`, `fetchAdviceWorkouts`, `buildAdviceContextFingerprint` | AIアドバイス生成に渡す食事・トレ・体重データの収集 |
| `aiCoachSettings.ts` | `AI_COACH_STYLE_LABELS`, `AI_TONE_LABELS`, `normalizeAiCoachSettings`, `fingerprintAiCoachSettings` | AIコーチ設定のラベル定義・正規化 |
| `aiUserContentCallables.ts` | `callableCreateCustomExercise`, `callableDeleteCustomExercise`, `callableUpdateCustomExercise`, `callableCreateMealRoutine`, `callableDeleteMealRoutine` | Cloud Functions callable のクライアント側ラッパー |
| `coinBalance.ts` | `computeSpendableCoinBalance`, `subscribeUserCoinBalance`, `fetchUserCoinBalance`, `requestRegistrationBonus`, `requestGrantRewardAdCoins` | コイン残高の計算、登録ボーナス・リワード広告報酬のリクエスト |
| `demographics.ts` | `calcAgeYearsFromBirthDate` | 生年月日から満年齢を計算 |
| `estimateCalories.ts` | `estimateDailyCalories`, `activityLevelLabel` | BMR + 活動量レベルから目標カロリーを自動推定 |
| `monetizationTypes.ts` | `COIN_EXPIRY_DAYS_FROM_GRANT`, `DISPLAY_FALLBACK_AI_CHAT_COIN_COST`, `REMOTE_CONFIG_KEYS`, `USER_SUBCOLLECTIONS`, `SubscriptionTier`, `SUBSCRIPTION_ENTITLEMENTS`, `REVENUECAT_ENTITLEMENTS`, `SubscriptionFeatureFlags`, `resolveSubscriptionFeatureFlags`, `dailyMissionSlotCount`, `CoinTransactionType`, `CoinTransactionDoc`, `MissionEventDoc` | マネタイズの型・定数（クライアント/サーバーの共通契約） |
| `missionCallables.ts` | `fetchMissionsSnapshot`, `claimMissionReward` | ミッション一覧取得・報酬請求 |
| `revenueCat.ts` | `isRevenueCatSupportedPlatform`, `getRevenueCatLibrary`, `ensureRevenueCatConfigured`, `syncRevenueCatWithFirebaseUser` | RevenueCat SDK の初期化・Firebase ユーザーとの同期 |
| `revenueCatPurchaseErrors.ts` | `interpretRevenueCatPurchaseError` | RevenueCat 購入エラーの日本語メッセージ変換 |
| `adMobUnits.ts` | `isNativeAdPlatform`, `getBannerAdUnitId`, `getRewardedAdUnitId`, `getInterstitialAdUnitId` | AdMob 広告ユニットID 取得（環境変数 or テストID） |
| `adSuppression.ts` | `setSuppressNonRewardAds`, `shouldPresentNonRewardAds` | 購入フロー中などの広告一時抑制制御 |
| `interstitialAdPresenter.ts` | `preloadInterstitial`, `presentInterstitialWhenReady`, `recordFoodAddAndMaybePresentInterstitial` | インタースティシャル広告の事前読み込み・表示判定（N回食事追加ごと等） |
| `mobileAdsInit.ts` | `ensureMobileAdsInitialized` | AdMob SDK の初期化（一度だけ） |
| `grantRewardCallableConfig.ts` | `getGrantRewardCallableOverrideUrl`, `GRANT_REWARD_CALLABLE_NAME_CANDIDATES` | リワード広告報酬付与の callable URL/名前解決 |
| `mealReminderNotifications.ts` | `cancelMealReminderNotifications`, `syncMealReminderSchedules` | expo-notifications を使った食事リマインダーのスケジュール管理 |
| `homeTutorialStorage.ts` | `tutorialHomeKeyForUser`, `hasSeenHomeTutorial`, `clearHomeTutorialSeen`, `markHomeTutorialSeen`, `TUTORIAL_REPLAY_PENDING_KEY` | ホーム画面ウォークスルーの表示済みフラグ管理 |
| `time.ts` | `formatTime` | 秒数 → `MM:SS` フォーマット |
| `workoutCategories.ts` | `BodyPart`, `categorizeBodyPart` | 種目名/カテゴリ → 大部位（胸/背中/脚...）への分類 |

### 4.6 定数（`constants/`）

| ファイル | 主要エクスポート | 説明 |
|---------|----------------|------|
| `adPlacement.ts` | `FOOD_ADDS_PER_INTERSTITIAL`, `INTERSTITIAL_MIN_INTERVAL_MS` | 広告表示頻度の定数 |
| `homeWidgets.ts` | `HOME_WIDGET_IDS`, `HomeWidgetId`, `defaultHomeWidgetOrder`, `HOME_WIDGET_LABELS` | ホーム画面ウィジェットの ID・ラベル・デフォルト順 |
| `monetizationPreview.ts` | `PREVIEW_SUBSCRIPTION_TIERS`, `PREVIEW_DAILY_MISSIONS_FREE`, `PREVIEW_COIN_PACKS` | monetization 画面のプレビュー表示用データ |
| `subscriptionLimits.ts` | `FREE_CUSTOM_EXERCISE_LIMIT`, `FREE_MEAL_ROUTINE_LIMIT` | 無料プランの登録上限（種目・ルーティーン数） |

### 4.7 テーマ・スタイル

`theme/styles.ts` にアプリ全体の `StyleSheet` を集約。ダークテーマ基調（背景 `#1a1a1a`、アクセント `#2ecc71` 緑）。全画面から `import { styles } from '../../theme/styles'` で利用。

### 4.8 型定義（`utils/models.ts`）

| 型 | 説明 |
|----|------|
| `Phase` | `'cut' \| 'maintain' \| 'bulk'` — 減量/維持/増量 |
| `ActivityLevel` | `'sedentary' \| 'light' \| 'moderate' \| 'active' \| 'very_active'` — カロリー計算用活動量 |
| `CalorieEstimateSex` | `'male' \| 'female'` — BMR 計算用 |
| `UserProfile` | `{ uid, phase, targetWeight, targetCal, isDetailedTrackingEnabled }` |
| `DailyMetric` | `{ date, weight, bodyFatPercentage? }` |
| `UserDemographics` | `{ heightCm?, birthDate? }` |
| `MealReminderSettings` | `{ enabled, breakfastHour/Minute, lunchHour/Minute, dinnerHour/Minute }` |
| `DailyAIAdvice` | `{ date, title, bullets[], calorieAdvice, workoutAdvice, contextFingerprint? }` |
| `AiCoachStylePreset` | `'gentle' \| 'balanced' \| 'spartan' \| 'facts'` |
| `AiTonePreset` | `'polite' \| 'neutral' \| 'friendly' \| 'casual'` |
| `AiCoachSettings` | `{ coachStyle, tone, customInstructions }` |

---

## 5. Cloud Functions（サーバー側）の詳細

### 5.1 コードベース構成

`firebase.json` で 2 つの Functions コードベースが定義されている:

| コードベース名 | ソースディレクトリ | 役割 | ランタイム |
|-------------|----------------|------|-----------|
| `default` | `functions/` | レガシー。現在は空のエントリポイント（`export {}`）。種目マスターの seed スクリプト（Python）を同居 | Node.js 20 |
| `ai` | `functions-ai/` | **メイン**。AI（OpenAI）、コイン、ミッション、RevenueCat webhook、ユーザーコンテンツ CRUD のすべて | Node.js 20 |

**重要**: AI に関する処理はすべて `functions-ai/` に集約。`functions/` には AI 関連のコードを置かないこと。

### 5.2 `functions-ai/` 各ファイルの役割

| ファイル | 役割 |
|---------|------|
| `index.ts` | エントリポイント。OpenAI クライアント生成、callable オプション定義、`analyzeFoodPFC`（食事PFC推定）、`generateDailyAIAdvice`（日次AIアドバイス）、`aiCoachChat`（フリーチャット）を定義。他ファイルのエクスポートを re-export |
| `coins.ts` | コインシステムの全ロジック。`admin.initializeApp()` 呼び出し、Remote Config からコイン単価取得、FIFO ベースの残高計算（`computeCoinBalance`）、付与（`grantRegistrationBonusIfNeeded`, `applyRewardAdCoinGrant`, `grantSubscriptionCoinsFromRevenueCatWebhook`）、消費（`spendCoinsForAiChatOrThrow`）、返金（`refundAiChatCoins`）、ミッション報酬付与（`grantMissionRewardInTransaction`） |
| `missions.ts` | デイリーミッション機能。ミッション種別（体重記録、食事記録、トレーニング、ログイン等）の達成判定（`evaluateMission`）、スナップショット取得（`getMissionsSnapshot`）、報酬請求（`claimMissionReward`） |
| `revenueCatWebhook.ts` | RevenueCat からの Webhook を受信（`onRequest`）。署名検証（`timingSafeEqual`）、サブスク状態の Firestore 同期、コイン付与 |
| `subscriptionMirror.ts` | RevenueCat イベントから Firestore `users/{uid}/private_meta/revenuecat_subscription` へサブスク状態をミラー。`isPremiumSubscriptionActive` で課金状態を判定 |
| `userContentCallables.ts` | マイ種目（`createCustomExercise`, `updateCustomExercise`, `deleteCustomExercise`）と食事ルーティーン（`createMealRoutine`, `deleteMealRoutine`）の callable。無料プランの登録上限チェック含む |

### 5.3 エクスポートされている Cloud Function 一覧

| 関数名 | 種類 | 認証 | シークレット | 概要 |
|--------|------|------|------------|------|
| `grantRegistrationBonus` | onCall (public) | 必要 | — | 新規登録ボーナスコイン付与（冪等） |
| `grantRewardAdCoins` | onCall (public) | 必要 | — | リワード広告視聴後のコイン付与 |
| `analyzeFoodPFC` | onCall (public) | 必要 | OPENAI_API_KEY | 食事テキスト → PFC/カロリー推定 |
| `generateDailyAIAdvice` | onCall (public) | 必要 | OPENAI_API_KEY | ホーム用日次AIアドバイス生成 |
| `aiCoachChat` | onCall (public) | 必要 | OPENAI_API_KEY | フリーチャットAIコーチ |
| `revenueCatWebhook` | onRequest | Webhook秘密鍵 | REVENUECAT_WEBHOOK_AUTH_TOKEN | RevenueCat Webhook 受信 |
| `createCustomExercise` | onCall (public) | 必要 | — | マイ種目作成 |
| `updateCustomExercise` | onCall (public) | 必要 | — | マイ種目更新 |
| `deleteCustomExercise` | onCall (public) | 必要 | — | マイ種目削除 |
| `createMealRoutine` | onCall (public) | 必要 | — | 食事ルーティーン作成 |
| `deleteMealRoutine` | onCall (public) | 必要 | — | 食事ルーティーン削除 |
| `getMissionsSnapshot` | onCall (public) | 必要 | — | デイリーミッション一覧取得 |
| `claimMissionReward` | onCall (public) | 必要 | — | ミッション報酬請求 |

---

## 6. Firebase 構成

### 6.1 Firestore データモデル

```
firestore/
├── master_data/                       # 読み取り専用（管理者が投入）
│   └── exercises                        # 種目マスターデータ
│
└── users/{userId}/                    # ユーザーごとのデータ
    ├── (ドキュメント本体)                 # UserProfile + UserDemographics + 設定類
    ├── workouts/{docId}                 # トレーニング記録（日付ベース）
    ├── food_logs/{docId}                # 食事ログ
    ├── food_dictionary/{docId}          # 食事辞書（名前→PFC キャッシュ）
    ├── routines/{docId}                 # トレーニングルーティーン
    ├── custom_exercises/{docId}         # マイ種目（作成/削除は Functions のみ）
    ├── meal_routines/{docId}            # 食事ルーティーン（作成/削除は Functions のみ）
    ├── daily_metrics/{date}             # 日次メトリクス（体重・体脂肪）
    ├── daily_advice/{date}              # AIアドバイスキャッシュ
    ├── coin_transactions/{txId}         # コイン台帳（読み取り専用、書き込みは Functions）
    ├── mission_events/{eventId}         # ミッション監査ログ（読み取り専用）
    └── private_meta/{docId}             # サーバー専用（RevenuCat サブスク状態等。クライアント読み書き不可）
```

### 6.2 Firestore セキュリティルール（要約）

| パス | クライアント読み取り | クライアント書き込み | 備考 |
|------|:---:|:---:|------|
| `master_data/{docId}` | ログイン済みのみ | 不可 | 管理者が seed スクリプトで投入 |
| `users/{userId}` | 本人のみ | 本人のみ | プロフィール・設定 |
| `users/{userId}/workouts/{docId}` | 本人のみ | 本人のみ | |
| `users/{userId}/food_logs/{docId}` | 本人のみ | 本人のみ | |
| `users/{userId}/food_dictionary/{docId}` | 本人のみ | 本人のみ | |
| `users/{userId}/routines/{docId}` | 本人のみ | 本人のみ | |
| `users/{userId}/daily_metrics/{docId}` | 本人のみ | 本人のみ | |
| `users/{userId}/daily_advice/{docId}` | 本人のみ | 本人のみ | |
| `users/{userId}/custom_exercises/{docId}` | 本人のみ | **不可** | Functions のみ書き込み |
| `users/{userId}/meal_routines/{docId}` | 本人のみ | **不可** | Functions のみ書き込み |
| `users/{userId}/coin_transactions/{txId}` | 本人のみ | **不可** | Functions のみ書き込み |
| `users/{userId}/mission_events/{eventId}` | 本人のみ | **不可** | Functions のみ書き込み |
| `users/{userId}/private_meta/{docId}` | **不可** | **不可** | サーバー専用 |

### 6.3 Firebase Auth

- メール/パスワード認証
- メール認証（verify）必須
- `firebaseConfig.ts` で `initializeAuth` + AsyncStorage ベースの永続化（React Native 向け）

---

## 7. 設定ファイル一覧と役割

| ファイル | 役割 |
|---------|------|
| `package.json` | npm 依存関係、スクリプト（start, lint, test 等）、アプリバージョン |
| `app.json` | Expo の静的設定（アプリ名 `NoteFit AI`、バンドルID、プラグイン、AdMob App ID、`google-services.json` パス、EAS プロジェクトID） |
| `app.config.js` | Expo の動的設定。`app.json` をベースに `.env` の環境変数（RevenueCat/AdMob キー等）をマージ |
| `tsconfig.json` | TypeScript 設定。`expo/tsconfig.base` を拡張、`strict: true`、パスエイリアス `@/*` |
| `firebase.json` | Firebase CLI 設定。Firestore（ルール、インデックス）＋ 2つの Functions コードベース定義 |
| `.firebaserc` | Firebase プロジェクトエイリアス（`default: kennkoukannri-kari`） |
| `firestore.rules` | Firestore セキュリティルール |
| `firestore.indexes.json` | Firestore 複合インデックス定義 |
| `firebaseConfig.ts` | Firebase クライアント SDK の初期化。`db`（Firestore）と `auth`（Auth）をエクスポート |
| `eas.json` | EAS Build / Submit 設定（development/preview/production プロファイル、Android Submit で内部テストトラックに提出） |
| `eslint.config.js` | ESLint flat config（`eslint-config-expo` ベース） |
| `jest.config.js` | Jest 設定（ts-jest プリセット、node テスト環境） |
| `.env.example` | 環境変数テンプレート（RevenueCat キー、AdMob ユニットID、callable URL）。AdMob App ID のテスト→本番切り替えに関する注記も記載 |
| `.gitignore` | Git 除外（node_modules, .env, .expo, dist, serviceAccountKey.json, pc-api-service-account.json 等） |

---

## 8. 依存関係の詳細

### 8.1 クライアント dependencies

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `expo` | ~54.0.33 | Expo SDK コア |
| `expo-router` | ~6.0.23 | ファイルベースルーティング |
| `react` / `react-native` | 19.1.0 / 0.81.5 | UI フレームワーク |
| `firebase` | ^12.9.0 | Firebase クライアント SDK（Auth, Firestore, Functions） |
| `@react-native-async-storage/async-storage` | 2.2.0 | ローカルストレージ（セッションキャッシュ、設定永続化） |
| `@react-navigation/bottom-tabs` | ^7.3.10 | タブナビゲーション（Expo Router 内部で使用） |
| `@react-navigation/native` / `elements` / `stack` | ^7.x | ナビゲーション基盤 |
| `react-native-purchases` | ^9.15.2 | RevenueCat SDK（サブスクリプション管理） |
| `react-native-google-mobile-ads` | ^16.3.1 | Google AdMob SDK（バナー/インタースティシャル/リワード広告） |
| `react-native-chart-kit` | ^6.12.0 | 体重推移等の折れ線グラフ |
| `react-native-gifted-charts` | ^1.4.74 | 追加のグラフライブラリ |
| `react-native-svg` | 15.12.1 | SVG レンダリング（グラフ描画に必要） |
| `react-native-copilot` | ^3.3.3 | ウォークスルー/チュートリアル表示 |
| `react-native-draggable-flatlist` | ^4.0.3 | ドラッグ＆ドロップリスト（ウィジェット並び替え） |
| `react-native-reanimated` | ~4.1.1 | アニメーションライブラリ |
| `react-native-gesture-handler` | ~2.28.0 | ジェスチャー処理 |
| `react-native-safe-area-context` | ~5.6.0 | セーフエリア対応 |
| `react-native-screens` | ~4.16.0 | ネイティブスクリーン最適化 |
| `react-native-worklets` | 0.5.1 | Reanimated のワークレット基盤 |
| `expo-notifications` | ~0.32.16 | ローカル通知（食事リマインダー） |
| `expo-constants` | ~18.0.13 | アプリ設定値（extra）へのアクセス |
| `expo-status-bar` | ~3.0.9 | ステータスバー制御 |
| `expo-web-browser` | ~15.0.10 | 外部ブラウザ起動 |
| `expo-dev-client` | ~6.0.20 | 開発ビルド用クライアント |
| `expo-haptics` | ~15.0.8 | 触覚フィードバック |
| `expo-image` | ~3.0.11 | 画像表示 |
| `expo-linking` | ~8.0.11 | ディープリンク |
| `expo-splash-screen` | ~31.0.13 | スプラッシュスクリーン |
| `expo-font` | ~14.0.11 | カスタムフォント |
| `expo-symbols` | ~1.0.8 | SF Symbols |
| `expo-system-ui` | ~6.0.9 | システムUI設定 |
| `@react-native-community/datetimepicker` | 8.4.4 | 日時ピッカー（リマインダー設定で使用） |
| `lucide-react-native` | ^0.563.0 | アイコンライブラリ |
| `@expo/vector-icons` | ^15.0.3 | アイコン（Expo 標準） |
| `react-dom` / `react-native-web` | 19.1.0 / ~0.21.0 | Web 対応（補助的） |

### 8.2 クライアント devDependencies

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `typescript` | ~5.9.2 | TypeScript コンパイラ |
| `eslint` / `eslint-config-expo` | ^9.25.0 / ~10.0.0 | Linter |
| `jest` / `ts-jest` / `@types/jest` | ^30.3.0 / ^29.4.9 / ^30.0.0 | テストフレームワーク |
| `@types/react` | ~19.1.0 | React 型定義 |
| `dotenv` | ^17.4.2 | `.env` ファイルの読み込み（`app.config.js` で使用） |
| `@expo/ngrok` | ^4.1.3 | 開発時トンネリング |

### 8.3 `functions-ai/` dependencies

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `firebase-admin` | ^12.0.0 | Firebase Admin SDK（Firestore 書き込み、Remote Config） |
| `firebase-functions` | ^5.0.0 | Cloud Functions v2 フレームワーク |
| `openai` | ^4.0.0 | OpenAI API クライアント（GPT-4o-mini） |
| `date-fns` / `date-fns-tz` | ^4.1.0 / ^3.2.0 | 日付処理（ミッション判定のタイムゾーン対応） |

---

## 9. マネタイズ・課金システム

### サブスクリプション（RevenueCat）

| ティア | エンタイトルメント | 特典 |
|--------|------------------|------|
| `free` | — | 基本機能。広告あり。カスタム種目/ルーティーン数制限あり |
| `tier1` | `tier1` or `premium` | 広告非表示、カスタム種目/ルーティーン上限解放、ミッション枠 5/日 |
| `tier2` | `tier2` or `premium` | tier1 の全特典 + AI チャット用の上位モデル（gpt-4o） |

### コインシステム

- **獲得方法**: 新規登録ボーナス、リワード広告、ログインボーナス、デイリーミッション、サブスク付与
- **消費方法**: AI チャット（`aiCoachChat`）1回あたり N コイン（Remote Config で制御）
- **有効期限**: 獲得から 179 日（資金決済法対応）
- **残高計算**: `coin_transactions` サブコレクションの FIFO ベース合算（Cloud Functions で管理）
- **コイン単価**: Firebase Remote Config で動的に制御（`ai_consult_coins_per_turn`, `reward_ad_coins` 等）

### 広告（AdMob）

| 広告タイプ | 表示タイミング |
|-----------|---------------|
| バナー | 各タブ画面下部（サブスクユーザーは非表示） |
| インタースティシャル | N 回食事追加ごと（`FOOD_ADDS_PER_INTERSTITIAL`） |
| リワード | monetization 画面でユーザーが任意で視聴 → コイン獲得 |

---

## 10. 環境変数・シークレット管理

### クライアント側（`.env` → `app.config.js` 経由）

| 変数名 | 用途 |
|--------|------|
| `REVENUECAT_IOS_API_KEY` | RevenueCat iOS API キー |
| `REVENUECAT_ANDROID_API_KEY` | RevenueCat Android API キー |
| `ADMOB_BANNER_UNIT_ID` | AdMob バナー広告ユニットID |
| `ADMOB_REWARDED_UNIT_ID` | AdMob リワード広告ユニットID |
| `ADMOB_INTERSTITIAL_UNIT_ID` | AdMob インタースティシャル広告ユニットID |
| `GRANT_REWARD_CALLABLE_URL` | （オプション）リワード報酬 callable の URL オーバーライド |

### サーバー側（Firebase Secret Manager）

| シークレット名 | 用途 |
|---------------|------|
| `OPENAI_API_KEY` | OpenAI API キー（`analyzeFoodPFC`, `generateDailyAIAdvice`, `aiCoachChat` で使用） |
| `REVENUECAT_WEBHOOK_AUTH_TOKEN` | RevenueCat Webhook の認証トークン |

### 注意事項

- `firebaseConfig.ts` に Firebase クライアント設定（apiKey 等）がハードコードされている。これはクライアント SDK の仕様上 一般的だが、ローテーション時はコード変更が必要
- `serviceAccountKey.json` は `.gitignore` に記載済み。ローカルにのみ存在し、**絶対にコミットしないこと**
- `pc-api-service-account.json`（Play Console API サービスアカウント）も `.gitignore` に記載済み
- `.env` も `.gitignore` に記載済み
- `app.json` の `react-native-google-mobile-ads` プラグイン内の `androidAppId` / `iosAppId` は **テスト用 ID** がデフォルト設定されている。本番リリース前に AdMob Console の本番 App ID に必ず差し替えること（`.env.example` にも注記あり）

---

## 11. ビルド・デプロイ

### クライアント（Expo / EAS）

```bash
# ローカル開発サーバー起動
npm start

# EAS ビルド（開発用）
eas build --profile development --platform ios
eas build --profile development --platform android

# EAS ビルド（本番用）
eas build --profile production --platform all

# ストア提出（Android → Play Console の内部テストトラック）
eas submit --platform android --profile production

# ストア提出（iOS）
eas submit --platform ios
```

> **Android 提出の前提条件**: `pc-api-service-account.json`（Play Console API サービスアカウントキー）がプロジェクトルートに必要。詳細は `docs/RELEASE_CHECKLIST.md` を参照。

### Cloud Functions

```bash
# functions-ai のみデプロイ
firebase deploy --only functions:ai

# functions (default) のみデプロイ
firebase deploy --only functions:default

# 全 Functions デプロイ
firebase deploy --only functions

# Firestore ルールデプロイ
firebase deploy --only firestore:rules
```

### npm スクリプト（ルート `package.json`）

| スクリプト | コマンド |
|-----------|---------|
| `start` | `expo start` |
| `android` | `expo run:android` |
| `ios` | `expo run:ios` |
| `web` | `expo start --web` |
| `lint` | `expo lint` |
| `test` | `jest` |

---

## 12. テスト

- **フレームワーク**: Jest + ts-jest
- **設定**: `jest.config.js`（ts-jest プリセット、node テスト環境）
- **既存テスト**: `utils/firestoreUtils.test.ts`（`sanitizeDocId` の単体テスト）
- **実行**: `npm test`

---

## 13. 開発の進め方・規約

### 新しい画面を追加するとき

1. `app/(tabs)/` または `app/settings/` にファイルを作成
2. 必要に応じてレイアウトファイル（`_layout.tsx`）にスクリーン登録
3. `theme/styles.ts` の既存スタイルを活用

### 新しいデータを扱うとき

1. `utils/models.ts` に型を定義
2. `utils/` に Firestore CRUD 関数を作成
3. 必要なら `hooks/` にカスタムフックを作成
4. `firestore.rules` にセキュリティルールを追加

### Cloud Functions を追加するとき

1. `functions-ai/src/` にロジックを実装
2. `functions-ai/src/index.ts` から re-export
3. クライアント側に callable ラッパーを `utils/` に作成

### コーディング規約

- TypeScript `strict: true`
- スタイルは `theme/styles.ts` に集約
- Firestore ドキュメント ID にユーザー入力を使う場合は必ず `sanitizeDocId()` を通す
- Cloud Functions のエラーメッセージにサーバー内部情報を含めない
- 広告関連コンポーネントは `.web.tsx` スタブを用意してWeb ビルドを壊さない
