import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

// Secret Manager（Gen2 は v2/https + defineSecret）
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function createOpenAIClient() {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in Secret Manager.");
  }
  return new OpenAI({ apiKey });
}

/** クライアントから渡す任意プロフィール（身長・生年月日・満年齢） */
function parseDemographicsPayload(data: any): {
  heightCm?: number;
  birthDate?: string;
  ageYears?: number;
} {
  const d = data?.demographics;
  if (!d || typeof d !== "object") return {};
  const rawH = Number(d.heightCm);
  const heightCm = Number.isFinite(rawH) && rawH >= 50 && rawH <= 250 ? Math.round(rawH * 10) / 10 : undefined;
  const birthDate =
    typeof d.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) ? d.birthDate : undefined;
  const rawA = Number(d.ageYears);
  const ageYears =
    Number.isFinite(rawA) && rawA >= 3 && rawA <= 120 ? Math.floor(rawA) : undefined;
  return { heightCm, birthDate, ageYears };
}

function formatDemographicsForPrompt(parsed: ReturnType<typeof parseDemographicsPayload>): string {
  if (!parsed.heightCm && !parsed.birthDate && parsed.ageYears == null) {
    return "（身長・年齢の追加情報なし）";
  }
  const parts: string[] = [];
  if (parsed.heightCm) parts.push(`身長 約${parsed.heightCm}cm`);
  if (parsed.birthDate) parts.push(`生年月日 ${parsed.birthDate}`);
  if (parsed.ageYears != null) parts.push(`満年齢 約${parsed.ageYears}歳`);
  return parts.join(" / ");
}

const callableOpts = {
  region: "asia-northeast1" as const,
  secrets: [OPENAI_API_KEY],
  cors: true,
};

/** 食事の PFC 推定（クライアント: food タブ） */
export const analyzeFoodPFC = onCall(callableOpts, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated to call this function.");
    }

    const { text } = (request.data || {}) as { text?: string };

    if (!text || typeof text !== "string" || !text.trim()) {
      throw new HttpsError("invalid-argument", "Parameter 'text' must be a non-empty string.");
    }

    const demo = parseDemographicsPayload(request.data);

    const openai = createOpenAIClient();

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
      throw new HttpsError("internal", "Failed to get content from OpenAI response.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      logger.error("Failed to parse OpenAI JSON:", raw);
      throw new HttpsError("internal", "Failed to parse OpenAI response as JSON.");
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

    return { total: safeTotal, items: safeItems };
  } catch (error: any) {
    logger.error("analyzeFoodPFC error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error?.message || "Unknown error in analyzeFoodPFC.");
  }
});

