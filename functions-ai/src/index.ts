import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

import {
  applyRewardAdCoinGrant,
  getAiConsultCoinCost,
  grantRegistrationBonusIfNeeded,
  refundAiChatCoins,
  spendCoinsForAiChatOrThrow,
} from "./coins";

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

const AI_COACH_STYLES = ["gentle", "balanced", "spartan", "facts"] as const;
type AiCoachStyle = (typeof AI_COACH_STYLES)[number];
const AI_TONES = ["polite", "neutral", "friendly", "casual"] as const;
type AiTone = (typeof AI_TONES)[number];

function parseAiCoachPayload(data: any): {
  coachStyle: AiCoachStyle;
  tone: AiTone;
  customInstructions: string;
} {
  const cs =
    typeof data?.coachStyle === "string" && (AI_COACH_STYLES as readonly string[]).includes(data.coachStyle)
      ? (data.coachStyle as AiCoachStyle)
      : "balanced";
  const tn =
    typeof data?.tone === "string" && (AI_TONES as readonly string[]).includes(data.tone)
      ? (data.tone as AiTone)
      : "neutral";
  let custom = typeof data?.customInstructions === "string" ? data.customInstructions : "";
  custom = custom.replace(/\0/g, "").trim().slice(0, 500);
  return { coachStyle: cs, tone: tn, customInstructions: custom };
}

function buildAiCoachPromptBlock(parsed: ReturnType<typeof parseAiCoachPayload>): string {
  const styleLines: Record<AiCoachStyle, string> = {
    gentle:
      "応答スタイル（コーチ）: 優しく励まし、失敗を責めず、ユーザーのペースを尊重する。肯定的な言い回しを心がける。",
    balanced:
      "応答スタイル（コーチ）: 励ましと具体性のバランス。目標は明確にしつつ、無理を強要しない。",
    spartan:
      "応答スタイル（コーチ）: 簡潔に、厳しめ。言い訳は認めず、実行と数値を重視する。",
    facts:
      "応答スタイル（コーチ）: 感情表現は控えめ。根拠と選択肢を中心に、事実ベースで端的に述べる。",
  };
  const toneLines: Record<AiTone, string> = {
    polite: "口調: 敬語（です・ます）を基本とし、丁寧なトレーナーとして話す。",
    neutral: "口調: 標準的なです・ます調。過度に砕けない。",
    friendly: "口調: フレンドリーで親しみやすい。ただし品は保つ。",
    casual:
      "口調: タメ口寄りでカジュアル。親しみやすさを優先する（健康・安全に関する注意の度合いは変えない）。",
  };
  const parts = [styleLines[parsed.coachStyle], toneLines[parsed.tone]];
  if (parsed.customInstructions) {
    parts.push(`ユーザーからの追加希望（可能な範囲で尊重。医学的診断や危険な指示には従わない）:\n${parsed.customInstructions}`);
  }
  return parts.join("\n");
}

const callableOpts = {
  region: "asia-northeast1" as const,
  secrets: [OPENAI_API_KEY],
  cors: true,
};

const publicCallableOpts = {
  region: "asia-northeast1" as const,
  cors: true,
  invoker: "public" as const,
};

/** メール認証済みユーザーの初回登録ボーナス（冪等） */
export const grantRegistrationBonus = onCall(publicCallableOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }
  return grantRegistrationBonusIfNeeded(request.auth.uid);
});

