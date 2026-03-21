import type { AiCoachSettings, AiCoachStylePreset, AiTonePreset } from './models';
import { DEFAULT_AI_COACH_SETTINGS } from './models';

export const AI_CUSTOM_INSTRUCTIONS_MAX_LEN = 500;

export const AI_COACH_STYLE_LABELS: Record<AiCoachStylePreset, { title: string; desc: string }> = {
  gentle: { title: 'やさしめ', desc: '励まし多め・ペース尊重' },
  balanced: { title: 'バランス', desc: '励ましと具体性のバランス（デフォルト）' },
  spartan: { title: 'スパルタ', desc: '短く・厳しめ・実行重視' },
  facts: { title: '事実ベース', desc: '根拠と選択肢中心・端的に' },
};

export const AI_TONE_LABELS: Record<AiTonePreset, { title: string; desc: string }> = {
  polite: { title: '丁寧', desc: '敬語を基本にしたトレーナー口調' },
  neutral: { title: '標準', desc: 'です・ます・標準的なトーン（デフォルト）' },
  friendly: { title: 'フレンドリー', desc: '親しみやすく、砕けすぎない' },
  casual: { title: 'カジュアル', desc: 'タメ口寄り・カジュアル' },
};

const COACH_STYLES: AiCoachStylePreset[] = ['gentle', 'balanced', 'spartan', 'facts'];
const TONES: AiTonePreset[] = ['polite', 'neutral', 'friendly', 'casual'];

export function normalizeAiCoachSettings(raw: unknown): AiCoachSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AI_COACH_SETTINGS };
  const o = raw as Record<string, unknown>;
  const coachStyle = COACH_STYLES.includes(o.coachStyle as AiCoachStylePreset)
    ? (o.coachStyle as AiCoachStylePreset)
    : DEFAULT_AI_COACH_SETTINGS.coachStyle;
  const tone = TONES.includes(o.tone as AiTonePreset)
    ? (o.tone as AiTonePreset)
    : DEFAULT_AI_COACH_SETTINGS.tone;
  let customInstructions = '';
  if (typeof o.customInstructions === 'string') {
    customInstructions = o.customInstructions.replace(/\0/g, '').trim().slice(0, AI_CUSTOM_INSTRUCTIONS_MAX_LEN);
  }
  return { coachStyle, tone, customInstructions };
}

/** キャッシュ指紋用（設定変更で再生成が必要になるとき用） */
export function fingerprintAiCoachSettings(s: AiCoachSettings): string {
  const t = s.customInstructions.trim();
  return `ai:${s.coachStyle}|${s.tone}|${t.length}:${t}`;
}
