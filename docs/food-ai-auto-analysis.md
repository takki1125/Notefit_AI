## Notefit AI プロジェクト概要（食事記録AI用）

このドキュメントは、**食事記録タブの「AIで自動解析」機能**を実装する別のAIエージェント向けのプロジェクト概要・仕様書です。
Expo Router / React Native / Firebase を使ったモバイルアプリで、トレーニングと食事を記録するサービスです。

---

## 技術スタックと全体構成

- **フロントエンド / アプリ**
  - フレームワーク: **React Native**
  - ルーティング: **Expo Router (`app/` ディレクトリ構成)**
    - 認証グループ: `app/(auth)/...`
    - 認証後タブ: `app/(tabs)/home.tsx`, `training.tsx`, `food.tsx`, `stats.tsx`, `settings.tsx`
  - UI:
    - 共通スタイル: `theme/styles.ts`
    - アイコン: `lucide-react-native`
  - ローカルストレージ: `@react-native-async-storage/async-storage`

- **バックエンド / データストア**
  - Firebase Authentication: `firebaseConfig.ts` 経由で使用
  - Firebase Firestore:
    - トレーニング記録: `users/{uid}/workouts`
    - ルーティンテンプレート: `users/{uid}/routines`
    - マスターデータ（種目一覧など）: `master_data` コレクション
    - 食事記録（1日分の確定データ）: `users/{uid}/food_logs`

- **ルートレイアウト**
  - `app/_layout.tsx`
    - `useAuthState()` の結果（`user`, `initializing`）と Expo Router の `segments` を見て、
      - 未ログインの場合: `/(auth)/login` へリダイレクト
      - メール未認証の場合: `/(auth)/verify` へリダイレクト
      - ログイン & 認証済みで `(auth)` グループ内にいる場合: `/(tabs)/home` へ遷移

---

## 主要タブごとの役割

- **Home タブ `app/(tabs)/home.tsx`**
  - 当月カレンダー表示（トレーニングした日がハイライト）
  - 直近のワークアウト（`LATEST WORKOUT`）の概要カード
  - **今日の食事サマリー (`TODAY'S NUTRITION`)**
    - `Food` タブが `AsyncStorage` に保存した `@food_meals_today` を読み込み
    - その日の合計カロリーとタンパク質量を表示

- **Training タブ `app/(tabs)/training.tsx`**
  - マスターデータからトレーニング種目を選択してメニューを作成
  - セット数 / 重量 / 回数 / 完了フラグを入力してワークアウトを記録
  - ルーティン保存・読み込み機能
  - 終了時に Firebase Firestore `users/{uid}/workouts` にドキュメント保存

- **Food タブ `app/(tabs)/food.tsx`（今回のAI実装ターゲット）**
  - 1 日の食事を複数件 `Meal` として登録し、合計 PFC とカロリーを集計
  - ローカル保存:
    - キー: `@food_meals_today`
    - 値: `Meal[]` を JSON シリアライズ
  - クラウド保存:
    - コレクション: `users/{uid}/food_logs`
    - ドキュメントID: `YYYY-MM-DD_Food`
    - 内容: `meals`, `totalCal`, `totalPro`, `totalFat`, `totalCarb` など
  - **AIで自動解析 UI が既に実装されており、中身（API 呼び出し）は未実装**

- **Stats タブ `app/(tabs)/stats.tsx`**
  - 現状はプレースホルダー画面（「既存 StatsScreen の移行予定」と表示）

- **Settings タブ**
  - `app/(tabs)/settings.tsx` → `app/settings.tsx` のラッパー
  - ログアウト、アカウント削除（Firebase Authentication のユーザー削除）など

---

## 食事記録機能の現状仕様（Food タブ）

- 実装ファイル: `app/(tabs)/food.tsx`
- 型:
  - `Meal`:
    - `id: string`
    - `name: string`
    - `cal: number`
    - `pro: number`
    - `fat: number`
    - `carb: number`
- 状態管理:
  - `meals: Meal[]`
  - 入力フォーム用の state:
    - `foodName`, `cal`, `pro`, `fat`, `carb`（いずれも string）
  - AI 入力用:
    - `aiInput: string` … ユーザーが「吉野家の牛丼 並盛」などを入れるテキストボックス
    - `isAiLoading: boolean` … AI 解析中のローディング表示用

### ローカル保存とクラウド保存

- **ローカル (`AsyncStorage`)**
  - キー: `@food_meals_today`
  - 保存タイミング:
    - 食事追加時（`handleAddFood`）に `Meal[]` 全体を上書き保存
    - 食事削除時（`handleRemoveFood`）にも同様

- **クラウド (`Firestore`)**
  - 関数: `handleSaveToFirebase`
  - フロー:
    - `meals` が空ならアラートで中断
    - 日付から `YYYY-MM-DD_Food` 形式の `docId` を組み立て
    - `users/{uid}/food_logs/{docId}` に以下を保存:
      - `date`（`serverTimestamp()`）
      - `dateObj`（`now.toISOString()`）
      - `meals`（`Meal[]`）
      - `totalCal`, `totalPro`, `totalFat`, `totalCarb`
    - 保存成功後、`AsyncStorage.removeItem(STORAGE_KEY)` でローカルクリアし、`meals` state を空にする

---

## AI 自動解析 UI の現状

