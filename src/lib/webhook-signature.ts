import { createHmac, timingSafeEqual } from "node:crypto";

// Standard Webhooks 규격에서 권장하는 재전송 허용 오차 (초 단위).
// 이 범위를 벗어난 timestamp는 서명이 유효해도 재전송(replay) 공격으로 간주해 거부한다.
export const WEBHOOK_TOLERANCE_SEC = 300;

// Standard Webhooks 규격 (Supabase Auth Hook이 사용).
// 서명 대상은 `{id}.{timestamp}.{payload}`이고 헤더에는 공백으로 구분된 여러 서명이 올 수 있다.
export function verifyStandardWebhook(input: {
  secret: string;
  id: string;
  timestamp: string;
  payload: string;
  signature: string;
  nowMs?: number;
}): boolean {
  const { secret, id, timestamp, payload, signature, nowMs = Date.now() } = input;
  if (!secret || !id || !timestamp || !signature) return false;

  // timestamp는 Unix seconds 문자열이어야 한다. 숫자가 아니거나 비어있으면 즉시 거부하며,
  // NaN 비교로 우연히 통과하는 일이 없도록 엄격하게 검사한다.
  if (!/^-?\d+$/.test(timestamp)) return false;
  const timestampSec = Number(timestamp);
  if (!Number.isSafeInteger(timestampSec)) return false;

  // HMAC 계산 전에 저렴한 시간 검증부터 수행한다 — 오래된(또는 미래의) 요청은
  // 암호 연산 없이 즉시 거부해 재전송 공격의 비용을 낮춘다.
  const nowSec = Math.floor(nowMs / 1000);
  if (Math.abs(nowSec - timestampSec) > WEBHOOK_TOLERANCE_SEC) return false;

  const key = Buffer.from(secret.replace(/^v1,whsec_/, ""), "base64");
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest();

  for (const part of signature.split(" ")) {
    const value = part.startsWith("v1,") ? part.slice(3) : part;
    const candidate = Buffer.from(value, "base64");
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return true;
    }
  }
  return false;
}
