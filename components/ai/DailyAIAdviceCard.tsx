import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ChevronRight, MessageCircle, Sparkles } from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import type { DailyAIAdvice } from '../../utils/models';
import {
  buildAdviceContextFingerprint,
  fetchAdviceNutrition,
  fetchAdviceWorkouts,
} from '../../utils/adviceContext';
import { formatDateId, getDailyMetric, getDailyMetricsLastNDays } from '../../utils/firestoreDailyMetrics';
import { calcAgeYearsFromBirthDate } from '../../utils/demographics';
import { fingerprintAiCoachSettings } from '../../utils/aiCoachSettings';
import { getAiCoachSettings, getUserDemographics, getUserProfile } from '../../utils/firestoreProfile';
import { getDailyAIAdvice, setDailyAIAdvice } from '../../utils/firestoreDailyAdvice';

type RecentPoint = { dateId: string; weight: number; bodyFatPercentage?: number };

export default function DailyAIAdviceCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [advice, setAdvice] = useState<DailyAIAdvice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** force=true: キャッシュ無視で再生成（エラー時の.retry など） */
  const refreshAdvice = useCallback(async (force: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    const todayId = formatDateId(new Date());

    const [profile, demographics, todayMetric, nutrition, workoutBundle, aiCoach] = await Promise.all([
      getUserProfile(user.uid),
      getUserDemographics(user.uid),
      getDailyMetric(user.uid, todayId),
      fetchAdviceNutrition(user.uid, todayId),
      fetchAdviceWorkouts(user.uid, todayId),
      getAiCoachSettings(user.uid),
    ]);

    if (!profile || !todayMetric) {
      setAdvice(null);
      setErrorMessage(null);
      return;
    }

    const contextFingerprint = buildAdviceContextFingerprint(
      todayId,
      nutrition,
      workoutBundle.workoutDocIds,
      demographics,
      fingerprintAiCoachSettings(aiCoach),
    );

    if (!force) {
      const existing = await getDailyAIAdvice(user.uid, todayId);
      if (existing && existing.contextFingerprint === contextFingerprint) {
        setAdvice(existing);
        return;
      }
    }

    setGenerating(true);
    setErrorMessage(null);

    try {
      const recent = await getDailyMetricsLastNDays(user.uid, 7);
      const recentPoints: RecentPoint[] = recent.map((m) => ({
        dateId: m.date,
        weight: m.weight,
        ...(typeof m.bodyFatPercentage === 'number' ? { bodyFatPercentage: m.bodyFatPercentage } : {}),
      }));

      const app = getApp();
      const functions = getFunctions(app, 'asia-northeast1');
      const callable = httpsCallable(functions, 'generateDailyAIAdvice');

      const ageYears = demographics.birthDate
        ? calcAgeYearsFromBirthDate(demographics.birthDate)
        : undefined;

      const res = await callable({
        phase: profile.phase,
        targetWeight: profile.targetWeight,
        targetCal: profile.targetCal,
        coachStyle: aiCoach.coachStyle,
        tone: aiCoach.tone,
        customInstructions: aiCoach.customInstructions,
        demographics: {
          ...(typeof demographics.heightCm === 'number' ? { heightCm: demographics.heightCm } : {}),
          ...(demographics.birthDate ? { birthDate: demographics.birthDate } : {}),
          ...(typeof ageYears === 'number' ? { ageYears } : {}),
        },
        today: {
          weight: todayMetric.weight,
          ...(typeof todayMetric.bodyFatPercentage === 'number'
            ? { bodyFatPercentage: todayMetric.bodyFatPercentage }
            : {}),
        },
        recentWeights: recentPoints,
        todayNutrition: {
          hasData: nutrition.hasData,
          totalCal: nutrition.totalCal,
          totalPro: nutrition.totalPro,
          totalFat: nutrition.totalFat,
          totalCarb: nutrition.totalCarb,
          mealNames: nutrition.mealNames,
        },
        recentWorkouts: workoutBundle.sessions.map((s) => ({
          dateId: s.dateId,
          routineName: s.routineName,
          durationMinutes: s.durationMinutes,
          isToday: s.isToday,
          exerciseLines: s.exerciseLines,
        })),
      });

      const data = res.data as any;
      if (
        !data ||
        typeof data.title !== 'string' ||
        !Array.isArray(data.bullets) ||
        !data.bullets.every((b: any) => typeof b === 'string') ||
        typeof data.calorieAdvice !== 'string' ||
        typeof data.workoutAdvice !== 'string'
      ) {
        throw new Error('AI応答の形式が不正です。');
      }

      const saved: Omit<DailyAIAdvice, 'date' | 'updatedAt'> = {
        title: data.title,
        bullets: data.bullets,
        calorieAdvice: data.calorieAdvice,
        workoutAdvice: data.workoutAdvice,
        contextFingerprint,
      };

      await setDailyAIAdvice(user.uid, todayId, saved);
      setAdvice({
        date: todayId,
        ...saved,
        updatedAt: new Date(),
      });
    } catch (e: any) {
      const message = e?.message || 'AIアドバイスの生成に失敗しました。';
      setErrorMessage(message);
    } finally {
      setGenerating(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        setLoading(true);
        setErrorMessage(null);
        setAdvice(null);

        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        try {
          await refreshAdvice(false);
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      };
      run();
    }, [refreshAdvice]),
  );

  return (
    <View style={styles.card}>
      <View style={local.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles color="#4facfe" size={18} />
          <Text style={local.title}>AIアドバイス</Text>
        </View>

        {generating ? <ActivityIndicator color="#2ecc71" /> : null}
      </View>

      <TouchableOpacity
        style={local.chatCta}
        onPress={() => router.push('/ai-advice')}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="チャットでAIに相談する画面へ"
      >
        <MessageCircle color="#4facfe" size={18} />
        <Text style={local.chatCtaText}>チャットで自由に相談</Text>
        <ChevronRight color="#888" size={20} />
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#2ecc71" />
      ) : advice ? (
        <>
          <Text style={local.adviceTitle}>{advice.title}</Text>
          {advice.bullets.map((b, idx) => (
            <View key={`${idx}-${b}`} style={local.bulletRow}>
              <Text style={local.bullet}>・</Text>
              <Text style={local.bulletText}>{b}</Text>
            </View>
          ))}
          <View style={local.divider} />
          <Text style={local.metaLabel}>カロリー目安</Text>
          <Text style={local.metaText}>{advice.calorieAdvice}</Text>
          <Text style={local.metaLabel}>トレーニング/休養</Text>
          <Text style={local.metaText}>{advice.workoutAdvice}</Text>
        </>
      ) : errorMessage ? (
        <>
          <Text style={local.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={local.retryBtn}
            onPress={() => refreshAdvice(true)}
            disabled={generating}
          >
            <Text style={local.retryBtnText}>{generating ? '生成中…' : 'もう一度生成'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={local.muted}>
          体重を入力すると、今日のアドバイスが自動で表示されます。
        </Text>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  chatCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  chatCtaText: { color: '#4facfe', fontSize: 13, fontWeight: '600', flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  adviceTitle: { color: '#2ecc71', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  bullet: { color: '#fff' },
  bulletText: { color: '#ddd', fontSize: 13, lineHeight: 18, flex: 1 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  metaLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  metaText: { color: '#ddd', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  muted: { color: '#666', fontSize: 12, lineHeight: 18 },
  errorText: { color: '#ff4444', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  retryBtn: { backgroundColor: '#2ecc71', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  retryBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
});
