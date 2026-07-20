import "server-only";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

// SMS OTP 라우트(send/verify)가 공유하는 rate-limit 키 파생 헬퍼.
// h_auth_attempts 테이블의 "ip" 컬럼을 두 가지 용도로 쓴다 — 실제 클라이언트 IP,
// 그리고 전화번호를 해시한 phoneKey. 컬럼 하나를 재사용하는 이유는 스키마 변경 없이
// (번호별, IP별) 두 축을 같은 카운팅 로직(insert-then-count)으로 다룰 수 있어서다.

// 번호를 원문으로 저장하지 않는다 — 저엔트로피 입력이라 서버 시크릿 HMAC을 쓴다.
// SUPABASE_SERVICE_ROLE_KEY가 비어 있으면 조용히 폴백하지 않고 즉시 던진다 — 폴백을
// 두면 키를 로테이션하거나 분실했을 때 모든 rate-limit 카운터가 조용히 초기화되고,
// 그 폴백값이 저장소에 공개된 상수라 공격자가 카운터를 예측/우회할 수 있다 (fail-open).
export function phoneKey(e164: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — cannot derive OTP rate-limit key");
  }
  return createHmac("sha256", secret).update(`otp:${e164}`).digest("hex").slice(0, 32);
}

export function clientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
