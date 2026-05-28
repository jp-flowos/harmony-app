const KEY = "harmony.onboarding.dismissed";

export type CardId = "operator" | "cohort" | "first-club" | "kakao-share" | "notif-opt-in";

export function isDismissed(id: CardId): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const arr = JSON.parse(raw) as CardId[];
    return Array.isArray(arr) && arr.includes(id);
  } catch {
    return false;
  }
}

export function dismiss(id: CardId) {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(parsed) ? (parsed as CardId[]) : [];

    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {}
}