/** 今日のアドバイス生成（ホーム） */
export const generateDailyAIAdvice = onCall(callableOpts, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated to call this function.");
    }

    const data = request.data as any;
    const demo = parseDemographicsPayload(data);
    const phase = data?.phase as string | undefined;
    const targetWeight = Number(data?.targetWeight);
    const targetCal = Number(data?.targetCal);

    const today = data?.today as { weight?: number; bodyFatPercentage?: number } | undefined;
    const todayWeight = Number(today?.weight);
    const todayBodyFatPercentage =
      typeof today?.bodyFatPercentage === "number" ? today.bodyFatPercentage : undefined;

    const recentWeightsRaw = Array.isArray(data?.recentWeights) ? (data.recentWeights as any[]) : [];
    const recentWeights = recentWeightsRaw
      .map((p) => ({
        dateId: typeof p?.dateId === "string" ? p.dateId : "",
        weight: Number(p?.weight),
        bodyFatPercentage: typeof p?.bodyFatPercentage === "number" ? p.bodyFatPercentage : undefined,
      }))
      .filter((p) => p.dateId.length > 0 && Number.isFinite(p.weight));

    const tn = data?.todayNutrition as any;
    const todayNutrition = {
      hasData: !!tn?.hasData,
      totalCal: Number.isFinite(Number(tn?.totalCal)) ? Number(tn.totalCal) : 0,
      totalPro: Number.isFinite(Number(tn?.totalPro)) ? Number(tn.totalPro) : 0,
      totalFat: Number.isFinite(Number(tn?.totalFat)) ? Number(tn.totalFat) : 0,
      totalCarb: Number.isFinite(Number(tn?.totalCarb)) ? Number(tn.totalCarb) : 0,
      mealNames: Array.isArray(tn?.mealNames)
        ? tn.mealNames.filter((x: any) => typeof x === "string").slice(0, 15)
        : [],
    };

    const rwRaw = Array.isArray(data?.recentWorkouts) ? (data.recentWorkouts as any[]) : [];
    const recentWorkouts = rwRaw
      .map((s) => ({
        dateId: typeof s?.dateId === "string" ? s.dateId : "",
        routineName: typeof s?.routineName === "string" ? s.routineName : "ワークアウト",
        durationMinutes:
          s?.durationMinutes === null
            ? null
            : Number.isFinite(Number(s?.durationMinutes))
              ? Number(s.durationMinutes)
              : null,
        isToday: !!s?.isToday,
        exerciseLines: Array.isArray(s?.exerciseLines)
          ? s.exerciseLines.filter((x: any) => typeof x === "string").slice(0, 10)
          : [],
      }))
      .filter((s) => s.dateId.length > 0)
      .slice(0, 6);

    if (!phase || !["cut", "maintain", "bulk"].includes(phase)) {
      throw new HttpsError("invalid-argument", "Parameter 'phase' must be 'cut'|'maintain'|'bulk'.");
    }
    if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
      throw new HttpsError("invalid-argument", "Parameter 'targetWeight' must be a positive number.");
    }
    if (!Number.isFinite(targetCal) || targetCal <= 0) {
      throw new HttpsError("invalid-argument", "Parameter 'targetCal' must be a positive number.");
    }
    if (!Number.isFinite(todayWeight) || todayWeight <= 0) {
      throw new HttpsError("invalid-argument", "today.weight must be a positive number.");
    }

    const openai = createOpenAIClient();

    const systemPrompt = `
あなたは日本語で回答するパーソナルトレーナーAIです。

以下の入力情報をもとに、今日の目標達成に向けた「今日の行動」提案を作成してください。
重要: 出力は必ず指定のJSONフォーマットのみ（余計な説明なし）で返してください。

入力:
- phase: 'cut' | 'maintain' | 'bulk'
- targetWeight: 目標体重(kg)
- targetCal: 目標カロリー(kcal/日)
- today.weight: 今日の体重(kg)
- today.bodyFatPercentage: 体脂肪率(% 任意)
- recentWeights: 直近の体重推移（配列、日付順）
- todayNutrition: 今日の食事記録の要約（合計カロリー・PFC、食事名リスト。未記録の場合は hasData=false）
- recentWorkouts: 直近のトレーニング記録の要約（日付、メニュー名、所要時間、種目×セット概要。本日実施分は isToday=true）
- userDemographics: 身長(cm)・生年月日・満年齢があれば、無理のない提案に反映（医療助言・診断はしない）

出力JSONフォーマット:
{
  "title": "今日の行動プラン",
  "bullets": ["行動1","行動2","行動3"],
  "calorieAdvice": "カロリー面のアドバイス（目標カロリーに触れる）",
  "workoutAdvice": "トレーニング/休養のアドバイス"
}

要件:
- bullets は 1〜3件の文字列
- bullets はユーザーが今日すぐ実行できる具体的な内容
- calorieAdvice では、可能なら今日の食事記録（摂取カロリー・PFC）と目標カロリーの差を踏まえて具体化する。食事未記録ならその旨を簡潔に触れ、記録を促す。
- workoutAdvice では、可能なら本日・直近のトレーニング内容・ボリュームを踏まえ、休養/追い込み/リカバリーを提案する。未記録なら一般的な線でよい。
- calorieAdvice / workoutAdvice は各1〜3文程度
`;

    const recentText = recentWeights.length
      ? recentWeights
          .slice(-7)
          .map((p) => `- ${p.dateId}: ${p.weight}kg`)
          .join("\n")
      : `- （直近データなし）`;

    const nutritionBlock =
      todayNutrition.hasData || todayNutrition.totalCal > 0
        ? [
            `- 記録あり`,
            `- 摂取: ${todayNutrition.totalCal}kcal, P${todayNutrition.totalPro}g / F${todayNutrition.totalFat}g / C${todayNutrition.totalCarb}g`,
            todayNutrition.mealNames.length
              ? `- 食事例: ${todayNutrition.mealNames.join("、")}`
              : `- （品目名なし）`,
          ].join("\n")
        : `- （本日まだ食事がクラウドに保存されていない、または未記録）※アプリの食事タブで保存すると参照できる`;

    const workoutBlock =
      recentWorkouts.length > 0
        ? recentWorkouts
            .map((w, i) => {
              const tag = w.isToday ? "【本日】" : "";
              const dur =
                w.durationMinutes != null ? `${w.durationMinutes}分` : "時間不明";
              const ex = w.exerciseLines.length ? w.exerciseLines.join(" / ") : "（セット詳細なし）";
              return `${i + 1}. ${tag}${w.dateId} ${w.routineName} (${dur})\n   ${ex}`;
            })
            .join("\n")
        : `- （直近のトレーニング記録なし／未同期）`;

      const userPrompt = `
phase: ${phase}
targetWeight: ${targetWeight}
targetCal: ${targetCal}
today.weight: ${todayWeight}
today.bodyFatPercentage: ${
      typeof todayBodyFatPercentage === "number" ? todayBodyFatPercentage : "N/A"
    }
userDemographics: ${formatDemographicsForPrompt(demo)}

recentWeights:
${recentText}

todayNutrition:
${nutritionBlock}

recentWorkouts:
${workoutBlock}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new HttpsError("internal", "Failed to get content from OpenAI response.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpsError("internal", "Failed to parse OpenAI response as JSON.");
    }

    const title = typeof parsed?.title === "string" ? parsed.title : "今日の行動プラン";
    const bulletsRaw = Array.isArray(parsed?.bullets) ? parsed.bullets : [];
    const bullets = bulletsRaw.filter((b: any) => typeof b === "string").slice(0, 3);

    const calorieAdvice =
      typeof parsed?.calorieAdvice === "string"
        ? parsed.calorieAdvice
        : `目標は ${targetCal}kcal/日を意識してください。`;

    const workoutAdvice =
      typeof parsed?.workoutAdvice === "string"
        ? parsed.workoutAdvice
        : "無理のない範囲で、ウォームアップ＋軽めのトレーニングか散歩・休養を入れましょう。";

    if (bullets.length === 0) {
      throw new HttpsError("internal", "AI output bullets is empty.");
    }

    return {
      title,
      bullets,
      calorieAdvice,
      workoutAdvice,
    };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error?.message || "Unknown error in generateDailyAIAdvice.");
  }
});
