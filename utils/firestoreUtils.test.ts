import { sanitizeDocId } from './firestoreUtils';

describe('sanitizeDocId', () => {
  it('returns normal strings unchanged', () => {
    expect(sanitizeDocId('唐揚げ弁当')).toBe('唐揚げ弁当');
    expect(sanitizeDocId('chicken salad')).toBe('chicken salad');
  });

  it('replaces slashes with underscores', () => {
    expect(sanitizeDocId('サラダ/チキン')).toBe('サラダ_チキン');
    expect(sanitizeDocId('a/b/c')).toBe('a_b_c');
  });

  it('handles strings that are only slashes', () => {
    expect(sanitizeDocId('/')).toBe('_');
    expect(sanitizeDocId('//')).toBe('__');
  });

  it('wraps empty string to avoid invalid Firestore doc ID', () => {
    expect(sanitizeDocId('')).toBe('__');
  });

  it('wraps "." and ".." to avoid invalid Firestore doc IDs', () => {
    expect(sanitizeDocId('.')).toBe('_._');
    expect(sanitizeDocId('..')).toBe('_.._');
  });

  it('leaves strings without problematic characters as-is', () => {
    expect(sanitizeDocId('味噌汁')).toBe('味噌汁');
    expect(sanitizeDocId('rice-bowl_large')).toBe('rice-bowl_large');
  });

  it('handles mixed problematic and normal characters', () => {
    expect(sanitizeDocId('朝食/昼食/夕食')).toBe('朝食_昼食_夕食');
  });
});
