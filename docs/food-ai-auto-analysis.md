# 食事AI自動解析機能 — 実装リファレンス

> **最終更新**: 2026-04-14
> **ステータス**: 実装済み（Cloud Functions + クライアント連携）

---

## 概要

ユーザーが Food タブで自然文（例:「吉野家の牛丼 並盛とサラダ」）を入力すると、Cloud Function `analyzeFoodPFC` が OpenAI GPT-4o-mini を呼び出し、PFC（タンパク質・脂質・炭水化物）とカロリーを推定して返す。

---

## アーキテクチャ

```
[クライアント]                          [サーバー]
app/(tabs)/food.tsx                    functions-ai/src/index.ts
  │                                      │
  │  httpsCallable("analyzeFoodPFC")     │
  │ ──────────────────────────────────▶  analyzeFoodPFC (onCall)
  │    { text: "牛丼 並盛" }             │
  │                                      │  OpenAI API (gpt-4o-mini)
  │                                      │  ──▶ JSON レスポンス
  │  ◀──────────────────────────────────  │
  │    { total: {...}, items: [...] }     │
  │                                      │
  ▼
  食事辞書に保存 (food_dictionary)
  今日の食事リストに追加
```

---

## クライアント側（`app/(tabs)/food.tsx`）

### 処理フロー（`resolveFoodNutritionFromText`）

1. ユーザー入力をトリム
2. **食事辞書キャッシュ確認**: `users/{uid}/food_dictionary/{safeId}` を参照（`sanitizeDocId` でIDをサニタイズ）
3. キャッシュヒット → そのまま PFC データを返す
4. キャッシュミス → Cloud Function `analyzeFoodPFC` を呼び出し
5. レスポンスの `total` フィールドから PFC を抽出
6. 結果を今日の食事リストに追加

### 関連する状態

| state | 用途 |
|-------|------|
| `scratchAiInput` | AI 解析用テキスト入力 |
| `isScratchAiLoading` | AI 解析中のローディング表示 |

### 食事辞書（`food_dictionary`）

- パス: `users/{uid}/food_dictionary/{safeId}`
- `safeId` は `sanitizeDocId(trimmed)` で生成（`/` → `_` 置換等）
- フィールド: `name`, `cal`, `pro`, `fat`, `carb`, `updatedAt`, `isFavorite`
- 手動追加・AI 解析の両方で辞書に保存される

---

## サーバー側（`functions-ai/src/index.ts`）

### `analyzeFoodPFC` 関数

| 項目 | 値 |
|------|-----|
| 種類 | `onCall`（Gen2 Callable） |
| リージョン | `asia-northeast1` |
| 認証 | 必須（`request.auth` チェック） |
| シークレット | `OPENAI_API_KEY`（Firebase Secret Manager） |
| invoker | `public` |

### 入力バリデーション

- `text` が空文字・非文字列 → `invalid-argument`
- `text` が 500 文字超 → `invalid-argument`
- 任意: `demographics`（身長・年齢、推定精度向上用）

### OpenAI 呼び出し

- モデル: `gpt-4o-mini`
- `response_format: { type: "json_object" }`
- `temperature: 0.2`（低めで安定性重視）
- システムプロンプトで JSON フォーマットを厳密に指定

### レスポンス形式

```json
{
  "total": {
    "name": "唐揚げ弁当とおにぎり",
    "cal": 850,
    "pro": 30,
    "fat": 25,
    "carb": 110
  },
  "items": [
    { "name": "唐揚げ弁当", "cal": 700, "pro": 25, "fat": 22, "carb": 85 },
    { "name": "おにぎり", "cal": 150, "pro": 5, "fat": 3, "carb": 25 }
  ]
}
```

- `total`: 全食事の合算値（クライアントが主に使用）
- `items`: 個別食品の内訳（将来の拡張用）
- 数値はすべて安全にパースし、`Number.isFinite` で検証

### エラーハンドリング

- OpenAI レスポンスが空 → `internal` エラー
- JSON パース失敗 → `internal` エラー（ログに生レスポンスを記録）
- その他の未知エラー → `"Failed to analyze food data."` で内部情報を隠蔽

---

## Firestore データモデル（関連部分）

| パス | 用途 | クライアント書き込み |
|------|------|:---:|
| `users/{uid}/food_dictionary/{safeId}` | 食品辞書（PFC キャッシュ + お気に入り） | 可 |
| `users/{uid}/food_logs/{docId}` | 日次食事ログ（`YYYY-MM-DD_Food`） | 可 |

---

## セキュリティ・プライバシー

- OpenAI に送信するのは**食事テキストと身体情報（任意）のみ**。UID やメールアドレスは送らない
- `text` は 500 文字に制限済み（トークン消費・コスト爆発の防止）
- エラーメッセージに OpenAI のレスポンス詳細やスタックトレースを含めない
