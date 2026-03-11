# React Native アプリケーション：ディレクトリ構造の再定義とリファクタリング報告

本ドキュメントは、肥大化した `App.js` を機能ごとに分割・整理した内容をまとめたものである。
**アプリケーションのUIおよび挙動に変更はなく、コードの保守性向上を目的とした内部構造の整理**に留めている。

---

## 1. 全体構成の変化

### 変更前
`App.js` にほぼ全てのロジックとUIが集中していた。
* 認証（ログイン・メール認証）
* 主要画面（ホーム、トレーニング、統計、設定、カレンダー）
* 各種モーダル（種目選択、ルーティン保存、詳細表示等）
* データロジック（Firebase Auth、Firestore、AsyncStorage）
* ナビゲーション定義（Tab / Stack）

### 変更後（ディレクトリ単位での責務分散）



* **`App.js`**
    * 役割：アプリのエントリーポイント。
    * 処理：`useAuthState` による認証状態の取得、`NavigationContainer` によるラップ、`RootNavigator` への props 伝搬のみを行う。

* **`navigation/`**
    * `RootNavigator.tsx`：認証状態（未ログイン / 未確認 / 確認済）に応じた画面遷移の制御。
    * `MainTabNavigator.tsx`：4つの主要タブ（Home, Training, Food, Stats）を定義。
    * `HomeStackNavigator.tsx`：ホームタブ内での Stack 遷移（Home ↔ Settings）を管理。

* **`screens/`（画面コンポーネント）**
    * `auth/`：ログインおよびメール確認画面。
    * `home/`：ホーム画面。`useWorkoutHistory` を介して履歴を表示。
    * `training/`：トレーニングセッション画面。`useTrainingSession` で状態を管理。
    * `stats/`：統計表示専用。`useWorkoutStats` を利用。
    * `settings/`：設定およびアカウント管理。
    * `food/`：食事管理（現状は `DummyScreen` による準備中表示）。

* **`components/`（再利用可能なUIパーツ）**
    * `home/`：カレンダーセクション、ワークアウト詳細モーダル。
    * `training/`：種目選択モーダル、ルーティン管理モーダル。

* **`hooks/`（カスタムフック：ビジネスロジックの分離）**
    * `useAuthState.ts`：Firebase 認証状態の監視。
    * `useWorkoutHistory.ts`：Firestore からの履歴取得、AsyncStorage へのキャッシュ、削除処理。
    * `useTrainingSession.ts`：トレーニング中の状態（種目、セット、タイマー）管理および保存処理。
    * `useExerciseMaster.ts`：種目マスタデータの取得と整形。
    * `useRoutines.ts`：ルーティンの CRUD 操作。
    * `useWorkoutStats.ts`：統計データの計算ロジック。

* **`utils/`（汎用関数）**
    * `time.ts`：秒数のフォーマット変換。
    * `workoutCategories.ts`：種目名に基づく部位（胸・背中等）の判定。

---

## 2. App.js の責務

現在の `App.js` は**「アプリケーションの起動制御」**に特化している。

1. **認証状態の委譲**: `useAuthState` から `user`, `initializing` 等を受け取り、ローディング中はスプラッシュ（スピナー）を表示する。
2. **ルーティングの委譲**: 実際の画面切り分けは `RootNavigator` が担当し、`App.js` 自体はナビゲーションのルートを定義するのみである。

これにより、コードの見通しが良くなり、特定の画面やロジックの修正箇所を特定する時間が大幅に短縮される。

---

## 3. 仕様の維持（変更のない箇所）

以下の項目については、従来の実装を継承しており変更はない。

* **ユーザー体験**: ログインフロー、カレンダー表示、トレーニング入力、グラフ表示等の挙動は同一。
* **データ構造**: Firestore のコレクション（`users/{uid}/workouts`, `users/{uid}/routines`, `master_data`）に変更はない。

---

## 4. 開発メンバーへの共有事項

今後、機能追加やデバッグを行う際は、以下の基準でファイルを参照すること。

* **画面UIを変更したい**: `screens/` 内の該当画面を確認。
* **データ取得や計算ロジックを変更したい**: 対応する `hooks/` を確認。
* **ナビゲーションの構成（タブの増減など）を変えたい**: `navigation/` を確認。

> **一言メモ**
> 「`App.js` に集中していたコードを、**画面 (`screens/`)** と **ロジック (`hooks/`)** に明確に分離した。`App.js` は単なるナビゲーションの入り口として機能しているため、コードの全体像が把握しやすくなっている。」