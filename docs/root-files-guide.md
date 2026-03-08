# ルートディレクトリのファイル一覧と必要性

## 結論

**App.js 以外も、ほぼすべて「何かしらの目的で必要」です。**  
削除してよいのは「ドキュメント・好みの設定」程度だけです。

---

## 必須（消すと動かなくなる／ビルド・デプロイに必要）

| ファイル | 役割 |
|----------|------|
| **package.json** | 依存関係・スクリプト・エントリ（`main`）の定義。npm / Expo の要。 |
| **package-lock.json** | インストールバージョン固定。再現ビルドに必要。 |
| **app.json** | Expo の設定（アプリ名・アイコン・スプラッシュ・scheme など）。 |
| **tsconfig.json** | TypeScript の設定。`.ts` / `.tsx` を使っているので必須。 |
| **firebaseConfig.ts** | Firebase（Auth・Firestore）の初期化。多くの画面・hooks が import している。 |

---

## Firebase 関連（Firebase を使うなら必要）

| ファイル | 役割 |
|----------|------|
| **firebase.json** | Firebase CLI の設定（Hosting / Emulators など）。`firebase deploy` などで参照。 |
| **.firebaserc** | どの Firebase プロジェクトに紐づくか。`firebase deploy` に必要。 |
| **firestore.rules** | Firestore のセキュリティルール。デプロイしないと本番で拒否される。 |
| **firestore.indexes.json** | Firestore の複合インデックス。複雑なクエリを使うならデプロイが必要。 |

---

## エントリポイントについて（App.js と Expo Router）

- **package.json** の `"main": "expo-router/entry"` のため、**実際のエントリは Expo Router**（`app/` フォルダ）です。
- そのため **App.js は現状では読み込まれていません**（Expo が起動時に使うのは `expo-router/entry` → `app/_layout.tsx`）。
- もし **App.js を本当のエントリにしたい**場合は、`package.json` の `main` を `"App.js"` に変更する必要があります。

---

## 推奨（なくても動くが、あった方がよい）

| ファイル | 役割 |
|----------|------|
| **.gitignore** | 不要なファイルを Git に含めないため。 |
| **eslint.config.js** | コードの lint ルール。品質・統一性のため推奨。 |

---

## 任意

| ファイル | 役割 |
|----------|------|
| **README.md** | プロジェクト説明。リポジトリの顔としてあると便利。 |
| **index.html** | Expo Web ビルド時に使う場合あり。Web を出さないなら必須ではない。 |

---

## 注意したいファイル

| ファイル | 備考 |
|----------|------|
| **serviceAccountKey.json** | Firebase Admin 用の秘密鍵。**クライアントアプリのルートに置くのは避け、.gitignore に入れる**のが無難。サーバー（Cloud Functions 等）だけで使う想定。 |

---

## まとめ

- **消してよいもの**: 実質 **README.md** や **index.html**（Web を使わない場合）程度。
- **App.js**: 今の設定ではエントリではない。エントリにしたいなら `package.json` の `main` を `App.js` に変更する必要あり。
- それ以外のルートの設定ファイル（package.json, app.json, tsconfig, firebase まわり, .gitignore, eslint）は **必要または強く推奨** です。
