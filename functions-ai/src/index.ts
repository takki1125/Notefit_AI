import * as functions from "firebase-functions";
import OpenAI from "openai";

// Secret Manager 上のシークレットを定義
const OPENAI_API_KEY = functions.params.defineSecret("OPENAI_API_KEY");

// OpenAI クライアント生成ヘルパ
function createOpenAIClient() {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in Secret Manager.");
  }
  return new OpenAI({ apiKey });
}

// Cloud Functions (Callable) 本体
export const analyzeFoodPFC = functions
  .runWith({ secrets: [OPENAI_API_KEY] })
  .region("asia-northeast1") // 必要に応じて変更
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    try {
      // 認証チェック
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated to call this function."
        );
      }

      const { text } = (data || {}) as { text?: string };

      if (!text || typeof text !== "string" || !text.trim()) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Parameter 'text' must be a non-empty string."
        );
      }

      const openai = createOpenAIClient();

      const systemPrompt = `
あなたは日本語の食事記録からPFCバランスとカロリーを推定する栄養士AIです。

ユーザーから自然文で食事内容（例: 「昼に唐揚げ弁当とおにぎり1個、味噌汁」）が与えられます。
その内容から、おおよそのカロリーとPFC（タンパク質・脂質・炭水化物）を推定し、
必ず次のJSONフォーマットだけを返してください。

出力JSONフォーマット:
{
  "total": {
    "name": "入力された食事の総称（例：唐揚げ弁当とおにぎり）",
    "cal": 0,
    "pro": 0,
    "fat": 0,
    "carb": 0
  },
  "items": [
    {
      "name": "個別の食事名",
      "cal": 0,
      "pro": 0,
      "fat": 0,
      "carb": 0
    }
  ]
}

要件:
- 単位はすべて「g」と「kcal」を想定します。
- 数値はおおよそでよいですが、現実的な範囲にしてください。
- 合計値 "total" は "items" に含まれる各要素の合算になるようにしてください。
- items は将来の拡張用ですが、現時点でも可能な範囲で 1〜数件に分割してください。
- 説明文やコメントは一切出力せず、指定のJSONオブジェクトのみを返してください。
`;

      const userPrompt = `食事内容: ${text}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new functions.https.HttpsError(
          "internal",
          "Failed to get content from OpenAI response."
        );
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        functions.logger.error("Failed to parse OpenAI JSON:", raw);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to parse OpenAI response as JSON."
        );
      }

      const total = parsed.total ?? {};
      const items = Array.isArray(parsed.items) ? parsed.items : [];

      const safeTotal = {
        name: typeof total.name === "string" ? total.name : text.slice(0, 50),
        cal: Number.isFinite(Number(total.cal)) ? Number(total.cal) : 0,
        pro: Number.isFinite(Number(total.pro)) ? Number(total.pro) : 0,
        fat: Number.isFinite(Number(total.fat)) ? Number(total.fat) : 0,
        carb: Number.isFinite(Number(total.carb)) ? Number(total.carb) : 0,
      };

      const safeItems = items.map((item: any) => ({
        name: typeof item.name === "string" ? item.name : "不明な食品",
        cal: Number.isFinite(Number(item.cal)) ? Number(item.cal) : 0,
        pro: Number.isFinite(Number(item.pro)) ? Number(item.pro) : 0,
        fat: Number.isFinite(Number(item.fat)) ? Number(item.fat) : 0,
        carb: Number.isFinite(Number(item.carb)) ? Number(item.carb) : 0,
      }));

      return {
        total: safeTotal,
        items: safeItems,
      };
    } catch (error: any) {
      functions.logger.error("analyzeFoodPFC error", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        error?.message || "Unknown error in analyzeFoodPFC."
      );
    }
  });


