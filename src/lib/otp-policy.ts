// SMS 인증번호 정책 (스펙 2026-07-20-phone-auth-design.md).
// DB 조회 결과를 입력으로 받아 판정만 한다 — 순수 함수라 테스트가 쉽다.

export const OTP_TTL_MS = 3 * 60 * 1000;
export const RESEND_WAIT_MS = 30 * 1000;
export const MAX_VERIFY_FAILS = 5;
export const MAX_SENDS_PER_PHONE_PER_DAY = 5;
export const MAX_SENDS_PER_IP_PER_DAY = 20;
// verify는 번호당 실패 횟수만 세므로, 같은 IP가 서로 다른(이미 발송된) 번호를 여러 개
// 동시에 브루트포스해도 번호별 한도(MAX_VERIFY_FAILS)만 각각 소모할 뿐 IP 차원의 상한이
// 없었다. 가족·사무실처럼 여러 명이 한 IP를 공유하며 각자 실수로 몇 번씩 틀리는 상황은
// 넉넉히 허용하되(가구당 최대 6개 번호 x 5회 한도 = 30), 한 IP가 수십~수백 개 번호를
// 병렬로 시도하는 것은 막는다.
export const MAX_VERIFY_FAILS_PER_IP_PER_DAY = 30;
export const POLICY_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface SendInput {
  now: number;
  lastSentAt: number | null;
  sentTodayForPhone: number;
  sentTodayForIp: number;
}

export type SendDecision =
  | { allowed: true }
  | { allowed: false; reason: "resend_wait"; retryAfterSec: number }
  | { allowed: false; reason: "send_limit" };

export type VerifyDecision = { allowed: true } | { allowed: false; reason: "fail_limit" };

export function decideSend(input: SendInput): SendDecision {
  // 한도 초과를 먼저 본다 — 대기 후 재시도해도 어차피 막히므로 잘못된 안내를 하지 않는다.
  if (
    input.sentTodayForPhone >= MAX_SENDS_PER_PHONE_PER_DAY ||
    input.sentTodayForIp >= MAX_SENDS_PER_IP_PER_DAY
  ) {
    return { allowed: false, reason: "send_limit" };
  }

  if (input.lastSentAt !== null) {
    const elapsed = input.now - input.lastSentAt;
    if (elapsed < RESEND_WAIT_MS) {
      return {
        allowed: false,
        reason: "resend_wait",
        retryAfterSec: Math.ceil((RESEND_WAIT_MS - elapsed) / 1000),
      };
    }
  }

  return { allowed: true };
}

export function decideVerify(input: {
  recentFails: number;
  recentFailsForIp: number;
}): VerifyDecision {
  if (
    input.recentFails >= MAX_VERIFY_FAILS ||
    input.recentFailsForIp >= MAX_VERIFY_FAILS_PER_IP_PER_DAY
  ) {
    return { allowed: false, reason: "fail_limit" };
  }
  return { allowed: true };
}
