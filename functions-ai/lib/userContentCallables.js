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
exports.deleteMealRoutine = exports.createMealRoutine = exports.deleteCustomExercise = exports.updateCustomExercise = exports.createCustomExercise = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const subscriptionMirror_1 = require("./subscriptionMirror");
const db = admin.firestore();
const publicCallableOpts = {
    region: "asia-northeast1",
    cors: true,
    invoker: "public",
};
const FREE_CUSTOM_EXERCISES = 5;
const FREE_MEAL_ROUTINES = 3;
function normalizeMealsPayload(raw) {
    if (!Array.isArray(raw)) {
        throw new https_1.HttpsError("invalid-argument", "meals は配列である必要があります。");
    }
    if (raw.length === 0 || raw.length > 40) {
        throw new https_1.HttpsError("invalid-argument", "ルーティーンの品目数が不正です。");
    }
    const out = [];
    for (const m of raw) {
        if (!m || typeof m !== "object") {
            throw new https_1.HttpsError("invalid-argument", "食事データの形式が不正です。");
        }
        const o = m;
        const name = typeof o.name === "string" ? o.name.replace(/\0/g, "").trim().slice(0, 120) : "";
        if (!name) {
            throw new https_1.HttpsError("invalid-argument", "料理名が空です。");
        }
        const cal = Math.max(0, Math.min(20000, Math.floor(Number(o.cal) || 0)));
        const pro = Math.max(0, Math.min(2000, Math.floor(Number(o.pro) || 0)));
        const fat = Math.max(0, Math.min(2000, Math.floor(Number(o.fat) || 0)));
        const carb = Math.max(0, Math.min(2000, Math.floor(Number(o.carb) || 0)));
        out.push({ name, cal, pro, fat, carb });
    }
    return out;
}
/** マイ種目追加（無料は最大 5、プレミアムは実質無制限） */
exports.createCustomExercise = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const name = typeof request.data?.name === "string" ? request.data.name.replace(/\0/g, "").trim().slice(0, 80) : "";
    const categoryLabel = typeof request.data?.categoryLabel === "string"
        ? request.data.categoryLabel.replace(/\0/g, "").trim().slice(0, 80)
        : "";
    if (!name) {
        throw new https_1.HttpsError("invalid-argument", "種目名を入力してください。");
    }
    if (!categoryLabel) {
        throw new https_1.HttpsError("invalid-argument", "カテゴリが不正です。");
    }
    const col = db.collection("users").doc(uid).collection("custom_exercises");
    const premium = await (0, subscriptionMirror_1.isPremiumSubscriptionActive)(uid);
    if (!premium) {
        const agg = await col.count().get();
        const n = agg.data().count;
        if (n >= FREE_CUSTOM_EXERCISES) {
            throw new https_1.HttpsError("resource-exhausted", `無料プランではマイ種目は最大${FREE_CUSTOM_EXERCISES}件までです。プレミアムで無制限にできます。`);
        }
    }
    const ref = await col.add({
        name,
        categoryLabel,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
});
/** マイ種目の名前・カテゴリ変更（書き込みは Functions のみ） */
exports.updateCustomExercise = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const exerciseId = typeof request.data?.exerciseId === "string" ? request.data.exerciseId.trim() : "";
    const name = typeof request.data?.name === "string" ? request.data.name.replace(/\0/g, "").trim().slice(0, 80) : "";
    const categoryLabel = typeof request.data?.categoryLabel === "string"
        ? request.data.categoryLabel.replace(/\0/g, "").trim().slice(0, 80)
        : "";
    if (!exerciseId) {
        throw new https_1.HttpsError("invalid-argument", "exerciseId が必要です。");
    }
    if (!name) {
        throw new https_1.HttpsError("invalid-argument", "種目名を入力してください。");
    }
    if (!categoryLabel) {
        throw new https_1.HttpsError("invalid-argument", "カテゴリが不正です。");
    }
    const ref = db.collection("users").doc(uid).collection("custom_exercises").doc(exerciseId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "種目が見つかりません。");
    }
    await ref.update({
        name,
        categoryLabel,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
exports.deleteCustomExercise = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const exerciseId = typeof request.data?.exerciseId === "string" ? request.data.exerciseId.trim() : "";
    if (!exerciseId) {
        throw new https_1.HttpsError("invalid-argument", "exerciseId が必要です。");
    }
    const ref = db.collection("users").doc(uid).collection("custom_exercises").doc(exerciseId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "種目が見つかりません。");
    }
    await ref.delete();
    return { ok: true };
});
/** 食事ルーティーン作成（無料は 3 件まで、プレミアムは実質無制限） */
exports.createMealRoutine = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const name = typeof request.data?.name === "string" ? request.data.name.replace(/\0/g, "").trim().slice(0, 80) : "";
    if (!name) {
        throw new https_1.HttpsError("invalid-argument", "ルーティーン名を入力してください。");
    }
    const meals = normalizeMealsPayload(request.data?.meals);
    const col = db.collection("users").doc(uid).collection("meal_routines");
    const premium = await (0, subscriptionMirror_1.isPremiumSubscriptionActive)(uid);
    if (!premium) {
        const agg = await col.count().get();
        if (agg.data().count >= FREE_MEAL_ROUTINES) {
            throw new https_1.HttpsError("resource-exhausted", `無料プランでは食事ルーティーンは最大${FREE_MEAL_ROUTINES}件までです。プレミアムで追加できます。`);
        }
    }
    const ref = await col.add({
        name,
        meals,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
});
exports.deleteMealRoutine = (0, https_1.onCall)(publicCallableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const routineId = typeof request.data?.routineId === "string" ? request.data.routineId.trim() : "";
    if (!routineId) {
        throw new https_1.HttpsError("invalid-argument", "routineId が必要です。");
    }
    const ref = db.collection("users").doc(uid).collection("meal_routines").doc(routineId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "ルーティーンが見つかりません。");
    }
    await ref.delete();
    return { ok: true };
});
