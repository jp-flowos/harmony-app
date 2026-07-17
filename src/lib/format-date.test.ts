import { describe, expect, test } from "bun:test";
import { dDayLabel, formatMeetingDateShort, kstDateString, relativeTimeLabel } from "./format-date";

// KST = UTC+9. 2026-05-25T09:30 KST = 2026-05-25T00:30:00Z (2026-05-25는 월요일)
const meeting = new Date("2026-05-25T00:30:00Z");

describe("kstDateString", () => {
  test("UTC 저녁은 KST 다음 날", () => {
    expect(kstDateString(new Date("2026-05-24T15:00:00Z"))).toBe("2026-05-25");
  });
});

describe("formatMeetingDateShort", () => {
  test("시안 표기 M/D(요일) HH:mm", () => {
    expect(formatMeetingDateShort(meeting)).toBe("5/25(월) 09:30");
  });
});

describe("dDayLabel", () => {
  const now = new Date("2026-05-23T03:00:00Z"); // KST 5/23 12:00
  test("이틀 뒤", () => {
    expect(dDayLabel(meeting, now)).toBe("D-2");
  });
  test("당일 (KST 기준)", () => {
    expect(dDayLabel(new Date("2026-05-23T14:00:00Z"), now)).toBe("D-DAY"); // KST 5/23 23:00
  });
  test("UTC로는 같은 날이지만 KST로는 다음 날", () => {
    expect(dDayLabel(new Date("2026-05-23T16:00:00Z"), now)).toBe("D-1"); // KST 5/24 01:00
  });
  test("지난 날짜", () => {
    expect(dDayLabel(new Date("2026-05-20T03:00:00Z"), now)).toBe("D+3");
  });
});

describe("relativeTimeLabel", () => {
  const now = new Date("2026-05-25T12:00:00Z");
  test("1분 미만", () => {
    expect(relativeTimeLabel(new Date("2026-05-25T11:59:40Z"), now)).toBe("방금 전");
  });
  test("분 단위", () => {
    expect(relativeTimeLabel(new Date("2026-05-25T11:30:00Z"), now)).toBe("30분 전");
  });
  test("시간 단위", () => {
    expect(relativeTimeLabel(new Date("2026-05-25T09:00:00Z"), now)).toBe("3시간 전");
  });
  test("일 단위", () => {
    expect(relativeTimeLabel(new Date("2026-05-23T12:00:00Z"), now)).toBe("2일 전");
  });
  test("7일 이상은 M/D", () => {
    expect(relativeTimeLabel(new Date("2026-05-01T12:00:00Z"), now)).toBe("5/1");
  });
});
