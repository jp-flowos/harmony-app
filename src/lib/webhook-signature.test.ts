import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyStandardWebhook } from "./webhook-signature";

const SECRET = "v1,whsec_dGVzdHNlY3JldGtleWZvcmhhcm1vbnkxMjM0NTY3OA==";
const ID = "msg_123";
const TIMESTAMP = "1800000000";
const PAYLOAD = '{"user":{"phone":"+821012345678"},"sms":{"otp":"123456"}}';

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
      })
    ).toBe(false);
    expect(
      verifyStandardWebhook({ secret: SECRET, id: "", timestamp: "", payload: "", signature: "" })
    ).toBe(false);
  });
});
