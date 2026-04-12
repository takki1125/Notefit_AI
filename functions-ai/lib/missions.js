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
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimMissionReward = exports.getMissionsSnapshot = void 0;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const https_1 = require("firebase-functions/v2/https");
const coins_1 = require("./coins");
const subscriptionMirror_1 = require("./subscriptionMirror");
const TZ = "Asia/Tokyo";
const publicCallableOpts = {
    region: "asia-northeast1",
    cors: true,
    invoker: "public",
};
function tokyoYmd(ref = new Date()) {
    const z = (0, date_fns_tz_1.toZonedTime)(ref, TZ);
    return (0, date_fns_1.format)(z, "yyyy-MM-dd");
}
function weekRangeTokyo(ref = new Date()) {
    const z = (0, date_fns_tz_1.toZonedTime)(ref, TZ);
    const mon = (0, date_fns_1.startOfWeek)(z, { weekStartsOn: 1 });
    const sun = (0, date_fns_1.endOfWeek)(z, { weekStartsOn: 1 });
    return { start: (0, date_fns_1.format)(mon, "yyyy-MM-dd"), end: (0, date_fns_1.format)(sun, "yyyy-MM-dd") };
}
function workoutTokyoYmd(data) {
    const ts = data.date;
    if (ts && typeof ts.toDate === "function") {
        return tokyoYmd(ts.toDate());
    }
    if (typeof data.dateObj === "string") {
        const d = new Date(data.dateObj);
        if (!Number.isNaN(d.getTime())) {
            return tokyoYmd(d);
        }
    }
    return null;
}
async function countWorkoutsTokyoDay(uid, ymd) {
    const db = admin.firestore();
    const snap = await db
        .collection("users")
        .doc(uid)
        .collection("workouts")
        .orderBy("date", "desc")
        .limit(150)
        .get();
    let n = 0;
    for (const doc of snap.docs) {
        const y = workoutTokyoYmd(doc.data());
        if (y === ymd)
            n++;
    }
    return n;
}
async function countWorkoutsTokyoWeek(uid, start, end) {
    const db = admin.firestore();
    const snap = await db
        .collection("users")
        .doc(uid)
        .collection("workouts")
        .orderBy("date", "desc")
        .limit(200)
        .get();
    let n = 0;
    for (const doc of snap.docs) {
        const y = workoutTokyoYmd(doc.data());
        if (y != null && y >= start && y <= end)
            n++;
    }
    return n;
}
async function hasWeightTokyoDay(uid, ymd) {
    const db = admin.firestore();
    const direct = await db.collection("users").doc(uid).collection("daily_metrics").doc(ymd).get();
    if (direct.exists) {
        const w = direct.data()?.weight;
        if (typeof w === "number" && Number.isFinite(w))
            return true;
    }
    const snap = await db
        .collection("users")
        .doc(uid)
        .collection("daily_metrics")
        .orderBy("date", "desc")
        .limit(25)
        .get();
    for (const d of snap.docs) {
        const data = d.data();
        const dt = typeof data.date === "string" ? data.date : d.id;
        if (dt === ymd && typeof data.weight === "number" && Number.isFinite(data.weight)) {
            return true;
        }
    }
    return false;
}
async function countDistinctWeightDaysTokyoWeek(uid, start, end) {
    const db = admin.firestore();
    const snap = await db
        .collection("users")
        .doc(uid)
        .collection("daily_metrics")
        .orderBy("date", "desc")
        .limit(80)
        .get();
    const days = new Set();
    for (const d of snap.docs) {
        const data = d.data();
        const dt = typeof data.date === "string" ? data.date : d.id;
        if (typeof dt === "string" && dt >= start && dt <= end) {
            if (typeof data.weight === "number" && Number.isFinite(data.weight)) {
                days.add(dt);
            }
        }
    }
    return days.size;
}
/** その日の食事「件数」（food_logs は 1 日 1 ドキュメントに meals が乗る想定） */
async function countFoodItemsTokyoDay(uid, ymd) {
    const db = admin.firestore();
    let snap;
    try {
        snap = await db.collection("users").doc(uid).collection("food_logs").orderBy("date", "desc").limit(40).get();
    }
    catch (e) {
        logger.warn("countFoodItemsTokyoDay: orderBy date failed, fallback scan", e);
        snap = await db.collection("users").doc(uid).collection("food_logs").limit(40).get();
    }
    for (const doc of snap.docs) {
        const data = doc.data();
        const ts = data.date;
        if (ts && typeof ts.toDate === "function") {
            if (tokyoYmd(ts.toDate()) === ymd) {
                const meals = data.meals;
                return Array.isArray(meals) ? meals.length : 0;
            }
        }
    }
    return 0;
}
const MISSIONS = [
    {
        id: "dm_workout_1",
        title: "ワークアウトを1回記録",
        reward: 15,
        bucket: "daily",
        requiresPremium: false,
        verify: "workout_today_gte_1",
    },
    {
        id: "dm_weight_1",
        title: "体重を記録",
        reward: 10,
        bucket: "daily",
        requiresPremium: false,
        verify: "weight_today",
    },
    {
        id: "dm_food_1",
        title: "食事を1件記録",
        reward: 10,
        bucket: "daily",
        requiresPremium: false,
        verify: "food_today_gte_1",
    },
    {
        id: "dm_workout_2",
        title: "ワークアウトを2回記録",
        reward: 20,
        bucket: "daily",
        requiresPremium: true,
        verify: "workout_today_gte_2",
    },
    {
        id: "dm_food_3",
        title: "食事を3件記録",
        reward: 15,
        bucket: "daily",
        requiresPremium: true,
        verify: "food_today_gte_3",
    },
    {
        id: "wm_workouts_3",
        title: "今週ワークアウトを3回",
        reward: 25,
        bucket: "weekly",
        requiresPremium: false,
        verify: "workout_week_gte_3",
    },
    {
        id: "wm_weight_3d",
        title: "今週3日以上で体重記録",
        reward: 20,
        bucket: "weekly",
        requiresPremium: false,
        verify: "weight_week_distinct_gte_3",
    },
];
function stableMissionDocId(bucket, periodKey, missionId) {
    const raw = `mission_${bucket}_${periodKey}_${missionId}`;
    return raw.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 450);
}
async function evaluateMission(uid, m, today, week) {
    switch (m.verify) {
        case "workout_today_gte_1": {
            const c = await countWorkoutsTokyoDay(uid, today);
            return { met: c >= 1, progressLabel: `${Math.min(c, 1)}/1` };
        }
        case "workout_today_gte_2": {
            const c = await countWorkoutsTokyoDay(uid, today);
            return { met: c >= 2, progressLabel: `${Math.min(c, 2)}/2` };
        }
        case "weight_today": {
            const ok = await hasWeightTokyoDay(uid, today);
            return { met: ok, progressLabel: ok ? "1/1" : "0/1" };
        }
        case "food_today_gte_1": {
            const c = await countFoodItemsTokyoDay(uid, today);
            return { met: c >= 1, progressLabel: `${Math.min(c, 1)}/1` };
        }
        case "food_today_gte_3": {
            const c = await countFoodItemsTokyoDay(uid, today);
            return { met: c >= 3, progressLabel: `${Math.min(c, 3)}/3` };
        }
        case "workout_week_gte_3": {
            const c = await countWorkoutsTokyoWeek(uid, week.start, week.end);
            return { met: c >= 3, progressLabel: `${Math.min(c, 3)}/3` };
        }
        case "weight_week_distinct_gte_3": {
            const c = await countDistinctWeightDaysTokyoWeek(uid, week.start, week.end);
            return { met: c >= 3, progressLabel: `${Math.min(c, 3)}/3` };
        }
        default:
            return { met: false, progressLabel: "—" };
    }
}
exports.getMissionsSnapshot = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const premium = await (0, subscriptionMirror_1.isPremiumSubscriptionActive)(uid);
    const today = tokyoYmd();
    const week = weekRangeTokyo();
    const db = admin.firestore();
    const rows = [];
    for (const m of MISSIONS) {
        if (m.requiresPremium && !premium) {
            continue;
        }
        const periodKey = m.bucket === "daily" ? today : week.start;
        const docId = stableMissionDocId(m.bucket, periodKey, m.id);
        const claimedSnap = await db.collection("users").doc(uid).collection("mission_events").doc(docId).get();
        const claimed = claimedSnap.exists;
        const evald = await evaluateMission(uid, m, today, week);
        const canClaim = !claimed && evald.met && (!m.requiresPremium || premium);
        rows.push({
            id: m.id,
            title: m.title,
            rewardCoins: m.reward,
            bucket: m.bucket,
            requiresPremium: m.requiresPremium,
            claimed,
            canClaim,
            progressLabel: evald.progressLabel,
        });
    }
    return {
        premium,
        tokyoToday: today,
        weekStart: week.start,
        weekEnd: week.end,
        missions: rows,
    };
});
exports.claimMissionReward = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const missionId = typeof request.data?.missionId === "string" ? request.data.missionId.trim() : "";
    const bucket = request.data?.bucket === "weekly" ? "weekly" : "daily";
    if (!missionId) {
        throw new https_1.HttpsError("invalid-argument", "missionId が必要です。");
    }
    const def = MISSIONS.find((m) => m.id === missionId && m.bucket === bucket);
    if (!def) {
        throw new https_1.HttpsError("not-found", "ミッションが見つかりません。");
    }
    const premium = await (0, subscriptionMirror_1.isPremiumSubscriptionActive)(uid);
    if (def.requiresPremium && !premium) {
        throw new https_1.HttpsError("permission-denied", "このミッションはプレミアム専用です。");
    }
    const today = tokyoYmd();
    const week = weekRangeTokyo();
    const periodKey = bucket === "daily" ? today : week.start;
    const evald = await evaluateMission(uid, def, today, week);
    if (!evald.met) {
        throw new https_1.HttpsError("failed-precondition", "ミッション条件を達成していません。");
    }
    const docId = stableMissionDocId(bucket, periodKey, missionId);
    const res = await (0, coins_1.grantMissionRewardInTransaction)(uid, docId, def.reward, {
        missionId,
        bucket,
        periodKey,
    });
    if (res.duplicate) {
        return { granted: false, duplicate: true, amount: def.reward };
    }
    return { granted: true, duplicate: false, amount: res.amount };
});
