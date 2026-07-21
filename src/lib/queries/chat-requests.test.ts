import { describe, expect, test } from "bun:test";
import { isChatRequestActionable } from "@/lib/chat/request-status";

describe("isChatRequestActionable", () => {
  const now = new Date("2026-07-21T00:00:00Z");

  test("pending + 미래 만료 → true", () => {
    expect(isChatRequestActionable("pending", new Date("2026-07-22T00:00:00Z"), now)).toBe(true);
  });

  test("pending + 만료없음(null) → true", () => {
    expect(isChatRequestActionable("pending", null, now)).toBe(true);
  });

  test("pending + 과거 만료 → false", () => {
    expect(isChatRequestActionable("pending", new Date("2026-07-20T00:00:00Z"), now)).toBe(false);
  });

  test("accepted → false", () => {
    expect(isChatRequestActionable("accepted", null, now)).toBe(false);
  });

  test("null 상태 → false", () => {
    expect(isChatRequestActionable(null, null, now)).toBe(false);
  });
});
