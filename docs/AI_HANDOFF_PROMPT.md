# NoteFit AI — 他AIへの引き継ぎプロンプト（壁打ち用）

> このファイルをそのままコピーして、別のAI（ChatGPT / Claude / Gemini 等）に貼り付けて使ってください。  
> 最下部の「今回の相談テーマ」だけ書き換えてから送ってください。

---

```
# NoteFit AI プロジェクト引き継ぎ（壁打ち用）

あなたは NoteFit AI というフィットネスアプリの開発パートナーです。
私は【ここに相談テーマを書く】について壁打ちしたいです。

コードベースには直接アクセスできない前提で、以下の情報をもとに議論してください。
不明点は推測せず、確認すべき質問をしてから答えてください。

================================================================================
## 1. プロダクト概要
================================================================================

**NoteFit AI** は、食事・トレーニング・体重を記録し、ユーザーの実データをコンテキストに AI がアドバイスするフィットネスアプリです。

- **コンセプト**: 「記録すること」ではなく「記録から次のアクションを決める」
- **ターゲット**: コンテスト参加者（フィジーク等）、アスリート、健康志向の一般ユーザー
- **アプリ名**: NoteFit AI
- **バージョン**: app.json 1.0.3 / package.json 1.0.2
- **チーム**: 2名（エンジニア2名）
- **MVP リリース予定**: 2026年5月（README 記載）

### 主要機能サマリー

| 機能 | 概要 |
|------|------|
| 食事記録 | 自然文入力 → AI が PFC/カロリー自動推定。手動入力、食事辞書、お気に入り、食事ルーティーン |
| トレーニング記録 | 種目マスター + カスタム種目。セット×レップ×重量。ルーティーン、タイマー、下書き復元 |
| ホーム | カレンダー、体重/体脂肪入力、AI デイリーアドバイス、体重グラフ、ウィジェット並び替え |
| 統計（記録タブ） | 体重推移、部位別/種目別の推定1RM推移グラフ |
| AI 相談 | フリーチャット形式のコーチ AI。コーチスタイル/口調カスタマイズ、コイン消費 |
| 設定 | 目標、プロフィール、AIコーチ設定、食事リマインダー、サブスク/コイン管理 |
| マネタイズ | RevenueCat サブスク（tier1/tier2）、AdMob 広告、コインシステム、デイリーミッション |

================================================================================
## 2. 技術スタック
================================================================================

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | Expo SDK | ~54.0.33 |
| ルーティング | Expo Router（ファイルベース） | ~6.0.23 |
| UI | React Native | 0.81.5 |
| 言語 | TypeScript (strict) | ~5.9.2 |
| 状態管理 | React hooks + AsyncStorage（ローカルキャッシュ） | — |
| バックエンド | Firebase (Firestore, Auth, Cloud Functions Gen2) | firebase ^12.9.0 |
| AI | OpenAI API (GPT-4o-mini、tier2 は GPT-4o) via Cloud Functions | openai ^4.0.0 |
| 課金 | RevenueCat | react-native-purchases ^9.15.2 |
| 広告 | Google AdMob | react-native-google-mobile-ads ^16.3.1 |
| グラフ | react-native-chart-kit / react-native-gifted-charts | — |
| アニメーション | react-native-reanimated | ~4.1.6 |
| 通知 | expo-notifications | ~0.32.16 |
| チュートリアル | react-native-copilot + 独自スライドチュートリアル | — |
| テスト | Jest + ts-jest | jest ^30.3.0 |
| ビルド | EAS Build / EAS Submit | — |
| Functions ランタイム | Node.js 20 | — |

### インフラ識別子

- **Firebase プロジェクト ID**: `kennkoukannri-kari`
- **リージョン**: `asia-northeast1`（東京）
- **EAS プロジェクト ID**: `1ecff325-3fa5-4e9b-ae1b-36ac4c6f76ea`
- **バンドル ID（本番）**: `com.takimoto.shoa.notefitai`
- **バンドル ID（開発）**: `com.takimoto.shoa.notefitai.dev`
- **URL スキーム**: `fitness-app`（本番）/ `fitness-app-dev`（開発）

================================================================================
## 3. ディレクトリ構成
================================================================================

```
notefit-ai/
├── app/                          # Expo Router ファイルベースルーティング（全画面）
│   ├── _layout.tsx                 # ルートレイアウト（認証ガード・リダイレクト）
│   ├── index.tsx                   # "/" → /home へリダイレクト
│   ├── (auth)/                     # 認証系画面（未ログイン時）
│   │   ├── login.tsx               # ログイン・新規登録
│   │   ├── verify.tsx              # メール認証待ち
│   │   └── onboarding.tsx          # 初回設定
│   ├── (tabs)/                     # メインタブ（ログイン後）
│   │   ├── home.tsx                # ホーム
│   │   ├── ai-advice.tsx           # AIフリーチャット相談
│   │   ├── training.tsx            # トレーニング記録
│   │   ├── food.tsx                # 食事記録
│   │   └── stats.tsx               # 統計グラフ
│   └── settings/                   # 設定（モーダル表示）
│       ├── index.tsx               # 設定一覧
│       ├── goals.tsx               # 目標設定
│       ├── profile.tsx             # プロフィール編集
│       ├── ai-coach.tsx            # AIコーチスタイル設定
│       ├── meal-reminders.tsx      # 食事リマインダー
│       └── monetization.tsx        # サブスク・コイン・ミッション
│
├── components/                   # 再利用コンポーネント
│   ├── SubscriptionEntitlementSync.tsx
│   ├── ads/                        # BannerAdSlot, RewardedAdOfferRow（.web.tsx スタブあり）
│   ├── ai/DailyAIAdviceCard.tsx
│   ├── goal/GoalProgressCard.tsx
│   ├── goals/AutoCalorieModal.tsx
│   ├── home/CalendarSection.tsx, WorkoutDetailModal.tsx
│   ├── metrics/DailyMetricQuickInput.tsx, WeightTrendCard.tsx
│   ├── monetization/CoinHubSummary.tsx, FeatureStatusBadge.tsx
│   └── training/ExerciseSelectorModal.tsx, RoutineModal.tsx
│
├── hooks/                        # カスタムフック
│   ├── useAuthState.ts
│   ├── useCoinBalance.ts
│   ├── useExerciseMaster.ts
│   ├── useHomeWidgetOrder.ts
│   ├── useRoutines.ts
│   ├── useSubscriptionEntitlements.ts
│   ├── useTrainingSession.ts
│   ├── useWorkoutHistory.ts
│   └── useWorkoutStats.ts
│
├── utils/                        # ユーティリティ
│   ├── models.ts                 # 共通型定義
│   ├── firestoreProfile.ts
│   ├── firestoreDailyMetrics.ts
│   ├── firestoreDailyAdvice.ts
│   ├── firestoreUtils.ts
│   ├── adviceContext.ts
│   ├── aiCoachSettings.ts
│   ├── aiUserContentCallables.ts
│   ├── coinBalance.ts
│   ├── missionCallables.ts
│   ├── revenueCat.ts
│   ├── adMobUnits.ts, adSuppression.ts, interstitialAdPresenter.ts
│   ├── mealReminderNotifications.ts
│   ├── homeTutorialStorage.ts
│   ├── estimateCalories.ts
│   └── workoutCategories.ts
│
├── constants/
│   ├── adPlacement.ts
│   ├── homeWidgets.ts
│   ├── monetizationPreview.ts
│   └── subscriptionLimits.ts
│
├── theme/styles.ts               # 共通スタイル（ダークテーマ #1a1a1a、アクセント #2ecc71）
│
├── functions-ai/src/             # メイン Cloud Functions
│   ├── index.ts                  # AI callable（analyzeFoodPFC, generateDailyAIAdvice, aiCoachChat）
│   ├── coins.ts                  # コイン台帳
│   ├── missions.ts               # デイリーミッション
│   ├── revenueCatWebhook.ts
│   ├── subscriptionMirror.ts
│   ├── userContentCallables.ts   # マイ種目・食事ルーティーン CRUD
│   └── accountDeletion.ts
│
├── functions/                    # レガシー（ほぼ空）。seed_exercises.py のみ
│
├── docs/
│   ├── CODEBASE_OVERVIEW.md      # プロジェクト正本ドキュメント
│   ├── AI_HANDOFF_PROMPT.md      # ← このファイル
│   ├── food-ai-auto-analysis.md
│   ├── where-to-edit-for-new-features.md
│   ├── PRIVACY_POLICY.md
│   └── RELEASE_CHECKLIST.md
│
├── firebaseConfig.ts
├── firebase.json
├── firestore.rules
├── app.json / app.config.js
├── eas.json
└── package.json
```

================================================================================
## 4. ルーティングと認証フロー
================================================================================

### ルーティングツリー

```
app/_layout.tsx（認証ガード）
├── (auth)/
│   ├── /login          メール/パスワード ログイン・新規登録
│   ├── /verify         メール認証待ち（再送信ボタン付き）
│   └── /onboarding     初回設定
├── (tabs)/             BottomTabs（5タブ）
│   ├── /home
│   ├── /ai-advice
│   ├── /training
│   ├── /food
│   └── /stats
└── settings/           モーダル表示
    ├── /settings
    ├── /settings/goals
    ├── /settings/profile
    ├── /settings/ai-coach
    ├── /settings/meal-reminders
    └── /settings/monetization
