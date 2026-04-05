"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFoodPFC = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const params_1 = require("firebase-functions/params");
const openai_1 = __importDefault(require("openai"));
// Secret Manager 上のシークレットを定義
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
// OpenAI クライアント生成ヘルパ
function createOpenAIClient() {
    const apiKey = OPENAI_API_KEY.value();
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set in Secret Manager.");
    }
    return new openai_1.default({ apiKey });
}
function parseDemographicsPayload(data) {
    const d = data?.demographics;
    if (!d || typeof d !== "object")
        return {};
    const rawH = Number(d.heightCm);
    const heightCm = Number.isFinite(rawH) && rawH >= 50 && rawH <= 250 ? Math.round(rawH * 10) / 10 : undefined;
    const birthDate = typeof d.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) ? d.birthDate : undefined;
    const rawA = Number(d.ageYears);
    const ageYears = Number.isFinite(rawA) && rawA >= 3 && rawA <= 120 ? Math.floor(rawA) : undefined;
    return { heightCm, birthDate, ageYears };
}
function formatDemographicsForPrompt(parsed) {
    if (!parsed.heightCm && !parsed.birthDate && parsed.ageYears == null) {
        return "（身長・年齢の追加情報なし）";
    }
    const parts = [];
    if (parsed.heightCm)
        parts.push(`身長 約${parsed.heightCm}cm`);
    if (parsed.birthDate)
        parts.push(`生年月日 ${parsed.birthDate}`);
    if (parsed.ageYears != null)
        parts.push(`満年齢 約${parsed.ageYears}歳`);
    return parts.join(" / ");
}
// Cloud Functions (Callable) 本体
exports.analyzeFoodPFC = (0, https_1.onCall)({
    region: "asia-northeast1", // 必要に応じて変更
    secrets: [OPENAI_API_KEY],
    cors: true,
}, async (request) => {
    try {
        // 認証チェック
        if (!request.auth) {
            throw new https_1.HttpsError("unauthenticated", "User must be authenticated to call this function.");
        }
        const { text } = request.data;
        if (!text || typeof text !== "string" || !text.trim()) {
            throw new https_1.HttpsError("invalid-argument", "Parameter 'text' must be a non-empty string.");
        }
        const demo = parseDemographicsPayload(request.data);
        const openai = createOpenAIClient();
        // プロンプト作成
        const systemPrompt = `
あなたは日本語の食事記録からPFCバランスとカロリーを推定する栄養士AIです。

ユーザーから自然文で食事内容（例: 「昼に唐揚げ弁当とおにぎり1個、味噌汁」）が与えられます。
その内容から、おおよそのカロリーとPFC（タンパク質・脂質・炭水化物）を推定し、
必ず次のJSONフォーマットだけを返してください。

任意で身長・年齢（満年齢）が与えられる場合、一般的な食事量の目安として参考にし、現実的な数値になるよう意識する（個別の医学的栄養処方や診断は行わない）。

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
        const userPrompt = `利用可能な身体情報（参考・推定補助用）: ${formatDemographicsForPrompt(demo)}

食事内容: ${text}`;
        // OpenAI 呼び出し（gpt-4o-mini + JSON オブジェクト）
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
            throw new https_1.HttpsError("internal", "Failed to get content from OpenAI response.");
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (e) {
            logger.error("Failed to parse OpenAI JSON:", raw);
            throw new https_1.HttpsError("internal", "Failed to parse OpenAI response as JSON.");
        }
        // 最低限のバリデーションとデフォルト付与
        const total = parsed.total ?? {};
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const safeTotal = {
            name: typeof total.name === "string" ? total.name : text.slice(0, 50),
            cal: Number.isFinite(Number(total.cal)) ? Number(total.cal) : 0,
            pro: Number.isFinite(Number(total.pro)) ? Number(total.pro) : 0,
            fat: Number.isFinite(Number(total.fat)) ? Number(total.fat) : 0,
            carb: Number.isFinite(Number(total.carb)) ? Number(total.carb) : 0,
        };
        const safeItems = items.map((item) => ({
            name: typeof item.name === "string" ? item.name : "不明な食品",
            cal: Number.isFinite(Number(item.cal)) ? Number(item.cal) : 0,
            pro: Number.isFinite(Number(item.pro)) ? Number(item.pro) : 0,
            fat: Number.isFinite(Number(item.fat)) ? Number(item.fat) : 0,
            carb: Number.isFinite(Number(item.carb)) ? Number(item.carb) : 0,
        }));
        const result = {
            total: safeTotal,
            items: safeItems,
        };
        // フロントエンドへ返却
        return result;
    }
    catch (error) {
        logger.error("analyzeFoodPFC error", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", error?.message || "Unknown error in analyzeFoodPFC.");
    }
});
