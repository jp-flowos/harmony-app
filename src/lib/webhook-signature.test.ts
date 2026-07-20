import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyStandardWebhook, WEBHOOK_TOLERANCE_SEC } from "./webhook-signature";

const SECRET = "v1,whsec_dGVzdHNlY3JldGtleWZvcmhhcm1vbnkxMjM0NTY3OA==";
const ID = "msg_123";
const TIMESTAMP = "1800000000";
const PAYLOAD = '{"user":{"phone":"+821012345678"},"sms":{"otp":"123456"}}';
// 테스트가 실제 시계에 의존하지 않도록, "지금"을 TIMESTAMP와 정확히 일치시킨다.
const NOW_MS = Number(TIMESTAMP) * 1000;

function sign(secret: string, id: string, timestamp: string, payload: string): string {
  const key = Buffer.from(secret.replace(/^v1,whsec_/, ""), "base64");
  const mac = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64");
  return `v1,${mac}`;
}

describe("verifyStandardWebhook", () => {
  test("올바른 서명은 통과", () => {
    const signature = sign(SECRET, ID, TIMESTAMP, PAYLOAD);
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp: TIMESTAMP,
        payload: PAYLOAD,
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(true);
  });

  test("페이로드가 바뀌면 거부", () => {
    const signature = sign(SECRET, ID, TIMESTAMP, PAYLOAD);
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp: TIMESTAMP,
        payload: '{"user":{"phone":"+821099999999"},"sms":{"otp":"123456"}}',
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(false);
  });

  test("시크릿이 다르면 거부", () => {
    const signature = sign(
      "v1,whsec_b3RoZXJzZWNyZXRrZXlmb3JoYXJtb255MTIzNDU2",
      ID,
      TIMESTAMP,
      PAYLOAD
    );
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp: TIMESTAMP,
        payload: PAYLOAD,
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(false);
  });

  test("서명 헤더에 여러 값이 있으면 하나라도 맞으면 통과", () => {
    const good = sign(SECRET, ID, TIMESTAMP, PAYLOAD).replace("v1,", "");
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp: TIMESTAMP,
        payload: PAYLOAD,
        signature: `v1,bogussignature v1,${good}`,
        nowMs: NOW_MS,
      })
    ).toBe(true);
  });

  test("빈 값은 거부", () => {
    expect(
      verifyStandardWebhook({
        secret: "",
        id: ID,
        timestamp: TIMESTAMP,
        payload: PAYLOAD,
        signature: "v1,x",
        nowMs: NOW_MS,
      })
    ).toBe(false);
    expect(
      verifyStandardWebhook({ secret: SECRET, id: "", timestamp: "", payload: "", signature: "" })
    ).toBe(false);
  });

  test("허용 오차 이내의 timestamp는 통과", () => {
    const timestamp = String(Number(TIMESTAMP) - WEBHOOK_TOLERANCE_SEC);
    const signature = sign(SECRET, ID, timestamp, PAYLOAD);
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp,
        payload: PAYLOAD,
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(true);
  });

  test("허용 오차보다 과거인 timestamp는 거부 (재전송 공격)", () => {
    const timestamp = String(Number(TIMESTAMP) - WEBHOOK_TOLERANCE_SEC - 1);
    const signature = sign(SECRET, ID, timestamp, PAYLOAD);
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp,
        payload: PAYLOAD,
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(false);
  });

  test("허용 오차보다 미래인 timestamp는 거부 (시계 오차 악용)", () => {
    const timestamp = String(Number(TIMESTAMP) + WEBHOOK_TOLERANCE_SEC + 1);
    const signature = sign(SECRET, ID, timestamp, PAYLOAD);
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp,
        payload: PAYLOAD,
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(false);
  });

  test("숫자가 아닌 timestamp는 거부", () => {
    const timestamp = "not-a-number";
    const signature = sign(SECRET, ID, timestamp, PAYLOAD);
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp,
        payload: PAYLOAD,
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(false);
  });

  test("빈 timestamp는 거부", () => {
    const signature = sign(SECRET, ID, "", PAYLOAD);
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        id: ID,
        timestamp: "",
        payload: PAYLOAD,
        signature,
        nowMs: NOW_MS,
      })
    ).toBe(false);
  });
});