```

### 認証ガード（app/_layout.tsx）

1. 未ログイン → `/login` にリダイレクト
2. ログイン済み & メール未認証 → `/verify` にリダイレクト
3. メール認証済み & プロフィール未設定 → `/onboarding` にリダイレクト
4. 基本プロフィール未完了 → `/settings/profile` にリダイレクト
5. すべて完了 → `(tabs)` グループへ

### オンボーディングで設定する項目

- フェーズ（減量 cut / 維持 maintain / 増量 bulk）
- 目標体重（1〜400kg）
- 目標カロリー（500〜10000 kcal、BMR 自動計算モーダルあり）
- ジム通いの有無

================================================================================
## 5. 画面別 実装済み機能の詳細
================================================================================

### 5.1 ホームタブ（app/(tabs)/home.tsx）

**カスタマイズ可能ウィジェット**（ドラッグ＆ドロップで並び替え、追加/非表示）:
- `calendar` — 月間カレンダー（ワークアウト記録日ハイライト、日付タップで詳細モーダル）
- `workout` — 今日のトレーニング概要
- `nutrition` — 今日の栄養（PFC）サマリー
- `ai` — AI デイリーアドバイスカード
- `metrics` — 今日の体重・体脂肪クイック入力
- `goal` — 目標進捗カード（目標体重と現在体重の差分）

**その他**:
- 体重推移グラフ（WeightTrendCard）
- 詳細身体データ ON のとき体脂肪率入力欄表示
- ホーム画面スライドチュートリアル（react-native-copilot + 独自実装）
- 設定から「すべてのチュートリアルを再表示」可能

### 5.2 食事タブ（app/(tabs)/food.tsx）

- **AI PFC 推定**: 自然文（例「コンビニの牛丼」）→ Cloud Function `analyzeFoodPFC` でカロリー・PFC 推定
- **手動入力**: 食品名・カロリー・タンパク質・脂質・炭水化物
- **食事辞書**: 過去入力を Firestore `food_dictionary` にキャッシュ、検索から再利用
- **お気に入り**: 辞書エントリにスター付け
- **食事ルーティーン**: よく食べる組み合わせをテンプレ保存・一括追加
  - 無料プラン上限: 3件（`FREE_MEAL_ROUTINE_LIMIT`）
  - ルーティーン作成時に AI で品目追加も可能
  - 作成/削除は Cloud Functions 経由（`createMealRoutine`, `deleteMealRoutine`）
- **日別食事一覧**: 追加・削除
- **インタースティシャル広告**: 食事追加 N 回ごと（`FOOD_ADDS_PER_INTERSTITIAL`）
- **食事タブ用スライドチュートリアル**

### 5.3 トレーニングタブ（app/(tabs)/training.tsx）

- **種目マスター**: Firestore `master_data/exercises` から選択（カテゴリ別）
- **マイ種目（カスタム種目）**: 作成・編集・削除
  - 無料プラン上限: 5件（`FREE_CUSTOM_EXERCISE_LIMIT`）
  - CRUD は Cloud Functions 経由
- **セット記録**: セット数 × レップ × 重量、完了チェック（✅）
- **セット自動チェック**: 設定で ON にすると種目追加時に完了済み状態（AsyncStorage `@auto_check_set`）
- **ワークアウトタイマー**: 経過時間を記録・表示
- **トレーニングルーティーン**: 種目テンプレの保存・適用（Firestore `routines`）
- **下書き自動復元**: 途中離脱してもセッションを AsyncStorage から復帰
- **過去ワークアウトの編集**
- **推定 1RM 計算**: 統計画面と連携
- **トレーニングタブ用スライドチュートリアル**

### 5.4 記録タブ（app/(tabs)/stats.tsx）

- **体重推移グラフ**
- **部位別推定 1RM 推移**: 胸・背中・脚など（完了チェック付きセットの最高記録）
- **種目別成長グラフ**: マスター種目 + マイ種目を部位ごとに選択
- **記録タブ用スライドチュートリアル**

### 5.5 AI相談タブ（app/(tabs)/ai-advice.tsx）

- **フリーチャット AI コーチ**: Cloud Function `aiCoachChat`
  - デフォルト: GPT-4o-mini
  - tier2 サブスク: GPT-4o
  - ユーザーの食事・トレ・体重等をコンテキストとして渡す
- **コイン消費**: 1送信あたり N コイン（Remote Config `ai_consult_coins_per_turn`、フォールバック `DISPLAY_FALLBACK_AI_CHAT_COIN_COST`）
- **会話履歴**: 端末ローカル保存（AsyncStorage `@ai_chats_v1_{uid}`）
  - ピン留め、名前変更、削除
  - 左上メニューから過去会話を開く
- **AI相談タブ用スライドチュートリアル**

### 5.6 設定画面

| 画面 | 機能 |
|------|------|
| settings/index.tsx | 設定一覧。ログアウト、パスワード再設定メール、アカウント削除、チュートリアル再表示、詳細身体データトグル、セット自動チェックトグル |
| settings/goals.tsx | フェーズ（減量/維持/増量）、目標体重、目標カロリー。AutoCalorieModal（BMR + 活動量から自動計算） |
| settings/profile.tsx | ユーザーネーム、身長、生年月日 |
| settings/ai-coach.tsx | AIコーチスタイル4種（gentle/balanced/spartan/facts）、口調4種（polite/neutral/friendly/casual）、追加メモ |
| settings/meal-reminders.tsx | 朝・昼・夕の通知時刻（expo-notifications ローカル通知） |
| settings/monetization.tsx | コイン残高、サブスクプラン購入/復元（RevenueCat）、リワード広告、デイリーミッション一覧・報酬請求 |

================================================================================
## 6. Cloud Functions 一覧（functions-ai/）
================================================================================

| 関数名 | 種類 | 認証 | 概要 |
|--------|------|------|------|
| grantRegistrationBonus | onCall | 必要 | 新規登録ボーナスコイン付与（冪等） |
| grantRewardAdCoins | onCall | 必要 | リワード広告視聴後のコイン付与 |
| analyzeFoodPFC | onCall | 必要 | 食事テキスト → PFC/カロリー推定（OPENAI_API_KEY） |
| generateDailyAIAdvice | onCall | 必要 | ホーム用日次AIアドバイス生成 |
| aiCoachChat | onCall | 必要 | フリーチャットAIコーチ（コイン消費・返金あり） |
| revenueCatWebhook | onRequest | Webhook秘密鍵 | RevenueCat Webhook 受信・サブスク同期 |
| createCustomExercise | onCall | 必要 | マイ種目作成（無料上限チェック） |
| updateCustomExercise | onCall | 必要 | マイ種目更新 |
| deleteCustomExercise | onCall | 必要 | マイ種目削除 |
| createMealRoutine | onCall | 必要 | 食事ルーティーン作成（無料上限チェック） |
| deleteMealRoutine | onCall | 必要 | 食事ルーティーン削除 |
| getMissionsSnapshot | onCall | 必要 | デイリーミッション一覧取得 |
| claimMissionReward | onCall | 必要 | ミッション報酬請求 |
| deleteMyAccount | onCall | 必要 | アカウント削除 |
| deleteUserByEmail | onRequest | 管理者用 | メール指定でユーザー削除 |

**重要**: AI 関連処理はすべて `functions-ai/` に集約。`functions/`（default コードベース）はレガシーでほぼ空。

================================================================================
## 7. Firestore データモデル
================================================================================

```
firestore/
├── master_data/
│   └── exercises/              # 種目マスター（読み取り専用、seed_exercises.py で投入）
│
└── users/{userId}/
    ├── (ドキュメント本体)         # UserProfile + UserDemographics + 設定類
    ├── workouts/{docId}         # トレーニング記録
    ├── food_logs/{docId}        # 食事ログ
    ├── food_dictionary/{docId}  # 食事辞書（名前→PFC キャッシュ）
    ├── routines/{docId}         # トレーニングルーティーン
    ├── custom_exercises/{docId} # マイ種目（書き込みは Functions のみ）
    ├── meal_routines/{docId}    # 食事ルーティーン（書き込みは Functions のみ）
    ├── daily_metrics/{date}     # 日次メトリクス（体重・体脂肪）
    ├── daily_advice/{date}      # AIアドバイスキャッシュ
    ├── coin_transactions/{txId} # コイン台帳（書き込みは Functions のみ）
    ├── mission_events/{eventId} # ミッション監査ログ（書き込みは Functions のみ）
    └── private_meta/{docId}     # サーバー専用（RevenueCat サブスク状態等）
