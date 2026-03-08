export type BodyPart = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | null;

export function categorizeBodyPart(name: string): BodyPart {
  const n = name || '';

  if (n.includes('ベンチ') || n.includes('フライ') || n.includes('チェスト')) {
    return 'chest';
  }

  if (n.includes('ラット') || n.includes('ロウ') || n.includes('懸垂') || n.includes('デッド')) {
    return 'back';
  }

  if (n.includes('スクワット') || n.includes('レッグ')) {
    return 'legs';
  }

  if (n.includes('ショルダー') || n.includes('レイズ') || n.includes('ミリタリー')) {
    return 'shoulders';
  }

  if (n.includes('アーム') || n.includes('カール') || n.includes('トライセップ')) {
    return 'arms';
  }

  return null;
}

