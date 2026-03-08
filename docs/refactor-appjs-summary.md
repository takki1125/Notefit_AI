### このドキュメントについて

このファイルは、巨大だった `App.js` を分割してコードを整理した内容を、チームメンバー向けにまとめたものです。  
アプリの**見た目や挙動は変えずに、コードだけを整理**しています。

---

### 1. 全体構成の変化（ざっくり）

#### 変更前
- `App.js` の中に、ほぼすべてが入っていました。
  - ログイン・メール認証画面
  - ホーム画面
  - トレーニング画面
  - 統計（グラフ）画面
  - 設定画面
  - 各種モーダル（種目選択、ルーティン保存、ワークアウト詳細表示 など）
  - カレンダー表示
  - Firebase 認証・Firestore クエリ・AsyncStorage などのロジック
  - タブナビゲーション / スタックナビゲーションの定義

#### 変更後（フォルダ単位で整理）

- `App.js`
  - 役割: **アプリのエントリーポイントだけ**
  - やっていること:
    - `useAuthState` で認証状態を取得
    - `NavigationContainer` でナビゲーションを包む
    - `RootNavigator` に `user` と `forceRefreshUser` を渡す

- `navigation/`
  - `RootNavigator.tsx`  
    - 認証状態に応じて画面を出し分け  
      - 未ログイン → `LoginScreen`
      - ログイン済み・メール未確認 → `VerificationScreen`
      - メール確認済み → `MainTabNavigator`
  - `MainTabNavigator.tsx`  
    - 4つのタブを定義
      - `HomeTab` → `HomeStackNavigator`
      - `TrainingTab` → `TrainingScreen`
      - `FoodTab` → `FoodScreen`（中身は「準備中」画面）
      - `StatsTab` → `StatsScreen`
  - `HomeStackNavigator.tsx`  
    - ホームタブ内のスタック
      - `HomeScreen`
      - `SettingsScreen`

- `screens/`（画面コンポーネント）
  - `auth/LoginScreen.tsx`  
    - メールアドレス / パスワード入力
    - 新規登録 / ログイン
    - 利用規約チェック
  - `auth/VerificationScreen.tsx`  
    - メール確認待ち画面
    - 「確認完了」「再送」「別アカウントでやり直し」のボタン
  - `home/HomeScreen.tsx`  
    - ホーム画面のレイアウト
    - 「Welcome back, xxxx」や「LATEST WORKOUT」カードを表示
    - 中で `useWorkoutHistory` フックと `CalendarSection` / `WorkoutDetailModal` を利用
  - `training/TrainingScreen.tsx`  
    - トレーニング画面
    - メニュー一覧・セット入力・DONE ボタン・終了ボタンなどの UI
    - 中で `useTrainingSession` フックとモーダルコンポーネントを利用
  - `stats/StatsScreen.tsx`  
    - グラフ（直近4週間の回数、部位別セット数）表示専用
    - 中で `useWorkoutStats` フックを利用
  - `settings/SettingsScreen.tsx`  
    - ログアウト、アカウント削除画面
  - `food/FoodScreen.tsx`  
    - 現状は「準備中」とだけ表示（`DummyScreen` のラッパー）

- `components/home/`
  - `CalendarSection.tsx`  
    - カレンダー表示（トレーニングした日をハイライト）
  - `WorkoutDetailModal.tsx`  
    - ワークアウト詳細モーダル（削除ボタン付き）

- `components/training/`
  - `ExerciseSelectorModal.tsx`  
    - 種目選択モーダル（部位タブ + セクション付きリスト）
  - `RoutineModal.tsx`  
    - ルーティン保存 / 読み込みモーダル
  - （必要なら今後）`ExerciseCard.tsx`, `TrainingHeader.tsx`, `EmptyTrainingState.tsx` にも分割可能

- `screens/common/`
  - `DummyScreen.tsx`  
    - 「準備中」と表示するだけの単純な画面