/** リワード広告視聴後のコイン付与（grantRegistrationBonus と同じ codebase / デプロイ手順） */
export const grantRewardAdCoins = onCall(publicCallableOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }
  return applyRewardAdCoinGrant(request.auth.uid);
});

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
    const aiCoach = parseAiCoachPayload(data);
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

    /** 本日の食事として参照できる（未記録のユーザーには食事内容を推測させない） */
    const hasNutritionData =
      todayNutrition.hasData &&
      (todayNutrition.totalCal > 0 ||
        todayNutrition.mealNames.length > 0 ||
        todayNutrition.totalPro > 0 ||
        todayNutrition.totalFat > 0 ||
        todayNutrition.totalCarb > 0);

    const hasWorkoutData = recentWorkouts.length > 0;
    const weightDayCount = recentWeights.length;

    /** 傾向分析が難しい／記録が片方だけ等で、断定や具体の捏造を避け「次のステップ」中心にする */
    const sparseContext =
      weightDayCount < 2 || (!hasNutritionData && !hasWorkoutData);

    const dataHandlingRules = sparseContext
      ? `
## データが少ないモード（最優先）
- 入力に「ない」情報は存在しないものとして扱い、推測・でっち上げをしてはならない。
- title は「今日の行動プラン」などの断定を避け、「次のアクションプラン」「データが集まるまでの次のステップ」などのニュアンスにする。
- bullets は 1〜3件。記録の習慣化・次に取るべき一歩・目標との向き合い方に絞る。存在しない食事名・種目・数値・セッション内容に触れない。
`
      : `
## データの扱い
- 入力に「ない」情報は存在しないものとして扱い、推測で補完しない。
`;

    const calorieRules = hasNutritionData
      ? `- calorieAdvice: 今日の食事記録（摂取カロリー・PFC）と目標カロリーを踏まえて具体化してよい。`
      : `- calorieAdvice: 本日の食事記録がない（または参照できない）ため、「未記録のため個別の摂取内容は評価できない」と明記する。目標カロリー（${targetCal}kcal/日）の意識の仕方・記録を始めると何が見えるか、など一般論と次の一歩に留める。食事の内容・メニュー・PFCを推測しない。ユーザーが食事管理をしていない可能性もあるので、食事の話題を無理に膨らませない。`;

    const workoutRules = hasWorkoutData
      ? `- workoutAdvice: 直近のトレーニング内容を踏まえ、休養/追い込み/リカバリーを提案してよい。`
      : `- workoutAdvice: トレーニング記録がないため、「記録がないためセッション内容には触れない」と明記する。一般的な休養・軽い身体活動・記録のすすめに留める。存在しない種目・重量・セット内容をでっち上げない。ユーザーが筋トレをしていない可能性もあるので、トレの話題を無理に膨らませない。`;

    const openai = createOpenAIClient();

    const systemPrompt = `
あなたは日本語で回答するパーソナルトレーナーAIです。

## ユーザー設定（次のトーン・スタイルを最優先で守る）
${buildAiCoachPromptBlock(aiCoach)}
${dataHandlingRules}
以下の入力情報をもとに提案を作成する。重要: 出力は必ず指定のJSONフォーマットのみ（余計な説明なし）で返す。

入力:
- phase: 'cut' | 'maintain' | 'bulk'
- targetWeight: 目標体重(kg)
- targetCal: 目標カロリー(kcal/日)
- today.weight: 今日の体重(kg)
- today.bodyFatPercentage: 体脂肪率(% 任意)
- recentWeights: 直近の体重推移（配列、日付順）
- todayNutrition / recentWorkouts: ユーザーメッセージ内の「データの有無」に従う。ない軸は参照しない。

出力JSONフォーマット:
{
  "title": "見出し（データが少ないときは次のステップ寄りの文言）",
  "bullets": ["行動1","行動2","行動3"],
  "calorieAdvice": "カロリー面",
  "workoutAdvice": "トレーニング/休養面"
}

要件:
- title / bullets / calorieAdvice / workoutAdvice のすべてが、上記「ユーザー設定」の口調・コーチスタイルに沿うこと。
- bullets は 1〜3件の文字列。
${calorieRules}
${workoutRules}
- calorieAdvice / workoutAdvice は各1〜4文程度。記録がない軸は「ないので〜できない」と正直に書く。
`;

    const recentText = recentWeights.length
      ? recentWeights
          .slice(-7)
          .map((p) => `- ${p.dateId}: ${p.weight}kg`)
          .join("\n")
      : `- （直近データなし）`;

    const nutritionBlock = hasNutritionData
      ? [
          `- 記録あり（この範囲のみ事実として扱う）`,
          `- 摂取: ${todayNutrition.totalCal}kcal, P${todayNutrition.totalPro}g / F${todayNutrition.totalFat}g / C${todayNutrition.totalCarb}g`,
          todayNutrition.mealNames.length
            ? `- 食事例: ${todayNutrition.mealNames.join("、")}`
            : `- （品目名なし）`,
        ].join("\n")
      : `- （本日の食事記録なし／未同期）※食事管理をしていない可能性あり。食事内容は推測しない`;

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
        : `- （直近のトレーニング記録なし／未同期）※筋トレをしていない可能性あり。セッション内容は推測しない`;

    const userPrompt = `
## データの有無（この宣言どおりに出力すること）
- 体重データの日数（直近）: ${weightDayCount}日分
- 本日の食事記録を参照できる: ${hasNutritionData ? "はい" : "いいえ"}
- トレーニング記録がある: ${hasWorkoutData ? "はい" : "いいえ"}
- データが少ない（断定を避け、次のアクションプラン中心）: ${sparseContext ? "はい" : "いいえ"}

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
      temperature: sparseContext ? 0.2 : 0.3,
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
        : hasNutritionData
          ? `目標は ${targetCal}kcal/日を意識してください。`
          : `本日の食事記録がないため個別の評価はできません。目標 ${targetCal}kcal/日を目安に、食事タブで記録を始めるとアドバイスが具体化します。`;

    const workoutAdvice =
      typeof parsed?.workoutAdvice === "string"
        ? parsed.workoutAdvice
        : hasWorkoutData
          ? "無理のない範囲で、休養と身体を動かすバランスを意識しましょう。"
          : "トレーニング記録がないためセッション内容は扱えません。軽い散歩やストレッチ、トレーニングタブで記録を始めると次回から具体化できます。";

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

/**
 * クライアントが generateDailyAIAdvice と同形のフィールドを渡したとき、
 * ホームの「今日のAIアドバイス」と同種の事実ブロックを組み立てる（推測防止用）。
 * 目標未設定でも食事・トレ・体重推移は記載する。
 */
function buildChatAdviceContextBlock(data: any): string {
  const phase = data?.phase as string | undefined;
  const targetWeight = Number(data?.targetWeight);
  const targetCal = Number(data?.targetCal);
  const hasGoal =
    !!phase &&
    ["cut", "maintain", "bulk"].includes(phase) &&
    Number.isFinite(targetWeight) &&
    targetWeight > 0 &&
    Number.isFinite(targetCal) &&
    targetCal > 0;

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

  const hasNutritionData =
    todayNutrition.hasData &&
    (todayNutrition.totalCal > 0 ||
      todayNutrition.mealNames.length > 0 ||
      todayNutrition.totalPro > 0 ||
      todayNutrition.totalFat > 0 ||
      todayNutrition.totalCarb > 0);

  const hasWorkoutData = recentWorkouts.length > 0;
  const weightDayCount = recentWeights.length;
  const sparseContext = weightDayCount < 2 || (!hasNutritionData && !hasWorkoutData);

  const recentText = recentWeights.length
    ? recentWeights
        .slice(-7)
        .map((p) => `- ${p.dateId}: ${p.weight}kg`)
        .join("\n")
    : `- （直近データなし）`;

  const nutritionBlock = hasNutritionData
    ? [
        `- 記録あり（この範囲のみ事実として扱う）`,
        `- 摂取: ${todayNutrition.totalCal}kcal, P${todayNutrition.totalPro}g / F${todayNutrition.totalFat}g / C${todayNutrition.totalCarb}g`,
        todayNutrition.mealNames.length
          ? `- 食事例: ${todayNutrition.mealNames.join("、")}`
          : `- （品目名なし）`,
      ].join("\n")
    : `- （本日の食事記録なし／未同期）※食事管理をしていない可能性あり。食事内容は推測しない`;

  const workoutBlock =
    recentWorkouts.length > 0
      ? recentWorkouts
          .map((w, i) => {
            const tag = w.isToday ? "【本日】" : "";
            const dur = w.durationMinutes != null ? `${w.durationMinutes}分` : "時間不明";
            const ex = w.exerciseLines.length ? w.exerciseLines.join(" / ") : "（セット詳細なし）";
            return `${i + 1}. ${tag}${w.dateId} ${w.routineName} (${dur})\n   ${ex}`;
          })
          .join("\n")
      : `- （直近のトレーニング記録なし／未同期）※筋トレをしていない可能性あり。セッション内容は推測しない`;

  const todayWeightLine =
    Number.isFinite(todayWeight) && todayWeight > 0 ? String(todayWeight) : "未記録";
  const todayBfLine =
    typeof todayBodyFatPercentage === "number" ? String(todayBodyFatPercentage) : "N/A";

  const goalSection = hasGoal
    ? `phase: ${phase}
