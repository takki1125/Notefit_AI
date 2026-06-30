/**
 * テスト用アカウントを Firebase に一括作成するスクリプト。
 *
 * 前提: プロジェクトルートまたは functions/ に serviceAccountKey.json があること
 * （Firebase Console → プロジェクト設定 → サービスアカウント → 新しい秘密鍵の生成）
 *
 * 実行:
 *   cd functions-ai && npm run seed:test-accounts
 *
 * オプション:
 *   --dry-run   書き込みせず内容を表示
 *   --force     既存の同名テストアカウントを削除して再作成
 */

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const require = createRequire(join(projectRoot, 'functions-ai', 'package.json'));
const admin = require('firebase-admin');

const DEFAULT_PASSWORD = 'NotefitTest2026!';
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

/** @typedef {'beginner' | 'intermediate' | 'advanced'} TrainingLevel */
/** @typedef {'cut' | 'maintain' | 'bulk'} Phase */

/**
 * @typedef {Object} TestAccountSpec
 * @property {string} email
 * @property {string} username
 * @property {TrainingLevel} trainingLevel
 * @property {Phase} phase
 * @property {number} targetWeight
 * @property {number} startWeight
 * @property {number} targetCal
 * @property {number} heightCm
 * @property {string} birthDate
 * @property {'male' | 'female'} sex
 * @property {boolean} goesToGym
 * @property {number} workoutsPerWeek
 * @property {string} activityLevel
 */

/** @type {TestAccountSpec[]} */
const TEST_ACCOUNTS = [
  {
    email: 'test.beginner1@notefit-dev.test',
    username: 'テスト初心者A',
    trainingLevel: 'beginner',
    phase: 'cut',
    targetWeight: 68,
    startWeight: 72.4,
    targetCal: 1900,
    heightCm: 172,
    birthDate: '1998-04-12',
    sex: 'male',
    goesToGym: true,
    workoutsPerWeek: 3,
    activityLevel: 'light',
  },
  {
    email: 'test.beginner2@notefit-dev.test',
    username: 'テスト初心者B',
    trainingLevel: 'beginner',
    phase: 'cut',
    targetWeight: 55,
    startWeight: 58.2,
    targetCal: 1650,
    heightCm: 158,
    birthDate: '2001-09-03',
    sex: 'female',
    goesToGym: false,
    workoutsPerWeek: 2,
    activityLevel: 'sedentary',
  },
  {
    email: 'test.intermediate1@notefit-dev.test',
    username: 'テスト中級者A',
    trainingLevel: 'intermediate',
    phase: 'maintain',
    targetWeight: 75,
    startWeight: 74.8,
    targetCal: 2400,
    heightCm: 178,
    birthDate: '1995-01-20',
    sex: 'male',
    goesToGym: true,
    workoutsPerWeek: 4,
    activityLevel: 'moderate',
  },
  {
    email: 'test.intermediate2@notefit-dev.test',
    username: 'テスト中級者B',
    trainingLevel: 'intermediate',
    phase: 'bulk',
    targetWeight: 55,
    startWeight: 52.6,
    targetCal: 2200,
    heightCm: 162,
    birthDate: '1997-11-08',
    sex: 'female',
    goesToGym: true,
    workoutsPerWeek: 4,
    activityLevel: 'active',
  },
  {
    email: 'test.advanced1@notefit-dev.test',
    username: 'テスト上級者A',
    trainingLevel: 'advanced',
    phase: 'bulk',
    targetWeight: 85,
    startWeight: 82.1,
    targetCal: 3200,
    heightCm: 180,
    birthDate: '1992-06-15',
    sex: 'male',
    goesToGym: true,
    workoutsPerWeek: 5,
    activityLevel: 'very_active',
  },
  {
    email: 'test.advanced2@notefit-dev.test',
    username: 'テスト上級者B',
    trainingLevel: 'advanced',
    phase: 'cut',
    targetWeight: 75,
    startWeight: 78.5,
    targetCal: 2600,
    heightCm: 176,
    birthDate: '1990-03-22',
    sex: 'male',
    goesToGym: true,
    workoutsPerWeek: 6,
    activityLevel: 'very_active',
  },
];

