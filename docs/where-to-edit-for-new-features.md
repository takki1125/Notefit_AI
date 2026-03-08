# 新しい機能を実装するとき、どこをいじるか

機能の種類ごとに、**編集するファイル・フォルダ**をまとめています。

---

## 一覧（さっと見る用）

| やりたいこと | 主にいじる場所 |
|--------------|----------------|
| **新しい画面を1つ追加する** | `screens/` に追加 → 遷移元でナビに登録 |
| **既存画面のUI・挙動を変える** | 対応する `screens/` か `components/` |
| **新しいタブを追加する** | `screens/` に画面 + `navigation/MainTabNavigator.tsx` |
| **Home 配下に画面を追加（例：設定の隣）** | `screens/` に画面 + `navigation/HomeStackNavigator.tsx` |
| **ログイン前・認証フローを変える** | `navigation/RootNavigator.tsx` / `screens/auth/` |
| **共通デザイン・スタイル** | `theme/styles.ts` |
| **Firestore のデータを読む・書く** | `hooks/` に hook を追加 or 既存 hook を編集 |
| **Firebase の設定を変える** | `firebaseConfig.ts` / `firestore.rules` |

---

## 1. 新しい「画面」を追加する

### やること

1. **画面コンポーネントを作る**  
   - 場所: **`screens/`**（どのタブ用かでサブフォルダを分けるとよい）
   - 例: `screens/home/NewFeatureScreen.tsx`
2. **ナビに登録する**  
   - どこに置くかで次のどれかを編集：
     - **メインの下タブに出す** → **`navigation/MainTabNavigator.tsx`** に `Tab.Screen` を追加
     - **Home タブの中だけ（スタックの1画面）** → **`navigation/HomeStackNavigator.tsx`** に `Stack.Screen` を追加
     - **ログイン前・認証中に出す** → **`navigation/RootNavigator.tsx`** に `Stack.Screen` を追加
3. **どこかから遷移する**  
   - 遷移元の画面で `navigation.navigate('Screen名')` を呼ぶ（React Navigation の場合）。

### 参照

- 既存の画面例: `screens/home/HomeScreen.tsx`, `screens/training/TrainingScreen.tsx`
- タブ追加: `navigation/MainTabNavigator.tsx` の `Tab.Screen`
- Home 内スタック追加: `navigation/HomeStackNavigator.tsx` の `Stack.Screen`

---

## 2. 既存画面の「見た目・挙動」だけ変える

- **その画面のコードを直接編集**  
  - 場所: **`screens/〇〇/〇〇Screen.tsx`**
- **部品として切り出したい**  
  - 場所: **`components/`**（例: `components/home/CalendarSection.tsx`）
  - 画面側で `import` して使う。

**スタイルを共通化したい**  
- **`theme/styles.ts`** にスタイルを追加し、各画面で `import { styles } from '../theme/styles'` して使う。

---

## 3. 新しい「タブ」を追加する（下タブに1つ増やす）

1. **`screens/`** に新しい画面用フォルダとファイルを作る  
   - 例: `screens/mypage/MyPageScreen.tsx`
2. **`navigation/MainTabNavigator.tsx`** を編集  
   - `import MyPageScreen from '../screens/mypage/MyPageScreen'`
   - `<Tab.Screen name="MyPageTab" component={MyPageScreen} options={{ tabBarIcon: ... }} />` を追加
3. アイコンは `lucide-react-native` を import して `tabBarIcon` に渡す（既存タブをコピーするとよい）。

---

## 4. Home タブの中に「新しい画面」を追加する（設定の隣など）

1. **`screens/`** に画面を作る  
   - 例: `screens/home/DetailScreen.tsx`
2. **`navigation/HomeStackNavigator.tsx`** を編集  
   - `import DetailScreen from '../screens/home/DetailScreen'`
   - `<Stack.Screen name="Detail" component={DetailScreen} />` を追加
3. Home やカレンダーなどから `navigation.navigate('Detail', { id: '...' })` で遷移。

---

## 5. 認証・ログインまわりを変える

| 変更内容 | 編集するファイル |
|----------|------------------|
| ログイン画面のUI・処理 | **`screens/auth/LoginScreen.tsx`** |
| メール認証画面 | **`screens/auth/VerificationScreen.tsx`** |
| ログイン済みかどうかの分岐 | **`navigation/RootNavigator.tsx`**（どの画面を出すか） |
| 認証状態の取り方（フック） | **`hooks/useAuthState.ts`** |
| Firebase Auth の設定 | **`firebaseConfig.ts`**（プロジェクト設定は Firebase コンソール側も） |

---

## 6. データの取得・保存（Firestore など）を追加する

- **新しいデータの種類や API を用意する**  
  - 場所: **`hooks/`** に新しい hook を追加  
  - 例: `hooks/useMeals.ts`（食事記録用）
- 中で **`firebaseConfig.ts`** の `db` / `auth` を import して Firestore を読む・書く。
- 画面ではその hook を呼ぶだけにする（例: `const { data, save } = useMeals();`）。

**既存のデータの読む・書くロジックを変える**  
- 対応する **`hooks/`** のファイルを編集  
  - 例: ワークアウト履歴 → `hooks/useWorkoutHistory.ts`、ルーティン → `hooks/useRoutines.ts`

**セキュリティ・インデックス**  
- ルール変更: **`firestore.rules`**
- 複合クエリ用インデックス: **`firestore.indexes.json`**

---

## 7. 共通レイアウト・テーマ

| やりたいこと | 編集するファイル |
|--------------|------------------|
| 色・余白・フォントなど共通スタイル | **`theme/styles.ts`** |
| アプリ全体のラップ（認証チェックなど） | **`App.js`** または **`app/_layout.tsx`**（どちらをエントリにしているかによる） |

---

## 8. フォルダ構成の対応表

```
ルート
├── App.js                 … エントリ（main を App.js にしている場合）
├── app/                   … Expo Router 用（現在はサブセットで利用の可能性）
├── navigation/            … 画面のつなぎ方（どこに何を表示するか）
│   ├── RootNavigator.tsx     → ログイン / 認証 / メインの切り替え
│   ├── MainTabNavigator.tsx  → 下タブ（Home, Training, Food, Stats）
│   └── HomeStackNavigator.tsx → Home タブ内のスタック
├── screens/               … 画面コンポーネント（ここを増やす・いじる）
│   ├── auth/
│   ├── home/
│   ├── training/
│   ├── food/
│   ├── stats/
│   └── settings/
├── components/            … 再利用する部品（モーダル・カードなど）
│   ├── home/
│   └── training/
├── hooks/                 … データ取得・認証状態（ここを増やす・いじる）
├── theme/styles.ts        … 共通スタイル
├── firebaseConfig.ts      … Firebase 初期化
├── firestore.rules        … Firestore のルール
└── utils/                 … 日付・分類など汎用関数
```

---

## まとめ

- **「新しい画面」** → `screens/` に追加 + 対応する **`navigation/〇〇Navigator.tsx`** に 1 行追加。
- **「既存画面の変更」** → その **`screens/`** か **`components/`**。
- **「新しいデータ」** → **`hooks/`** に hook を追加し、画面から呼ぶ。
- **「見た目の統一」** → **`theme/styles.ts`**。
- **「認証・ルートの分岐」** → **`navigation/RootNavigator.tsx`** と **`screens/auth/`**。

迷ったら、似た機能の既存ファイル（同じタブの画面や同じ種類の hook）を開いて、同じパターンで追加するのがおすすめです。
