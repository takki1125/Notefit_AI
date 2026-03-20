/**
 * 生年月日 YYYY-MM-DD から満年齢を計算（端末ローカル日付基準）
 */
export function calcAgeYearsFromBirthDate(birthDate: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return undefined;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const birth = new Date(y, mo, d);
  if (Number.isNaN(birth.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  if (age < 3 || age > 120) return undefined;
  return age;
}