function resolveServiceAccountPath() {
  const dirs = [projectRoot, join(projectRoot, 'functions')];

  // Firebase Console のデフォルト名を優先（serviceAccountKey.json は古い鍵が残りやすい）
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const matches = readdirSync(dir)
      .filter((name) => name.includes('firebase-adminsdk') && name.endsWith('.json'))
      .sort();
    if (matches.length > 0) return join(dir, matches[matches.length - 1]);
  }

  const candidates = [
    join(projectRoot, 'serviceAccountKey.json'),
    join(projectRoot, 'functions', 'serviceAccountKey.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  return null;
}

function formatDateId(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** @param {TrainingLevel} level */
function workoutTemplates(level) {
  if (level === 'beginner') {
    return [
      {
        routineName: '全身スタート',
        durationSeconds: 45 * 60,
        exercises: [
          { name: 'マシンチェストプレス', sets: mkSets(3, 12, 25) },
          { name: 'ラットプルダウン', sets: mkSets(3, 12, 30) },
          { name: 'レッグプレス', sets: mkSets(3, 15, 60) },
        ],
      },
      {
        routineName: '上半身ベーシック',
        durationSeconds: 50 * 60,
        exercises: [
          { name: 'ダンベルベンチプレス', sets: mkSets(3, 10, 12) },
          { name: 'シーテッドロウ', sets: mkSets(3, 12, 25) },
          { name: 'マシンショルダープレス', sets: mkSets(3, 12, 15) },
        ],
      },
      {
        routineName: '下半身ベーシック',
        durationSeconds: 40 * 60,
        exercises: [
          { name: 'レッグプレス', sets: mkSets(4, 12, 70) },
          { name: 'レッグカール', sets: mkSets(3, 15, 20) },
          { name: '自重スクワット', sets: mkSets(3, 15, 0) },
        ],
      },
    ];
  }
  if (level === 'intermediate') {
    return [
      {
        routineName: '胸・三頭',
        durationSeconds: 65 * 60,
        exercises: [
          { name: 'ベンチプレス(バーベル)', sets: mkSets(4, 8, 70) },
          { name: 'インクラインベンチプレス(ダンベル)', sets: mkSets(3, 10, 24) },
          { name: 'ケーブルプレスダウン', sets: mkSets(3, 12, 25) },
        ],
      },
      {
        routineName: '背中・二頭',
        durationSeconds: 70 * 60,
        exercises: [
          { name: 'デッドリフト', sets: mkSets(4, 6, 100) },
          { name: 'ラットプルダウン', sets: mkSets(4, 10, 55) },
          { name: 'ワンハンドロウ', sets: mkSets(3, 10, 28) },
        ],
      },
      {
        routineName: '脚・肩',
        durationSeconds: 75 * 60,
        exercises: [
          { name: 'スクワット', sets: mkSets(4, 8, 90) },
          { name: 'レッグカール', sets: mkSets(3, 12, 35) },
          { name: 'ショルダープレス', sets: mkSets(4, 10, 30) },
        ],
      },
      {
        routineName: 'プルデイ',
        durationSeconds: 60 * 60,
        exercises: [
          { name: 'チンニング（懸垂）', sets: mkSets(4, 8, 0) },
          { name: 'ベントオーバーロウ', sets: mkSets(4, 8, 60) },
          { name: 'リアデルト', sets: mkSets(3, 15, 8) },
        ],
      },
    ];
  }
  return [
    {
      routineName: '胸',
      durationSeconds: 90 * 60,
      exercises: [
        { name: 'ベンチプレス(バーベル)', sets: mkSets(5, 5, 110) },
        { name: 'インクラインベンチプレス(バーベル)', sets: mkSets(4, 6, 85) },
        { name: 'ダンベルフライ', sets: mkSets(3, 12, 18) },
      ],
    },
    {
      routineName: '背中',
      durationSeconds: 95 * 60,
      exercises: [
        { name: 'デッドリフト', sets: mkSets(5, 3, 160) },
        { name: 'ベントオーバーロウ', sets: mkSets(4, 6, 90) },
        { name: 'ラットプルダウン', sets: mkSets(4, 10, 70) },
      ],
    },
    {
      routineName: '脚',
      durationSeconds: 85 * 60,
      exercises: [
        { name: 'スクワット', sets: mkSets(5, 5, 130) },
        { name: 'レッグプレス', sets: mkSets(4, 10, 200) },
        { name: 'レッグカール', sets: mkSets(4, 12, 45) },
      ],
    },
    {
      routineName: '肩・腕',
      durationSeconds: 70 * 60,
      exercises: [
        { name: 'ショルダープレス', sets: mkSets(4, 8, 45) },
        { name: 'サイドレイズ', sets: mkSets(4, 15, 12) },
        { name: 'アームカール', sets: mkSets(3, 12, 20) },
      ],
    },
    {
      routineName: '全身ハイボリューム',
      durationSeconds: 100 * 60,
      exercises: [
        { name: 'ベンチプレス(バーベル)', sets: mkSets(4, 8, 95) },
        { name: 'デッドリフト', sets: mkSets(4, 5, 140) },
        { name: 'スクワット', sets: mkSets(4, 6, 120) },
      ],
    },
  ];
}

function mkSets(count, reps, weight) {
  return Array.from({ length: count }, () => ({
    weight,
    reps,
    done: true,
  }));
}

/** @param {TestAccountSpec} spec */
function mealPlanForDay(spec, dayOffset) {
  const jitter = (dayOffset % 3) - 1;
  const target = spec.targetCal + jitter * 80;
  const breakfast = {
    id: `meal-b-${dayOffset}`,
    name: '朝食',
    cal: Math.round(target * 0.28),
    pro: Math.round(target * 0.28 * 0.22),
    fat: Math.round(target * 0.28 * 0.28),
    carb: Math.round(target * 0.28 * 0.5),
  };
  const lunch = {
    id: `meal-l-${dayOffset}`,
    name: spec.trainingLevel === 'advanced' ? '鶏胸・玄米・ブロッコリー' : 'チキンサラダ弁当',
    cal: Math.round(target * 0.38),
    pro: Math.round(target * 0.38 * 0.3),
    fat: Math.round(target * 0.38 * 0.22),
    carb: Math.round(target * 0.38 * 0.48),
  };
  const dinner = {
    id: `meal-d-${dayOffset}`,
    name: spec.trainingLevel === 'beginner' ? '焼き魚定食' : 'サーモン・サツマイモ',
    cal: Math.round(target * 0.3),
    pro: Math.round(target * 0.3 * 0.28),
    fat: Math.round(target * 0.3 * 0.25),
    carb: Math.round(target * 0.3 * 0.47),
  };
  const snack =
    target > 2200
      ? {
          id: `meal-s-${dayOffset}`,
          name: 'プロテイン＋バナナ',
          cal: Math.round(target * 0.04),
          pro: Math.round(target * 0.04 * 0.6),
          fat: Math.round(target * 0.04 * 0.1),
          carb: Math.round(target * 0.04 * 0.3),
        }
      : null;

  const meals = snack ? [breakfast, lunch, dinner, snack] : [breakfast, lunch, dinner];
  const totalCal = meals.reduce((s, m) => s + m.cal, 0);
  const totalPro = meals.reduce((s, m) => s + m.pro, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat, 0);
  const totalCarb = meals.reduce((s, m) => s + m.carb, 0);
  return { meals, totalCal, totalPro, totalFat, totalCarb };
}

/** @param {TestAccountSpec} spec */
function buildUserDoc(spec) {
  return {
    username: spec.username,
    phase: spec.phase,
    targetWeight: spec.targetWeight,
    targetCal: spec.targetCal,
    isDetailedTrackingEnabled: spec.trainingLevel !== 'beginner',
    heightCm: spec.heightCm,
    birthDate: spec.birthDate,
    trainingLevel: spec.trainingLevel,
    goesToGym: spec.goesToGym,
    calorieEstimateSex: spec.sex,
    activityLevel: spec.activityLevel,
    mealRemindersEnabled: false,
    aiCoachStyle: 'balanced',
    aiTonePreset: 'neutral',
    aiCustomInstructions: '',
    isTestAccount: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/** @param {TestAccountSpec} spec */
function buildWorkoutDays(spec, today) {
  const templates = workoutTemplates(spec.trainingLevel);
  const weeks = 6;
  const days = [];
  let templateIndex = 0;

  for (let w = 0; w < weeks; w += 1) {
    const weekStart = addDays(today, -(weeks - w) * 7);
    const spacing = Math.floor(7 / spec.workoutsPerWeek);
    for (let i = 0; i < spec.workoutsPerWeek; i += 1) {
      const date = addDays(weekStart, i * spacing + 1);
      if (date > today) continue;
      const template = templates[templateIndex % templates.length];
      templateIndex += 1;
      const dateId = formatDateId(date);
      const timeStr = `18-${String(30 + (i * 7) % 30).padStart(2, '0')}-00`;
      const safeRoutineName = template.routineName.replace(/[\/]/g, '_');
      const docId = `${dateId}_${timeStr}_${safeRoutineName}`;
      days.push({
        docId,
        date,
        ...template,
      });
    }
  }
  return days;
}

/** @param {TestAccountSpec} spec */
function buildWeightSeries(spec, today) {
  const days = 30;
  const delta = spec.targetWeight - spec.startWeight;
  const rows = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const progress = (days - 1 - i) / (days - 1);
    const trend = spec.startWeight + delta * progress;
    const noise = Math.sin(i * 0.7) * 0.3;
    const weight = round1(trend + noise);
    const bodyFat =
      spec.trainingLevel === 'advanced'
        ? round1(14 - progress * 2 + noise * 0.2)
        : spec.trainingLevel === 'intermediate'
          ? round1(18 - progress * 1.2)
          : round1(22 - progress * 0.8);
    rows.push({
      dateId: formatDateId(date),
      weight,
      bodyFatPercentage: bodyFat,
    });
  }
  return rows;
}

async function deleteUserData(db, uid) {
  const subcollections = ['workouts', 'food_logs', 'daily_metrics', 'daily_advice'];
  for (const name of subcollections) {
    const snap = await db.collection('users').doc(uid).collection(name).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await db.collection('users').doc(uid).delete();
}

async function ensureAuthUser(auth, spec) {
  try {
    const existing = await auth.getUserByEmail(spec.email);
    if (FORCE) {
      await auth.deleteUser(existing.uid);
    } else {
      await auth.updateUser(existing.uid, {
        emailVerified: true,
        password: DEFAULT_PASSWORD,
        displayName: spec.username,
      });
      return existing.uid;
    }
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }

  const created = await auth.createUser({
    email: spec.email,
    password: DEFAULT_PASSWORD,
    emailVerified: true,
    displayName: spec.username,
  });
  return created.uid;
}

/** @param {TestAccountSpec} spec */
async function seedAccount(db, auth, spec) {
  const uid = await ensureAuthUser(auth, spec);
  if (FORCE) {
    await deleteUserData(db, uid);
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const userRef = db.collection('users').doc(uid);
  const batch = db.batch();

  batch.set(userRef, buildUserDoc(spec), { merge: true });

  for (const row of buildWeightSeries(spec, today)) {
    batch.set(userRef.collection('daily_metrics').doc(row.dateId), {
      date: row.dateId,
      weight: row.weight,
      bodyFatPercentage: row.bodyFatPercentage,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const workout of buildWorkoutDays(spec, today)) {
    batch.set(userRef.collection('workouts').doc(workout.docId), {
      routineName: workout.routineName,
      exercises: workout.exercises,
      durationSeconds: workout.durationSeconds,
      date: admin.firestore.Timestamp.fromDate(workout.date),
      dateObj: workout.date.toISOString(),
    });
  }

  for (let i = 0; i < 21; i += 1) {
    const date = addDays(today, -i);
    const dateId = formatDateId(date);
    const food = mealPlanForDay(spec, i);
    batch.set(userRef.collection('food_logs').doc(`${dateId}_Food`), {
      date: admin.firestore.Timestamp.fromDate(date),
      dateObj: date.toISOString(),
      meals: food.meals,
      totalCal: food.totalCal,
      totalPro: food.totalPro,
      totalFat: food.totalFat,
      totalCarb: food.totalCarb,
    });
  }

  if (DRY_RUN) {
    console.log(`[dry-run] ${spec.email} → uid=${uid}`);
    return uid;
  }

  await batch.commit();
  return uid;
}

async function main() {
  const keyPath = resolveServiceAccountPath();
  if (!keyPath) {
    console.error('serviceAccountKey.json が見つかりません。');
    console.error('プロジェクトルートまたは functions/ に配置してください。');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(keyPath),
    });
  }

  const db = admin.firestore();
  const auth = admin.auth();

  console.log(`テストアカウント作成を開始します (${DRY_RUN ? 'dry-run' : '本番書き込み'})`);
  console.log(`共通パスワード: ${DEFAULT_PASSWORD}`);
  console.log('');

  const results = [];
  for (const spec of TEST_ACCOUNTS) {
    const uid = await seedAccount(db, auth, spec);
    const workouts = buildWorkoutDays(spec, new Date()).length;
    results.push({
      email: spec.email,
      username: spec.username,
      level: spec.trainingLevel,
      uid,
      workouts,
      foodDays: 21,
      weightDays: 30,
    });
    console.log(`✓ ${spec.username} (${spec.trainingLevel})`);
  }

  console.log('\n--- ログイン情報 ---');
  console.log('メールアドレス | レベル | 表示名');
  for (const r of results) {
    console.log(`${r.email} | ${r.level} | ${r.username}`);
  }
  console.log(`\nパスワード（全アカウント共通）: ${DEFAULT_PASSWORD}`);
  console.log('\n各アカウントには目標設定・体重30日分・食事21日分・トレーニング履歴が入っています。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
