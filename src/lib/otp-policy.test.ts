import { describe, expect, test } from "bun:test";
import {
  decideSend,
  decideVerify,
  MAX_SENDS_PER_IP_PER_DAY,
  MAX_SENDS_PER_PHONE_PER_DAY,
  MAX_VERIFY_FAILS,
  RESEND_WAIT_MS,
} from "./otp-policy";

const NOW = 1_800_000_000_000;
const base = { now: NOW, lastSentAt: null, sentTodayForPhone: 0, sentTodayForIp: 0 };

describe("decideSend", () => {
  test("첫 발송은 허용", () => {
    expect(decideSend(base)).toEqual({ allowed: true });
  });

  test("재발송 대기 중이면 남은 초를 알려준다", () => {
    const result = decideSend({ ...base, lastSentAt: NOW - 10_000 });
    expect(result).toEqual({ allowed: false, reason: "resend_wait", retryAfterSec: 20 });
  });

  test("대기시간이 지나면 허용", () => {
    expect(decideSend({ ...base, lastSentAt: NOW - RESEND_WAIT_MS })).toEqual({ allowed: true });
  });

  test("남은 시간은 올림 처리 — 0초로 표시되지 않는다", () => {
    const result = decideSend({ ...base, lastSentAt: NOW - 29_500 });
    expect(result).toEqual({ allowed: false, reason: "resend_wait", retryAfterSec: 1 });
  });

  test("번호당 일일 한도 초과", () => {
    const result = decideSend({ ...base, sentTodayForPhone: MAX_SENDS_PER_PHONE_PER_DAY });
    expect(result).toEqual({ allowed: false, reason: "send_limit" });
  });

  test("한도 직전은 허용", () => {
    const result = decideSend({ ...base, sentTodayForPhone: MAX_SENDS_PER_PHONE_PER_DAY - 1 });
    expect(result).toEqual({ allowed: true });
  });

  test("IP당 일일 한도 초과", () => {
    const result = decideSend({ ...base, sentTodayForIp: MAX_SENDS_PER_IP_PER_DAY });
    expect(result).toEqual({ allowed: false, reason: "send_limit" });
  });

  test("한도 초과가 대기시간보다 우선한다", () => {
    const result = decideSend({
      ...base,
      lastSentAt: NOW - 1_000,
      sentTodayForPhone: MAX_SENDS_PER_PHONE_PER_DAY,
    });
    expect(result).toEqual({ allowed: false, reason: "send_limit" });
  });
});

describe("decideVerify", () => {
  test("실패 한도 미만이면 허용", () => {
    expect(decideVerify({ recentFails: 0 })).toEqual({ allowed: true });
    expect(decideVerify({ recentFails: MAX_VERIFY_FAILS - 1 })).toEqual({ allowed: true });
  });

  test("실패 한도에 도달하면 차단", () => {
    expect(decideVerify({ recentFails: MAX_VERIFY_FAILS })).toEqual({
      allowed: false,
      reason: "fail_limit",
    });
  });
});
