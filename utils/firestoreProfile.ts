import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebaseConfig';
import type { Phase, UserProfile } from './models';

type UserDocShape = Partial<{
  username: string;
  phase: Phase;
  targetWeight: number;
  targetCal: number;
  isDetailedTrackingEnabled: boolean;
}>;

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as UserDocShape;
  if (!data.phase || typeof data.targetWeight !== 'number' || typeof data.targetCal !== 'number') {
    return null;
  }
  return {
    uid,
    phase: data.phase,
    targetWeight: data.targetWeight,
    targetCal: data.targetCal,
    isDetailedTrackingEnabled: !!data.isDetailedTrackingEnabled,
  };
}

export async function setUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'uid'>,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      phase: profile.phase,
      targetWeight: profile.targetWeight,
      targetCal: profile.targetCal,
      isDetailedTrackingEnabled: profile.isDetailedTrackingEnabled,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function setDetailedTrackingEnabled(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      isDetailedTrackingEnabled: enabled,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

