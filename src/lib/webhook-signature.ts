import { createHmac, timingSafeEqual } from "node:crypto";

// Standard Webhooks 규격 (Supabase Auth Hook이 사용).
// 서명 대상은 `{id}.{timestamp}.{payload}`이고 헤더에는 공백으로 구분된 여러 서명이 올 수 있다.
export function verifyStandardWebhook(input: {
  secret: string;
  id: string;
  timestamp: string;
  payload: string;
  signature: string;
}): boolean {
  const { secret, id, timestamp, payload, signature } = input;
  if (!secret || !id || !timestamp || !signature) return false;

  const key = Buffer.from(secret.replace(/^v1,whsec_/, ""), "base64");
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest();

  for (const part of signature.split(" ")) {
    const value = part.startsWith("v1,") ? part.slice(3) : part;
    let candidate: Buffer;
    try {
      candidate = Buffer.from(value, "base64");
    } catch {
      continue;
    }
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return true;
    }
  }
  return false;
}
