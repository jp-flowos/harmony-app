const MEETING_DATE_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatMeetingDate(date: Date): string {
  return MEETING_DATE_FMT.format(date);
}

const KST_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// KST 기준 YYYY-MM-DD (운세 시드, 일자 로테이션용)
export function kstDateString(date: Date = new Date()): string {
  return KST_DATE_FMT.format(date);
}

const SHORT_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function shortParts(date: Date): (type: Intl.DateTimeFormatPartTypes) => string {
  const parts = SHORT_FMT.formatToParts(date);
  return (type) => parts.find((p) => p.type === type)?.value ?? "";
}

// 시안 표기: "5/25(월) 09:30"
export function formatMeetingDateShort(date: Date): string {
  const get = shortParts(date);
  return `${get("month")}/${get("day")}(${get("weekday")}) ${get("hour")}:${get("minute")}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function kstMidnightUtc(date: Date): number {
  const [y, m, d] = kstDateString(date).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// KST 자정 기준 D-day: 오늘 "D-DAY", 미래 "D-n", 과거 "D+n"
export function dDayLabel(target: Date, now: Date = new Date()): string {
  const diff = Math.round((kstMidnightUtc(target) - kstMidnightUtc(now)) / DAY_MS);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

// 커뮤니티 상대시간: 방금 전 / n분 전 / n시간 전 / n일 전, 7일 이상은 "M/D"
export function relativeTimeLabel(date: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const get = shortParts(date);
  return `${get("month")}/${get("day")}`;
}
