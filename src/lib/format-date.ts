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