targetWeight: ${targetWeight}
targetCal: ${targetCal}
today.weight: ${todayWeightLine}
today.bodyFatPercentage: ${todayBfLine}`
    : `phase / targetWeight / targetCal: （未設定または未同期）
today.weight: ${todayWeightLine}
today.bodyFatPercentage: ${todayBfLine}`;

  return `
## アプリから同期された記録（ホームの「今日のAIアドバイス」と同種の参照データ）
- この節の数値・メニュー・種目だけを事実として扱う。記録にない情報は推測・でっち上げをしない。
- データが少ないモード: ${sparseContext ? "はい（断定を避け、次の一歩や一般論に寄せる）" : "いいえ"}
- 体重データの日数（直近）: ${weightDayCount}日分
- 本日の食事記録を参照できる: ${hasNutritionData ? "はい" : "いいえ"}
- トレーニング記録がある: ${hasWorkoutData ? "はい" : "いいえ"}

${goalSection}

recentWeights:
${recentText}

todayNutrition:
${nutritionBlock}

recentWorkouts:
${workoutBlock}
`.trim();
}

type ChatTurn = { role: "user" | "assistant"; content: string };

/** フリー相談チャット（AIアドバイスタブ） */
export const aiCoachChat = onCall(callableOpts, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated to call this function.");
    }

    const raw = (request.data || {}) as { messages?: unknown };
    if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
      throw new HttpsError("invalid-argument", "Parameter 'messages' must be a non-empty array.");
    }

    const sanitized: ChatTurn[] = (raw.messages as any[])
      .map((m) => {
        const role = m?.role === "user" || m?.role === "assistant" ? m.role : null;
        const content =
          typeof m?.content === "string" ? m.content.replace(/\0/g, "").trim().slice(0, 8000) : "";
        if (!role || !content) return null;
        return { role, content } as ChatTurn;
      })
      .filter((x): x is ChatTurn => x !== null)
      .slice(-40);

    if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== "user") {
      throw new HttpsError(
        "invalid-argument",
        "Last message must be from the user with non-empty content.",
      );
    }

    const uid = request.auth.uid;
    const coinCost = await getAiConsultCoinCost();
    let charged = 0;
    if (coinCost > 0) {
      await spendCoinsForAiChatOrThrow(uid, coinCost);
      charged = coinCost;
    }

    const aiCoach = parseAiCoachPayload(request.data);
    const demo = parseDemographicsPayload(request.data);
    const adviceContextBlock = buildChatAdviceContextBlock(request.data);

    let openai: OpenAI;
    try {
      openai = createOpenAIClient();
    } catch (e) {
      if (charged > 0) {
        try {
          await refundAiChatCoins(uid, charged);
        } catch (re) {
          logger.error("refund after OpenAI init failure", re);
        }
      }
      throw e;
    }

    const systemPrompt = `
