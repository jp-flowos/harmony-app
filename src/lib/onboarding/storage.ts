const KEY = "harmony.onboarding.dismissed";

export type CardId = "operator" | "cohort" | "first-club" | "kakao-share" | "notif-opt-in";

export function isDismissed(id: CardId): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const arr = JSON.parse(raw) as CardId[];
    return arr.includes(id);
  } catch {
    return false;
  }
}

export function dismiss(id: CardId) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(KEY);
  let arr: CardId[] = [];
  try {
    arr = raw ? (JSON.parse(raw) as CardId[]) : [];
  } catch {}
  if (!arr.includes(id)) arr.push(id);
  localStorage.setItem(KEY, JSON.stringify(arr));
}