- 対象ファイル: `app/(tabs)/food.tsx`
- 関連する state:
  - `aiInput`（ユーザー入力のフリーテキスト）
  - `isAiLoading`（ローディングインジケータの表示制御）

### ハンドラ: `handleAIGenerate`

`handleAIGenerate` が **AI 呼び出しのためのエントリポイント** です。  
現状は UI テスト用のダミー実装になっています。

- 入力検証:
  - `aiInput` が空の場合はアラートを出して return
- ローディング制御:
  - `setIsAiLoading(true)` でボタンをスピナー表示に変更
- TODO コメント:
  - `// TODO: ここに相方がAI APIと通信する処理を書く`
  - ここを別AIが実装する想定
- ダミー処理（要削除 or 差し替え）:
  - `setTimeout` で 1.5 秒後に以下を実行:
    - `setFoodName(aiInput);`
    - `setCal('500');`
    - `setIsAiLoading(false);`
    - `setAiInput('');`
    - `Alert.alert('UIテスト', '相方へ：ここにAIのレスポンスを反映させてね！');`

---

## AI 自動解析機能の要件（ドラフト）

ここから先は「別のAIに相談して一緒に設計するためのたたき台」です。  
この案をベースに、**外部APIの選定・プロンプト設計・レスポンス形式**などを一緒に詰めてください。

### 1. 入力

- ソース: `aiInput`（ユーザーの日本語テキスト）
  - 例:
    - 「吉野家の牛丼 並盛」
    - 「朝: プロテイン 1杯, ランチ: サラダチキン 1個と白米200g」
    - 「コンビニで唐揚げ弁当とおにぎり2個」
- 条件:
  - 主に日本語で書かれることを想定
  - 複数の食事（朝・昼・夜など）が1文に含まれていてもよい

### 2. 出力（AI が返してほしい情報のイメージ）

AI からは、以下の形式の JSON もしくは構造化データを受け取りたい想定です。

- 単一 or 複数の `Meal` レコードに変換できること
- フィールド:
  - `name: string` … 食事名（「牛丼 並盛」「唐揚げ弁当」など）
  - `cal: number` … カロリー（kcal）
  - `pro: number` … タンパク質量（g）
  - `fat: number` … 脂質量（g）
  - `carb: number` … 炭水化物量（g）

※ 精度は 100% でなくてよく、「一般的な栄養価の目安」で構いません。  
　食品データベース（例: 文部科学省の食品成分データベース）との連携や、LLM による推定など、具体的な実装方法は別途検討します。

### 3. UI への反映方法（想定）

AI からの推論結果を受け取ったあと、以下の 2 パターンがあり得ます。

- **パターン A: 入力フォームだけを自動入力する**
  - `setFoodName(推論された name)`
  - `setCal(String(cal))`
  - `setPro(String(pro))`
  - `setFat(String(fat))`
  - `setCarb(String(carb))`
  - ユーザーは値を確認・微調整してから「リストに追加」ボタンを押す

- **パターン B: 直接 `meals` に追加する**
  - `const newMeal: Meal = { ... }` を作り、`saveToLocal([...meals, newMeal])` を呼ぶ
  - 自動で「食べたもの履歴」に追加される

どちらの UX にするかはまだ厳密に決めていませんが、**現状のUIは A パターン（フォームに入れてユーザーが確認する）を想定したレイアウト**になっています。

### 4. エラーハンドリング / バリデーション

- AI API 呼び出しが失敗した場合
  - `setIsAiLoading(false)` を必ず呼ぶ
  - `Alert.alert` でユーザーに失敗を知らせる
  - 可能なら「ざっくりカロリーだけ」など部分的な fallback を返す

- 推論結果の数値がおかしい場合
  - 例: 負の値、極端に大きい値（> 5000kcal など）
  - 範囲チェックを行い、明らかにおかしければ修正するか、警告を出す

### 5. セキュリティ / プライバシー

- 食事内容は一見センシティブではありませんが、**ユーザーID と紐づく健康データ**です。
- 外部の LLM / API を使う場合は、以下を考慮してください。
  - 送信する情報を最小限にする（ユーザーのメールアドレスや UID などを送らない）
  - ベンダーのプライバシーポリシー・利用規約を確認する

---

## 別AIへの具体的な依頼イメージ

このドキュメントを読んだ別のAIには、例えば次のような依頼を想定しています。

- **タスク例1**
  - 「`app/(tabs)/food.tsx` の `handleAIGenerate` 内に、LLM または食品データベースAPIを呼び出す処理を書いてください。」
  - 「入力は `aiInput` の日本語テキストです。出力で `Meal` 型に変換して、フォームに自動入力する or 直接 `meals` に追加する実装を提案してください。」

- **タスク例2**
  - 「日本のコンビニ・チェーン店メニューに強い食品データベースAPIを検索し、このアプリから呼び出すためのTypeScriptコードを生成してください。」

---

## まとめ

- このプロジェクトは、Expo Router + React Native + Firebase を使った**筋トレ & 食事記録アプリ**です。
- 食事記録タブ (`app/(tabs)/food.tsx`) には、**AIによる自動PFC推定のためのUIとフックポイント**が既に用意されています。
- 実際の AI 呼び出しロジックは `handleAIGenerate` に実装予定であり、  
  このドキュメントはその実装を他のAIに依頼するための「仕様書」として利用できます。
