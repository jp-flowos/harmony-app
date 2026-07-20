import { describe, expect, test } from "bun:test";
import {
  CONSENT_VERSION,
  formatPhoneInput,
  isValidPhone,
  maskEmail,
  normalizeEmail,
  normalizePhone,
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

describe("normalizeEmail", () => {
  test("앞뒤 공백 제거 — 모바일 키보드가 붙이는 공백으로 로그인이 실패하지 않도록", () => {
    expect(normalizeEmail(" harmony@gmail.com ")).toBe("harmony@gmail.com");
    expect(normalizeEmail("harmony@gmail.com\n")).toBe("harmony@gmail.com");
  });
  test("소문자 정규화 — GoTrue 저장 형식과 일치", () => {
    expect(normalizeEmail("Harmony@Gmail.COM")).toBe("harmony@gmail.com");
  });
  test("가입과 로그인이 같은 값으로 수렴", () => {
    expect(normalizeEmail(" Harmony@Gmail.com ")).toBe(normalizeEmail("harmony@gmail.com"));
  });
});

describe("maskEmail", () => {
  test("기본 마스킹", () => {
    expect(maskEmail("harmony@gmail.com")).toBe("ha***@g***.com");
  });
  test("로컬 1자", () => {
    expect(maskEmail("a@naver.com")).toBe("a***@n***.com");
  });
  test("다중 점 도메인은 첫 라벨만 마스킹", () => {
    expect(maskEmail("user@mail.co.kr")).toBe("us***@m***.co.kr");
  });
  test("@ 없는 입력은 전체 마스킹", () => {
    expect(maskEmail("notanemail")).toBe("***");
  });
  test("점 없는 도메인도 안전", () => {
    expect(maskEmail("a@localhost")).toBe("a***@l***");
  });
});

describe("CONSENT_VERSION", () => {
  test("문서 버전 고정", () => {
    expect(CONSENT_VERSION).toBe("2026-07-17");
  });
});