```

### 主要な型（utils/models.ts）

- `Phase`: 'cut' | 'maintain' | 'bulk'
- `ActivityLevel`: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
- `UserProfile`: { uid, phase, targetWeight, targetCal, isDetailedTrackingEnabled }
- `DailyMetric`: { date, weight, bodyFatPercentage? }
- `UserDemographics`: { heightCm?, birthDate? }
- `MealReminderSettings`: { enabled, breakfast/lunch/dinner Hour/Minute }
- `DailyAIAdvice`: { date, title, bullets[], calorieAdvice, workoutAdvice, contextFingerprint? }
- `AiCoachSettings`: { coachStyle, tone, customInstructions }

### セキュリティルール要約

- `master_data`: ログイン済み読み取り可、書き込み不可
- `users/{uid}` 配下の通常コレクション: 本人のみ読み書き
- `custom_exercises`, `meal_routines`, `coin_transactions`, `mission_events`: 本人読み取り可、書き込みは Functions のみ
- `private_meta`: クライアント読み書き不可

================================================================================
## 8. マネタイズ・課金システム
================================================================================

### サブスクリプション（RevenueCat）

| ティア | エンタイトルメント | 特典 |
|--------|------------------|------|
| free | — | 基本機能。広告あり。カスタム種目5件/食事ルーティーン3件まで |
| tier1 | tier1 or premium | 広告非表示、上限解放、ミッション枠 5/日 |
| tier2 | tier2 or premium | tier1 の全特典 + AI チャットで GPT-4o |

### コインシステム

- **獲得**: 新規登録ボーナス、リワード広告、ログインボーナス、デイリーミッション、サブスク付与
- **消費**: AI チャット（`aiCoachChat`）1回あたり N コイン
- **有効期限**: 獲得から 179 日（資金決済法対応）
- **残高計算**: `coin_transactions` サブコレクションの FIFO ベース合算（Cloud Functions 管理）
- **単価**: Firebase Remote Config で動的制御

### 広告（AdMob）

| 広告タイプ | 表示タイミング |
|-----------|---------------|
| バナー | 各タブ画面下部（サブスクユーザーは非表示） |
| インタースティシャル | 食事追加 N 回ごと（`FOOD_ADDS_PER_INTERSTITIAL`） |
| リワード | monetization 画面で任意視聴 → コイン獲得 |

### デイリーミッション / ウィークリーミッション

| ID | タイトル | 報酬 | 種別 | プレミアム限定 |
|----|---------|------|------|:---:|
| dm_workout_1 | ワークアウトを1回記録 | 15 | 日次 | — |
| dm_weight_1 | 体重を記録 | 10 | 日次 | — |
| dm_food_1 | 食事を1件記録 | 10 | 日次 | — |
| dm_workout_2 | ワークアウトを2回記録 | 20 | 日次 | ✓ |
| dm_food_3 | 食事を3件記録 | 15 | 日次 | ✓ |
| wm_workouts_3 | 今週ワークアウトを3回 | 25 | 週次 | — |
| wm_weight_3d | 今週3日以上で体重記録 | 20 | 週次 | — |

================================================================================
## 9. AI の設計思想
================================================================================

- 匿名チャットボットではなく、**ユーザーの実データ**（過去のトレーニング、体重経過、摂取カロリー/PFC）をコンテキストとして渡す
- 例: 「シアトルよりベンチプレスの重量が落ちている。炭水化物不足の可能性があるため、トレ前に〇〇を摂取を推奨」
- AI コーチのスタイル・口調はユーザーが設定可能（`aiCoachSettings`）
- 日次アドバイスは `contextFingerprint` でキャッシュ無効化（データ変更時に再生成）
- 食事 AI は `analyzeFoodPFC`、日次は `generateDailyAIAdvice`、チャットは `aiCoachChat` の3系統

================================================================================
## 10. 開発規約・注意点
================================================================================

- TypeScript `strict: true`
- スタイルは `theme/styles.ts` に集約（ダークテーマ基調）
- Firestore ドキュメント ID にユーザー入力を使う場合は必ず `sanitizeDocId()` を通す
- Cloud Functions のエラーメッセージにサーバー内部情報を含めない
- 広告関連コンポーネントは `.web.tsx` スタブを用意（Web ビルド対策）
- AI 関連の Cloud Functions は `functions-ai/` のみに置く
- 新機能追加時の編集ガイド: `docs/where-to-edit-for-new-features.md`
- 正本ドキュメント: `docs/CODEBASE_OVERVIEW.md`

### 新画面追加の流れ

1. `app/(tabs)/` または `app/settings/` にファイル作成
2. 必要なら `_layout.tsx` にスクリーン登録
3. `utils/models.ts` に型定義
4. `utils/` に Firestore CRUD
5. 必要なら `hooks/` にカスタムフック
6. `firestore.rules` にセキュリティルール追加

### Cloud Functions 追加の流れ

1. `functions-ai/src/` にロジック実装
2. `functions-ai/src/index.ts` から re-export
3. クライアント側に callable ラッパーを `utils/` に作成

================================================================================
## 11. 環境変数・シークレット
================================================================================

### クライアント側（.env → app.config.js 経由）

- REVENUECAT_IOS_API_KEY / REVENUECAT_ANDROID_API_KEY
- ADMOB_BANNER_UNIT_ID / ADMOB_REWARDED_UNIT_ID / ADMOB_INTERSTITIAL_UNIT_ID
- GRANT_REWARD_CALLABLE_URL（オプション）

### サーバー側（Firebase Secret Manager）

- OPENAI_API_KEY
- REVENUECAT_WEBHOOK_AUTH_TOKEN

### 注意

- `firebaseConfig.ts` に Firebase クライアント設定がハードコードされている
- `.env`, `serviceAccountKey.json` は `.gitignore` 済み
- app.json の AdMob App ID はテスト用がデフォルト。本番前に差し替え必要

================================================================================
## 12. ビルド・デプロイ
================================================================================

```bash
# ローカル開発
npm start                    # expo start（APP_VARIANT=development）
npm run android / ios        # ネイティブビルド

