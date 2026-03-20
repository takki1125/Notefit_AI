import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import type { DailyMetric, Phase, UserProfile } from '../../utils/models';
import { getUserProfile } from '../../utils/firestoreProfile';
import { getDailyMetricsLastNDays } from '../../utils/firestoreDailyMetrics';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function calcProgressPercent(phase: Phase, start: number, current: number, target: number) {
  if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(target)) return null;

  if (start === target) {
    if (Math.abs(current - target) < 0.0001) return 100;
    return 0;
  }

  if (phase === 'cut') {
    const denom = start - target;
    if (denom <= 0) return current <= target ? 100 : 0;
    return clamp(((start - current) / denom) * 100, 0, 100);
  }

  if (phase === 'bulk') {
    const denom = target - start;
    if (denom <= 0) return current >= target ? 100 : 0;
    return clamp(((current - start) / denom) * 100, 0, 100);
  }

  // maintain
  const threshold = target * 0.02; // 目標体重の±2%
  if (threshold <= 0) return Math.abs(current - target) < 0.0001 ? 100 : 0;
  const diff = Math.abs(current - target);
  return clamp((1 - diff / threshold) * 100, 0, 100);
}

export default function GoalProgressCard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        const user = auth.currentUser;
        if (!user) {
          setProfile(null);
          setMetrics([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const p = await getUserProfile(user.uid);
          setProfile(p);
          const ms = await getDailyMetricsLastNDays(user.uid, 30);
          setMetrics(ms);
        } catch {
          setProfile(null);
          setMetrics([]);
        } finally {
          setLoading(false);
        }
      };
      run();
    }, []),
  );

  const progress = useMemo(() => {
    if (!profile) return null;
    if (metrics.length < 1) return null;
    const start = metrics[0].weight;
    const current = metrics[metrics.length - 1].weight;
    return calcProgressPercent(profile.phase, start, current, profile.targetWeight);
  }, [metrics, profile]);

  const startWeight = metrics.length > 0 ? metrics[0].weight : null;
  const currentWeight = metrics.length > 0 ? metrics[metrics.length - 1].weight : null;

  return (
    <View style={styles.card}>
      <View style={local.headerRow}>
        <Text style={local.title}>目標達成度</Text>
        {loading ? null : progress === null ? <Text style={local.muted}>—</Text> : <Text style={local.percent}>{Math.round(progress)}%</Text>}
      </View>

      {loading ? (
        <ActivityIndicator color="#2ecc71" />
      ) : !profile || startWeight === null || currentWeight === null ? (
        <Text style={local.muted}>体重の記録があると表示されます</Text>
      ) : (
        <>
          <Text style={local.desc}>
            開始: {startWeight}kg / 今日: {currentWeight}kg / 目標: {profile.targetWeight}kg
          </Text>

          <View style={local.barTrack}>
            <View style={[local.barFill, { width: `${progress ?? 0}%` }]} />
          </View>
        </>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  percent: { color: '#2ecc71', fontSize: 16, fontWeight: 'bold' },
  muted: { color: '#666' },
  desc: { color: '#888', fontSize: 12, marginTop: 8, lineHeight: 18 },
  barTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#2ecc71',
  },
});

