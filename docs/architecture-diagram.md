# Notefit AI アーキテクチャ図

全体像を把握しやすいように、Mermaid 図で整理しています。  
Cursor / VSCode の Markdown プレビューや GitHub でそのまま表示できます。

---

## 1. アプリの起動〜画面表示の流れ

```mermaid
flowchart TB
    subgraph entry ["エントリ"]
        App["App.js"]
    end

    subgraph auth ["認証状態"]
        useAuthState["useAuthState()"]
        user["user"]
        initializing["initializing"]
    end

    subgraph nav ["ナビゲーション"]
        NC["NavigationContainer"]
        Root["RootNavigator"]
    end

    subgraph screens ["表示される画面"]
        Login["Login 画面"]
        Verify["メール認証 画面"]
        MainTabs["メイン（タブ）"]
    end

    App --> useAuthState
    useAuthState --> user
    useAuthState --> initializing
    App --> NC
    NC --> Root
    Root --> user

    Root -->|未ログイン| Login
    Root -->|ログイン済・未認証| Verify
    Root -->|ログイン済・認証済| MainTabs
```

- **App.js** がエントリで、**useAuthState** で Firebase のログイン状態を監視。
- **initializing** 中はローディング、終了後に **RootNavigator** で「ログイン / 認証 / メイン」のどれかを表示。

---

## 2. 画面・ナビゲーション構造

```mermaid
flowchart TB
    subgraph root ["RootNavigator（Stack）"]
        direction TB
        Login["LoginScreen"]
        Verify["VerificationScreen"]
        Main["MainTabNavigator"]
    end

    subgraph tabs ["MainTabNavigator（下タブ）"]
        HomeStack["HomeStackNavigator"]
        Training["TrainingScreen"]
        Food["FoodScreen"]
        Stats["StatsScreen"]
    end

    subgraph home_stack ["HomeStackNavigator（Stack）"]
        Home["HomeScreen"]
        Settings["SettingsScreen"]
    end

    root --> Login
    root --> Verify
    root --> Main
    Main --> HomeStack
    Main --> Training
    Main --> Food
    Main --> Stats
    HomeStack --> Home
    HomeStack --> Settings
```

| タブ | 画面 | 役割 |
|------|------|------|
| Home | HomeScreen → Settings | カレンダー・直近ワークアウト・設定 |
| Training | TrainingScreen | トレーニング記録・ルーティン |
| Food | FoodScreen | 食事（画面のみ） |
| Stats | StatsScreen | 統計 |

---

## 3. フォルダ・ファイル構成（主要部分）

```mermaid
flowchart LR
    subgraph root_files ["ルート"]
        App["App.js"]
        firebase["firebaseConfig.ts"]
        theme["theme/styles.ts"]
    end

    subgraph navigation ["navigation/"]
        RootNav["RootNavigator.tsx"]
        MainTab["MainTabNavigator.tsx"]
        HomeStack["HomeStackNavigator.tsx"]
    end

    subgraph screens_dir ["screens/"]
        auth["auth/ Login, Verify"]
        home["home/ HomeScreen"]
        training["training/ TrainingScreen"]
        food["food/ FoodScreen"]
        stats["stats/ StatsScreen"]
        settings["settings/ SettingsScreen"]
    end

    subgraph components_dir ["components/"]
        home_comp["home/ CalendarSection, WorkoutDetailModal"]
        training_comp["training/ ExerciseSelectorModal, RoutineModal"]
    end

    subgraph hooks_dir ["hooks/"]
        useAuth["useAuthState"]
        useEx["useExerciseMaster"]
        useRoutines["useRoutines"]
        useSession["useTrainingSession"]
        useHistory["useWorkoutHistory"]
        useStats["useWorkoutStats"]
    end

    subgraph app_expo ["app/（Expo Router・移行中）"]
        layout["_layout.tsx"]
        index["index.tsx"]
        auth_route["(auth)/ login, verify"]
        tabs_route["(tabs)/ home, training, food, stats"]
    end

    App --> RootNav
    App --> firebase
    RootNav --> MainTab
    MainTab --> HomeStack
    HomeStack --> home
    MainTab --> training
    MainTab --> food
    MainTab --> stats
    home --> home_comp
    training --> training_comp
```

- **実際のエントリ**は **App.js**。**navigation/** と **screens/** がメインの画面ツリー。
- **app/** は Expo Router 用で、「Expo Router migration in progress」のため、現状は **App.js + React Navigation** が主役。

---

## 4. データの流れ（Firebase・Hooks）

```mermaid
flowchart TB
    subgraph firebase ["Firebase"]
        Auth["Firebase Auth"]
        Firestore["Firestore"]
    end

    subgraph hooks ["Hooks"]
        useAuthState["useAuthState"]
        useExerciseMaster["useExerciseMaster"]
        useRoutines["useRoutines"]
        useTrainingSession["useTrainingSession"]
        useWorkoutHistory["useWorkoutHistory"]
        useWorkoutStats["useWorkoutStats"]
    end

    subgraph ui ["画面・コンポーネント"]
        App["App.js"]
        Home["HomeScreen"]
        Training["TrainingScreen"]
        Stats["StatsScreen"]
    end

    Auth --> useAuthState
    Firestore --> useExerciseMaster
    Firestore --> useRoutines
    Firestore --> useTrainingSession
    Firestore --> useWorkoutHistory
    Firestore --> useWorkoutStats

    useAuthState --> App
    useWorkoutHistory --> Home
    useRoutines --> Training
    useTrainingSession --> Training
    useExerciseMaster --> Training
    useWorkoutStats --> Stats
```

- **認証**: `useAuthState` → Firebase Auth。
- **トレーニング**: マスタ・ルーティン・セッション・履歴は Firestore + 各 hooks。
- **統計**: `useWorkoutStats` を Stats 画面で利用。

---

## 5. 認証フロー（誰がどこに飛ぶか）

```mermaid
stateDiagram-v2
    [*] --> Initializing: 起動
    Initializing --> Login: 未ログイン
    Initializing --> Verify: ログイン済・メール未認証
    Initializing --> MainTabs: ログイン済・認証済

    Login --> Verify: ログイン成功
    Verify --> MainTabs: メール認証完了
    MainTabs --> Login: ログアウト
```

- **app/_layout.tsx**（Expo Router）側でも同様の分岐を `useEffect` で行っているが、**実際に画面を出しているのは App.js の RootNavigator**。

---

## 6. まとめ（一枚で見る）

```mermaid
flowchart TB
    App["App.js"]
    Auth["useAuthState + Firebase Auth"]
    Root["RootNavigator"]
    Login["Login"]
    Verify["Verify"]
    Tabs["MainTabNavigator"]
    Home["HomeStack → HomeScreen, Settings"]
    Training["TrainingScreen"]
    Food["FoodScreen"]
    Stats["StatsScreen"]
    Firestore["Firestore (workouts, routines, ...)"]
    Hooks["useRoutines, useWorkoutHistory, ..."]

    App --> Auth
    App --> Root
    Root --> Login
    Root --> Verify
    Root --> Tabs
    Tabs --> Home
    Tabs --> Training
    Tabs --> Food
    Tabs --> Stats
    Firestore --> Hooks
    Hooks --> Home
    Hooks --> Training
    Hooks --> Stats
```

- **入口**: App.js → useAuthState → RootNavigator。
- **画面**: Login / Verify / メイン（Home, Training, Food, Stats）。
- **データ**: Firestore + hooks が各画面に渡る。

編集や追記が必要なら、この `docs/architecture-diagram.md` を直接いじると全体図を更新しやすいです。
