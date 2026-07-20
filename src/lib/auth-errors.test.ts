import { describe, expect, test } from "bun:test";
import { classifyLoginError, isAuthRejection, loginFailureMessage } from "./auth-errors";

describe("isAuthRejection", () => {
  test("토큰이 실제로 무효한 응답만 로그인 화면으로 보낸다", () => {
    expect(isAuthRejection({ status: 401 })).toBe(true);
    expect(isAuthRejection({ status: 403 })).toBe(true);
    expect(isAuthRejection({ status: 400 })).toBe(true);
  });

  test("네트워크/서버 장애는 로그아웃으로 처리하지 않는다", () => {
    expect(isAuthRejection({ status: 500 })).toBe(false);
    expect(isAuthRejection({ status: 503 })).toBe(false);
    expect(isAuthRejection({ status: 429 })).toBe(false);
    // fetch 자체가 실패하면 status가 없다
    expect(isAuthRejection({})).toBe(false);
    expect(isAuthRejection({ status: 0 })).toBe(false);
  });

  test("오류가 없으면 거부가 아니다", () => {
    expect(isAuthRejection(null)).toBe(false);
  });
});

describe("classifyLoginError", () => {
  test("code 기반 분류", () => {
    expect(classifyLoginError({ code: "invalid_credentials", status: 400 })).toBe(
      "invalid_credentials"
    );
    expect(classifyLoginError({ code: "email_not_confirmed", status: 400 })).toBe(
      "email_not_confirmed"
    );
    expect(classifyLoginError({ code: "user_banned", status: 403 })).toBe("user_banned");
    expect(classifyLoginError({ code: "over_request_rate_limit", status: 429 })).toBe(
      "rate_limited"
    );
  });

  test("code가 없으면 message로 폴백", () => {
    expect(classifyLoginError({ message: "Invalid login credentials", status: 400 })).toBe(
      "invalid_credentials"
    );
    expect(classifyLoginError({ message: "Email not confirmed" })).toBe("email_not_confirmed");
  });

  test("status 429만 있어도 rate limit", () => {
    expect(classifyLoginError({ status: 429 })).toBe("rate_limited");
  });

  test("모르는 오류는 unknown", () => {
    expect(classifyLoginError({ message: "some new upstream failure" })).toBe("unknown");
    expect(classifyLoginError({})).toBe("unknown");
  });
});

describe("loginFailureMessage", () => {
  test("모든 사유가 한국어 안내를 가진다", () => {
    const reasons = [
      "invalid_credentials",
      "oauth_only",
      "email_not_confirmed",
      "rate_limited",
      "user_banned",
      "unknown",
    ] as const;
    for (const reason of reasons) {
      const message = loginFailureMessage(reason);
      expect(message.length).toBeGreaterThan(0);
      // 영문 원문이 새어나오지 않아야 함
      expect(message).not.toMatch(/[a-z]{4,}/i);
    }
  });

  test("카카오 전용 계정은 카카오 로그인을 안내", () => {
    expect(loginFailureMessage("oauth_only")).toContain("카카오");
  });
});