- `hooks/`（カスタムフック）
  - `useAuthState.ts`  
    - Firebase の `onAuthStateChanged` をラップ
    - `user`, `initializing`, `forceRefreshUser` を返す
  - `useWorkoutHistory.ts`  
    - ホーム画面用
    - Firestore から `workouts` を取得
    - `trainedDays`（カレンダー用の日にち）を計算
    - 最新のワークアウト `lastWorkout` を計算
    - 結果を `@workout_history` キーで AsyncStorage に保存（Stats 画面用）
    - 日付タップ時の処理や削除処理（Firestore の削除、再取得）もここで実施
  - `useTrainingSession.ts`  
    - トレーニング画面用
    - メニュー一覧 (`menu`) とルーティン名 (`currentRoutineName`)
    - タイマー (`timerSeconds`, `isTimerActive`)
    - 種目追加 / 削除、セット追加 / 削除 / 更新、DONE トグル
    - ワークアウト終了時の Firestore 保存 (`users/{uid}/workouts`)
    - メニューが一つでもある間はタブバーを隠す / 無くなったら戻す
  - `useExerciseMaster.ts`  
    - 種目マスタ（`master_data` コレクション）を Firestore から取得
    - 「部位タブ → セクション付きリスト」に変換したデータを返す
  - `useRoutines.ts`  
    - ルーティン管理（`users/{uid}/routines` コレクション）
    - 一覧取得、保存、新規ルーティン名の状態管理、削除
  - `useWorkoutStats.ts`  
    - AsyncStorage の `@workout_history` から履歴を読み込み
    - 直近4週間のワークアウト回数配列
    - 今月の部位別セット数配列
    - 上記を計算して Stats 画面に渡す

- `utils/`
  - `time.ts`  
    - `formatTime(totalSeconds)`：秒数を `MM:SS` または `H:MM:SS` に変換
  - `workoutCategories.ts`  
    - 種目名から「胸/背中/脚/肩/腕」を判定する関数  
      （例: 「ベンチ」「チェスト」→ 胸）

---

### 2. App.js がいま何をしているか

`App.js` の役割は、**「アプリ起動時の入口」だけ**です。

- 認証状態は `useAuthState` に任せる:
  - `const { user, initializing, forceRefreshUser } = useAuthState();`
  - ローディング中はスピナーを表示
- 画面の出し分けは `RootNavigator` に任せる:
  - `<NavigationContainer>` の内側で `<RootNavigator user={user} forceRefreshUser={forceRefreshUser} />`
  - その中で Login / Verify / Main（タブ）を切り替え

これにより、App.js の行数は大幅に減り、  
**「どの画面がどこで定義されているか」が一目でわかる構造**になっています。

---

### 3. 機能面の注意点（変わっていないところ）

- 画面の見た目・動きは、元の App.js の実装をそのまま移しているので**変わっていません**。
  - ログイン〜メール認証〜メイン画面への遷移
  - ホームのカレンダーと最新ワークアウト表示
  - トレーニングのメニュー作成 / セット入力 / DONE ボタン / 保存
  - Stats 画面のグラフ表示
  - 設定画面でのログアウト / アカウント削除
- Firestore のコレクション構造も変更していません。
  - `users/{uid}/workouts`
  - `users/{uid}/routines`
  - `master_data`

---

### 4. 友人に伝えるときの「一言メモ」

> 「前は App.js の中に全部ごちゃっと入っていたけど、  
>  いまは **画面ごとに `screens/` に分割**して、  
>  データ取得やビジネスロジックは **`hooks/` にまとめた**。  
>  App.js は **ナビゲーションを呼ぶだけの入口**になっているよ。」

困ったときは、まず以下を見ると分かりやすいです。

- どの画面？ → `screens/〇〇/〇〇Screen.tsx`
- その画面の裏側のロジックは？ → 対応する `hooks/` のファイル
- 共通で使う小さい処理は？ → `utils/`

