/**
 * Firestore ドキュメント ID に使えない文字（`/` など）を安全な文字に置換する。
 * Firestore の制約: ID は `/` を含めない、空文字不可、`.` / `..` 不可、1500 バイト以下。
 */
export function sanitizeDocId(raw: string): string {
  let id = raw.replace(/\//g, "_");
  if (id === "" || id === "." || id === "..") {
    id = `_${id}_`;
  }
  return id;
}