# EAS ビルド
eas build --profile development --platform android
eas build --profile production --platform all

# Cloud Functions デプロイ
firebase deploy --only functions:ai
firebase deploy --only firestore:rules

# テスト
npm test                     # jest（firestoreUtils.test.ts のみ現状）
npm run lint
```

================================================================================
## 13. 現状の課題・未完了の可能性
================================================================================

以下はコード上確認済みの点。壁打ち時の前提として扱ってください:

1. monetization 画面に `plannedAlert`（「準備中」）が残っている箇所がある
2. RevenueCat / AdMob の API キーは環境変数依存（app.json extra が空のことがある）
3. README のアーキテクチャ図は Python Cloud Functions と書いてあるが、実際の AI は Node.js `functions-ai/` がメイン
4. テストカバレッジは `firestoreUtils.test.ts` のみ（薄い）
5. `functions/`（default コードベース）は空のエントリポイント
6. Web ビルドは広告等がスタブ化されており、本番ターゲットは iOS/Android

================================================================================
## 14. 今回の相談テーマ（←ここを書き換えてから送る）
================================================================================

**相談したいこと**:
（例: 新機能のアイデア出し / マネタイズ設計の見直し / AI プロンプト改善 / UX改善 / リリース優先順位 / 競合差別化）

**具体的な内容**:
（ここに書く）

**制約・希望**:
（例: 実装工数2週間以内 / 既存アーキテクチャは大きく変えたくない / など）

================================================================================
## 15. 回答してほしい形式
================================================================================

1. 前提の整理（理解したこと・確認したいこと）
2. 選択肢を 2〜3 案提示（メリット・デメリット・工数感）
3. 推奨案と理由
4. 次のアクション（具体的なタスク分解）

推測で断定せず、不確かな点は質問してください。
```

---

## 使い方

1. 上の ``` で囲まれたブロック全体をコピー
2. 別のAIのチャットに貼り付け
3. 「14. 今回の相談テーマ」を書き換えて送信
4. 必要なら関連ファイル（`functions-ai/src/index.ts` のプロンプト部分など）を追加で添付