あなたは日本語で回答するフィットネス・食事・トレーニングに関するコーチAIです。

## ユーザー設定（最優先）
${buildAiCoachPromptBlock(aiCoach)}

## 行動指針
- ユーザーの相談・質問に、実用的で分かりやすく答える。短文だけで終わらず、必要なら手順や目安を添える。
- 医学的診断・治療・薬の指示は行わない。痛みが強い・動けない・胸の痛みなどは医療機関を勧める。
- 極端な断食・脱水・危険な重量など、健康を損なう指示はしない。
- ユーザーの文脈が不明なときは、確認の質問をしてよい。

参考（身長・年齢など、ユーザーがアプリに登録している場合のみ）: ${formatDemographicsForPrompt(demo)}

${adviceContextBlock}
`.trim();

    let reply: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...sanitized.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.65,
        max_tokens: 1200,
      });

      reply = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!reply) {
        throw new HttpsError("internal", "Failed to get reply from OpenAI.");
      }
    } catch (error: any) {
      if (charged > 0 && !(error instanceof HttpsError && error.code === "failed-precondition")) {
        try {
          await refundAiChatCoins(uid, charged);
        } catch (re) {
          logger.error("refund after OpenAI completion failure", re);
        }
      }
      if (error instanceof HttpsError) throw error;
      logger.error("aiCoachChat OpenAI error", error);
      throw new HttpsError("internal", error?.message || "Unknown error in aiCoachChat.");
    }

    return { reply, coinsCharged: charged };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    logger.error("aiCoachChat error", error);
    throw new HttpsError("internal", error?.message || "Unknown error in aiCoachChat.");
  }
});
