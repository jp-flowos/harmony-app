import { describe, expect, test } from "bun:test";
import {
  CONSENT_VERSION,
  formatPhoneDisplay,
  formatPhoneInput,
  isValidPhone,
  normalizePhone,
  toE164KR,
} from "./auth-utils";

describe("normalizePhone / isValidPhone", () => {
  test("하이픈/공백 제거", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizePhone("010 1234 5678")).toBe("01012345678");
  });
  test("유효성: 010 + 7~8자리", () => {
    expect(isValidPhone("01012345678")).toBe(true);
    expect(isValidPhone("0101234567")).toBe(true);
    expect(isValidPhone("01112345678")).toBe(false);
    expect(isValidPhone("010123456")).toBe(false);
    expect(isValidPhone("010123456789")).toBe(false);
  });
});

describe("formatPhoneInput", () => {
  test("입력 진행 중 하이픈", () => {
    expect(formatPhoneInput("010")).toBe("010");
    expect(formatPhoneInput("0101")).toBe("010-1");
    expect(formatPhoneInput("0101234")).toBe("010-1234");
    expect(formatPhoneInput("01012345")).toBe("010-1234-5");
    expect(formatPhoneInput("01012345678")).toBe("010-1234-5678");
  });
  test("이미 하이픈 있어도 재정규화", () => {
    expect(formatPhoneInput("010-1234-5678")).toBe("010-1234-5678");
  });
  test("11자리 초과분 잘림", () => {
    expect(formatPhoneInput("010123456789")).toBe("010-1234-5678");
  });
  test("10자리도 진행형 3-4-4 유지 (최종 자릿수 판별 불가)", () => {
    expect(formatPhoneInput("0101234567")).toBe("010-1234-567");
  });
});

describe("toE164KR", () => {
  test("하이픈/공백이 있어도 E.164로 변환", () => {
    expect(toE164KR("010-1234-5678")).toBe("+821012345678");
    expect(toE164KR("010 1234 5678")).toBe("+821012345678");
    expect(toE164KR("01012345678")).toBe("+821012345678");
  });
  test("앞뒤 공백 허용", () => {
    expect(toE164KR("  010-1234-5678  ")).toBe("+821012345678");
  });
  test("10자리 010 번호도 변환", () => {
    expect(toE164KR("010-123-4567")).toBe("+82101234567");
  });
  test("010이 아니면 null", () => {
    expect(toE164KR("011-1234-5678")).toBeNull();
    expect(toE164KR("+8210123456780")).toBeNull();
  });
  test("자릿수가 틀리면 null", () => {
    expect(toE164KR("010-123-456")).toBeNull(); // 9자리
    expect(toE164KR("010-1234-56789")).toBeNull(); // 12자리
    expect(toE164KR("")).toBeNull();
  });

  test("하이픈 위치는 결과에 영향이 없다", () => {
    // 정규화 후 자릿수만 본다 — 둘 다 10자리 유효 번호다
    expect(toE164KR("010-1234-567")).toBe("+82101234567");
    expect(toE164KR("010-123-4567")).toBe("+82101234567");
  });
  test("이미 E.164인 국내 번호도 허용", () => {
    expect(toE164KR("+821012345678")).toBe("+821012345678");
  });
});

describe("formatPhoneDisplay", () => {
  test("E.164를 한국식 표기로", () => {
    expect(formatPhoneDisplay("+821012345678")).toBe("010-1234-5678");
  });
  test("10자리 번호는 3-3-4", () => {
    expect(formatPhoneDisplay("+82101234567")).toBe("010-123-4567");
  });
  test("E.164가 아니면 입력 그대로", () => {
    expect(formatPhoneDisplay("01012345678")).toBe("01012345678");
    expect(formatPhoneDisplay("")).toBe("");
  });
  test("toE164KR와 왕복", () => {
    const e164 = toE164KR("010-9876-5432");
    expect(e164).not.toBeNull();
    expect(formatPhoneDisplay(e164 as string)).toBe("010-9876-5432");
  });
});

describe("CONSENT_VERSION", () => {
  test("문서 버전 고정", () => {
    expect(CONSENT_VERSION).toBe("2026-07-17");
  });
});
