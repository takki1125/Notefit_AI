import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../firebaseConfig';

export type TestTrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export type TestPhase = 'cut' | 'maintain' | 'bulk';

export type TestAccount = {
  email: string;
  username: string;
  trainingLevel: TestTrainingLevel;
  phase: TestPhase;
};

/** `scripts/seed-test-accounts.mjs` と同じ6件。開発ビルドの切替UI専用。 */
export const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: 'test.beginner1@notefit-dev.test',
    username: 'テスト初心者A',
    trainingLevel: 'beginner',
    phase: 'cut',
  },
  {
    email: 'test.beginner2@notefit-dev.test',
    username: 'テスト初心者B',
    trainingLevel: 'beginner',
    phase: 'cut',
  },
  {
    email: 'test.intermediate1@notefit-dev.test',
    username: 'テスト中級者A',
    trainingLevel: 'intermediate',
    phase: 'maintain',
  },
  {
    email: 'test.intermediate2@notefit-dev.test',
    username: 'テスト中級者B',
    trainingLevel: 'intermediate',
    phase: 'bulk',
  },
  {
    email: 'test.advanced1@notefit-dev.test',
    username: 'テスト上級者A',
    trainingLevel: 'advanced',
    phase: 'bulk',
  },
  {
    email: 'test.advanced2@notefit-dev.test',
    username: 'テスト上級者B',
    trainingLevel: 'advanced',
    phase: 'cut',
  },
];

export const TEST_ACCOUNT_EMAIL_SUFFIX = '@notefit-dev.test';

export function isDevelopmentApp(): boolean {
  return Constants.expoConfig?.extra?.appVariant === 'development';
}

export function isTestAccountEmail(email?: string | null): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(TEST_ACCOUNT_EMAIL_SUFFIX);
}

/** 開発ビルドかつ、未ログイン or いまのユーザーがテストアカウントのときだけ切替UIを出す。 */
export function canUseTestAccountSwitcher(currentEmail?: string | null): boolean {
  if (!isDevelopmentApp()) return false;
  if (!currentEmail) return true;
  return isTestAccountEmail(currentEmail);
}

export function trainingLevelLabel(level: TestTrainingLevel): string {
  switch (level) {
    case 'beginner':
      return '初心者';
    case 'intermediate':
      return '中級者';
    case 'advanced':
      return '上級者';
  }
}

export function phaseLabel(phase: TestPhase): string {
  switch (phase) {
    case 'cut':
      return '減量';
    case 'maintain':
      return '維持';
    case 'bulk':
      return '増量';
  }
}

function getTestAccountPassword(): string | null {
  if (!isDevelopmentApp()) return null;
  // scripts/seed-test-accounts.mjs の DEFAULT_PASSWORD と揃える
  return 'NotefitTest2026!';
}

export async function signInToTestAccount(email: string): Promise<void> {
  if (!isDevelopmentApp()) {
    throw new Error('開発ビルド以外ではテストアカウントを切り替えられません。');
  }

  const account = TEST_ACCOUNTS.find((item) => item.email === email);
  const password = getTestAccountPassword();
  if (!account || !password) {
    throw new Error('未知のテストアカウントです。');
  }

  const currentEmail = auth.currentUser?.email ?? null;
  if (currentEmail && !isTestAccountEmail(currentEmail)) {
    throw new Error('テストアカウント以外からは切り替えられません。');
  }
  if (currentEmail === account.email) return;

  await AsyncStorage.removeItem('@workout_history');
  await signInWithEmailAndPassword(auth, account.email, password);
}
