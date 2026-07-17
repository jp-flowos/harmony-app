import { describe, expect, test } from "bun:test";
import { REGIONS, SIDO_LIST } from "./regions";

describe("regions", () => {
  test("17개 시/도", () => {
    expect(SIDO_LIST).toHaveLength(17);
  });

  test("서울은 25개 구", () => {
    expect(REGIONS["서울"]).toHaveLength(25);
  });

  test("세종은 시/군/구 없음", () => {
    expect(REGIONS["세종"]).toHaveLength(0);
  });

  test("시/군/구 중복 없음", () => {
    for (const sido of SIDO_LIST) {
      const list = REGIONS[sido];
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
