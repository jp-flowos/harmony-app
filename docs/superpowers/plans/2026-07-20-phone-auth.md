# 전화번호 인증 가입·로그인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이메일+비밀번호 가입을 전화번호 SMS 인증으로 교체하고, 가입과 로그인을 하나의 흐름으로 통합한다.

**Architecture:** Supabase 네이티브 phone auth를 쓰고 SMS 발송만 Send SMS Hook으로 위임받는다. Supabase가 OTP 생성·검증·세션 발급을 담당하므로 기존 쿠키·proxy·`requireUser()` 코드는 건드리지 않는다. 정책 수치(한도·대기·실패)는 우리 API가 Supabase 호출 앞단에서 강제하고, 카운터는 기존 `h_auth_attempts` 테이블을 재사용한다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Auth (`@supabase/ssr`), Drizzle ORM, Zod, Bun test, Biome.

**설계 문서:** `docs/superpowers/specs/2026-07-20-phone-auth-design.md`

## Global Constraints

- 모든 사용자 노출 문자열은 한국어. 영문 원문(Supabase 오류 등)을 그대로 노출하지 않는다.
- DB 테이블·enum 이름은 `h_` 접두사. 컬럼명은 접두사 없음.
- DB 마이그레이션은 `supabase/migrations/*.sql`이 source of truth. `drizzle-kit generate`를 쓰지 않는다.
- 전화번호는 DB·Supabase 모두 E.164(`+821012345678`)로 저장한다. 화면 표시만 `010-1234-5678`.
- 국내 010 번호만 허용한다.
- 정책 수치: OTP 유효 3분 / 재발송 대기 30초 / 입력 실패 5회 / 번호당 일 5회 / IP당 일 20회.
- 시니어 대상 UI: 최소 터치 영역 `h-12`, 큰 글씨, Phosphor 아이콘, 오렌지(coral) 브랜드 컬러.
- 새 API 라우트는 `@/lib/api-response`의 `successResponse`/`errorResponse` 형식을 쓴다.
- TypeScript 변경 후 `bunx tsc --noEmit` 실행.
- 세션 관련 동작은 반드시 프로덕션 빌드(`bun run build && bun run start`)로 검증한다. dev 서버에서는 재현되지 않는 전례가 있다.

---

## Task 0: Supabase 플랜 및 Send SMS Hook 가용성 확인 (차단 게이트)

이 확인이 실패하면 Task 1 이후를 진행하지 않는다. 설계의 서버 구성 절을 자체 OTP 방식으로 다시 써야 한다.

**Files:** 없음 (운영 확인)

- [ ] **Step 1: Supabase 대시보드에서 플랜 확인**

Supabase 대시보드 → Project Settings → Billing 에서 현재 플랜을 확인한다. Send SMS Hook은 Pro 이상에서 제공된다.

- [ ] **Step 2: Auth Hooks 메뉴 존재 확인**

Authentication → Hooks 메뉴에 "Send SMS hook" 항목이 보이는지 확인한다.

- [ ] **Step 3: 결과 기록**

가용하면 다음 태스크로 진행한다. 불가하면 **여기서 멈추고** 사용자에게 보고한 뒤 설계를 재검토한다. 임의로 자체 OTP 방식으로 전환하지 않는다.

---

## Task 1: 전화번호 E.164 변환 유틸

**Files:**
- Modify: `src/lib/auth-utils.ts`
- Test: `src/lib/auth-utils.test.ts`

**Interfaces:**
- Consumes: 기존 `normalizePhone(input: string): string` (숫자만 남김), `isValidPhone(normalized: string): boolean` (010 + 7~8자리)
- Produces:
  - `toE164KR(input: string): string | null` — 유효한 010 번호면 `+8210XXXXXXXX`, 아니면 `null`
  - `formatPhoneDisplay(e164: string): string` — `+821012345678` → `010-1234-5678`, 형식이 아니면 입력 그대로 반환

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth-utils.test.ts`의 `describe("normalizeEmail", ...)` 블록 **위에** 추가한다.

```ts
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
```

import 문에 `toE164KR`, `formatPhoneDisplay`를 추가한다.

```ts
import {
  CONSENT_VERSION,
  formatPhoneDisplay,
  formatPhoneInput,
  isValidPhone,
  maskEmail,
  normalizeEmail,
  normalizePhone,
  toE164KR,
} from "./auth-utils";
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `bun test src/lib/auth-utils.test.ts`
Expected: FAIL — `toE164KR is not a function` 또는 import 오류

- [ ] **Step 3: 구현**

`src/lib/auth-utils.ts`의 `formatPhoneInput` 아래에 추가한다.

```ts
// 국내 010 번호 ↔ E.164. auth.users.phone과 h_profiles.phone은 모두 E.164로 저장한다.
// 형식이 두 개면 조회가 어긋나는 버그가 생긴다.
export function toE164KR(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.startsWith("+82")
    ? `0${normalizePhone(trimmed).slice(2)}`
    : normalizePhone(trimmed);
  if (!isValidPhone(digits)) return null;
  return `+82${digits.slice(1)}`;
}

export function formatPhoneDisplay(e164: string): string {
  if (!e164.startsWith("+82")) return e164;
  const digits = `0${normalizePhone(e164).slice(2)}`;
  if (!isValidPhone(digits)) return e164;
  // 완성된 번호이므로 자릿수를 알 수 있다 — 11자리는 3-4-4, 10자리는 3-3-4.
  // formatPhoneInput은 입력 중 최종 길이를 알 수 없어 항상 3-4-4를 쓰므로 재사용하지 않는다.
  const mid = digits.length === 11 ? 4 : 3;
  return `${digits.slice(0, 3)}-${digits.slice(3, 3 + mid)}-${digits.slice(3 + mid)}`;
}
```

`formatPhoneInput`을 재사용하지 않는 이유가 중요하다. 기존 테스트가 `formatPhoneInput("0101234567")`을 `"010-1234-567"`로 규정한다 — 입력 중에는 최종 자릿수를 판별할 수 없기 때문이다. 표시용은 완성된 번호를 받으므로 `010-123-4567`이 맞다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/auth-utils.test.ts`
Expected: PASS (기존 테스트 포함 전부)

- [ ] **Step 5: 타입 확인 후 커밋**

```bash
bunx tsc --noEmit
git add src/lib/auth-utils.ts src/lib/auth-utils.test.ts
git commit -m "feat(auth): add E.164 phone conversion helpers"
```

---

## Task 2: OTP 정책 판정 함수

정책 수치를 순수 함수로 분리한다. DB 조회 결과를 입력으로 받아 허용 여부만 판정하므로 테스트가 쉽다.

**Files:**
- Create: `src/lib/otp-policy.ts`
- Test: `src/lib/otp-policy.test.ts`

**Interfaces:**
- Produces:
  - 상수 `OTP_TTL_MS`, `RESEND_WAIT_MS`, `MAX_VERIFY_FAILS`, `MAX_SENDS_PER_PHONE_PER_DAY`, `MAX_SENDS_PER_IP_PER_DAY`, `POLICY_WINDOW_MS`
  - `decideSend(input: SendInput): SendDecision`
  - `decideVerify(input: { recentFails: number }): VerifyDecision`
  - 타입 `SendInput`, `SendDecision`, `VerifyDecision`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/otp-policy.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  decideSend,
  decideVerify,
  MAX_SENDS_PER_IP_PER_DAY,
  MAX_SENDS_PER_PHONE_PER_DAY,
  MAX_VERIFY_FAILS,
  RESEND_WAIT_MS,
} from "./otp-policy";

const NOW = 1_800_000_000_000;
const base = { now: NOW, lastSentAt: null, sentTodayForPhone: 0, sentTodayForIp: 0 };

describe("decideSend", () => {
  test("첫 발송은 허용", () => {
    expect(decideSend(base)).toEqual({ allowed: true });
  });

  test("재발송 대기 중이면 남은 초를 알려준다", () => {
    const result = decideSend({ ...base, lastSentAt: NOW - 10_000 });
    expect(result).toEqual({ allowed: false, reason: "resend_wait", retryAfterSec: 20 });
  });

  test("대기시간이 지나면 허용", () => {
    expect(decideSend({ ...base, lastSentAt: NOW - RESEND_WAIT_MS })).toEqual({ allowed: true });
  });

  test("남은 시간은 올림 처리 — 0초로 표시되지 않는다", () => {
    const result = decideSend({ ...base, lastSentAt: NOW - 29_500 });
    expect(result).toEqual({ allowed: false, reason: "resend_wait", retryAfterSec: 1 });
  });

  test("번호당 일일 한도 초과", () => {
    const result = decideSend({ ...base, sentTodayForPhone: MAX_SENDS_PER_PHONE_PER_DAY });
    expect(result).toEqual({ allowed: false, reason: "send_limit" });
  });

  test("한도 직전은 허용", () => {
    const result = decideSend({ ...base, sentTodayForPhone: MAX_SENDS_PER_PHONE_PER_DAY - 1 });
    expect(result).toEqual({ allowed: true });
  });

  test("IP당 일일 한도 초과", () => {
    const result = decideSend({ ...base, sentTodayForIp: MAX_SENDS_PER_IP_PER_DAY });
    expect(result).toEqual({ allowed: false, reason: "send_limit" });
  });

  test("한도 초과가 대기시간보다 우선한다", () => {
    const result = decideSend({
      ...base,
      lastSentAt: NOW - 1_000,
      sentTodayForPhone: MAX_SENDS_PER_PHONE_PER_DAY,
    });
    expect(result).toEqual({ allowed: false, reason: "send_limit" });
  });
});

describe("decideVerify", () => {
  test("실패 한도 미만이면 허용", () => {
    expect(decideVerify({ recentFails: 0 })).toEqual({ allowed: true });
    expect(decideVerify({ recentFails: MAX_VERIFY_FAILS - 1 })).toEqual({ allowed: true });
  });

  test("실패 한도에 도달하면 차단", () => {
    expect(decideVerify({ recentFails: MAX_VERIFY_FAILS })).toEqual({
      allowed: false,
      reason: "fail_limit",
    });
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `bun test src/lib/otp-policy.test.ts`
Expected: FAIL — `Cannot find module './otp-policy'`

- [ ] **Step 3: 구현**

`src/lib/otp-policy.ts`:

```ts
// SMS 인증번호 정책 (스펙 2026-07-20-phone-auth-design.md).
// DB 조회 결과를 입력으로 받아 판정만 한다 — 순수 함수라 테스트가 쉽다.

export const OTP_TTL_MS = 3 * 60 * 1000;
export const RESEND_WAIT_MS = 30 * 1000;
export const MAX_VERIFY_FAILS = 5;
export const MAX_SENDS_PER_PHONE_PER_DAY = 5;
export const MAX_SENDS_PER_IP_PER_DAY = 20;
export const POLICY_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface SendInput {
  now: number;
  lastSentAt: number | null;
  sentTodayForPhone: number;
  sentTodayForIp: number;
}

export type SendDecision =
  | { allowed: true }
  | { allowed: false; reason: "resend_wait"; retryAfterSec: number }
  | { allowed: false; reason: "send_limit" };

export type VerifyDecision = { allowed: true } | { allowed: false; reason: "fail_limit" };

export function decideSend(input: SendInput): SendDecision {
  // 한도 초과를 먼저 본다 — 대기 후 재시도해도 어차피 막히므로 잘못된 안내를 하지 않는다.
  if (
    input.sentTodayForPhone >= MAX_SENDS_PER_PHONE_PER_DAY ||
    input.sentTodayForIp >= MAX_SENDS_PER_IP_PER_DAY
  ) {
    return { allowed: false, reason: "send_limit" };
  }

  if (input.lastSentAt !== null) {
    const elapsed = input.now - input.lastSentAt;
    if (elapsed < RESEND_WAIT_MS) {
      return {
        allowed: false,
        reason: "resend_wait",
        retryAfterSec: Math.ceil((RESEND_WAIT_MS - elapsed) / 1000),
      };
    }
  }

  return { allowed: true };
}

export function decideVerify(input: { recentFails: number }): VerifyDecision {
  if (input.recentFails >= MAX_VERIFY_FAILS) {
    return { allowed: false, reason: "fail_limit" };
  }
  return { allowed: true };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/otp-policy.test.ts`
Expected: PASS (10개)

- [ ] **Step 5: 커밋**

```bash
bunx tsc --noEmit
git add src/lib/otp-policy.ts src/lib/otp-policy.test.ts
git commit -m "feat(auth): add OTP rate-limit policy decisions"
```

---

## Task 3: SMS 발송 어댑터

공급자가 미정이므로 인터페이스로 추상화한다. 개발 중에는 콘솔 어댑터를 쓴다.

**Files:**
- Create: `src/lib/sms/types.ts`
- Create: `src/lib/sms/console.ts`
- Create: `src/lib/sms/index.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces:
  - `interface SmsSender { send(to: string, text: string): Promise<void> }`
  - `consoleSender: SmsSender`
  - `getSmsSender(): SmsSender`

- [ ] **Step 1: 인터페이스 작성**

`src/lib/sms/types.ts`:

```ts
// SMS 발송 추상화. 공급자가 정해지면 이 인터페이스를 구현한 어댑터 파일만 추가한다.
export interface SmsSender {
  // to는 E.164 형식(+821012345678)
  send(to: string, text: string): Promise<void>;
}
```

- [ ] **Step 2: 콘솔 어댑터 작성**

`src/lib/sms/console.ts`:

```ts
import "server-only";
import type { SmsSender } from "./types";

// 개발용. 실제 발송 없이 서버 로그에만 출력한다.
export const consoleSender: SmsSender = {
  async send(to, text) {
    console.info(`[sms:console] to=${to} text=${text}`);
  },
};
```

- [ ] **Step 3: 선택기 작성**

`src/lib/sms/index.ts`:

```ts
import "server-only";
import { consoleSender } from "./console";
import type { SmsSender } from "./types";

export type { SmsSender } from "./types";

// SMS_PROVIDER가 설정되지 않았거나 "console"이면 콘솔 출력.
// 공급자 확정 시 여기에 case를 추가한다.
export function getSmsSender(): SmsSender {
  const provider = process.env.SMS_PROVIDER ?? "console";
  switch (provider) {
    case "console":
      return consoleSender;
    default:
      throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
  }
}
```

- [ ] **Step 4: 환경변수 문서화**

`.env.example` 끝에 추가한다.

```bash
# SMS 인증 (전화번호 로그인)
# console = 발송하지 않고 서버 로그에만 출력 (개발용)
SMS_PROVIDER=console
# Supabase Send SMS Hook 서명 검증용 시크릿 (대시보드에서 발급, v1,whsec_... 형식)
SUPABASE_SMS_HOOK_SECRET=
```

- [ ] **Step 5: 커밋**

```bash
bunx tsc --noEmit
git add src/lib/sms/ .env.example
git commit -m "feat(sms): add provider-agnostic SMS sender interface"
```

---

## Task 4: DB 마이그레이션 — phone E.164 정규화 및 유니크 인덱스

**Files:**
- Create: `supabase/migrations/20260720100000_phone_auth.sql`

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- 전화번호 인증 전환: h_profiles.phone을 auth.users.phone과 같은 E.164로 통일한다.
-- 형식이 두 개면 조회가 어긋나는 버그가 생긴다 (2026-07-20 이메일 공백 불일치 전례).
-- 기존 데이터는 1건(01012345678 형식)뿐이라 변환 부담이 없다.

-- 1) 기존 국내 번호를 E.164로 변환. 이미 +로 시작하면 건드리지 않는다.
UPDATE si_mvp.h_profiles
SET phone = '+82' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+%'
  AND regexp_replace(phone, '\D', '', 'g') ~ '^010\d{7,8}$';

-- 2) 변환 불가한 값은 NULL로 (형식이 깨진 레거시 데이터가 유니크 인덱스를 막지 않도록)
UPDATE si_mvp.h_profiles
SET phone = NULL
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+82%';

-- 3) 빈 문자열도 NULL로 통일 (부분 유니크 인덱스가 빈 문자열 중복을 허용하지 않도록)
UPDATE si_mvp.h_profiles SET phone = NULL WHERE phone = '';

-- 4) 같은 번호로 두 프로필이 생기지 않도록 보장.
--    auth.users.phone에는 이미 users_phone_key 유니크 인덱스가 있고, 이건 프로필 쪽 방어선이다.
CREATE UNIQUE INDEX IF NOT EXISTS h_idx_profiles_phone_unique
  ON si_mvp.h_profiles (phone)
  WHERE phone IS NOT NULL;
```

- [ ] **Step 2: 적용 전 영향 확인**

```bash
bun --env-file=.env.local -e '
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require" });
const rows = await sql`select phone from si_mvp.h_profiles where phone is not null and phone <> ${""}`;
console.log("변환 대상:", rows.length, "건");
for (const r of rows) console.log("  ", String(r.phone).replace(/\d/g, "N"));
await sql.end();
'
```

Expected: `변환 대상: 1 건` 과 `NNNNNNNNNNN`

- [ ] **Step 3: 마이그레이션 적용**

```bash
bunx supabase db push
```

- [ ] **Step 4: 결과 검증**

```bash
bun --env-file=.env.local -e '
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require" });
const rows = await sql`select phone from si_mvp.h_profiles where phone is not null`;
console.log("E.164 형식:", rows.every(r => String(r.phone).startsWith("+82")));
const idx = await sql`select indexname from pg_indexes where schemaname=${"si_mvp"} and indexname=${"h_idx_profiles_phone_unique"}`;
console.log("유니크 인덱스 생성됨:", idx.length === 1);
await sql.end();
'
```

Expected: 둘 다 `true`

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260720100000_phone_auth.sql
git commit -m "feat(db): normalize profile phone to E.164 with unique index"
```

---

## Task 5: OTP 오류 메시지 매핑

**Files:**
- Modify: `src/lib/auth-errors.ts`
- Modify: `src/lib/auth-errors.test.ts`

**Interfaces:**
- Produces:
  - `type OtpFailureReason = "invalid_phone" | "send_limit" | "resend_wait" | "code_mismatch" | "code_expired" | "fail_limit" | "unknown"`
  - `otpFailureMessage(reason: OtpFailureReason, params?: { retryAfterSec?: number }): string`
  - `classifyOtpError(error: { code?: string; status?: number; message?: string }): OtpFailureReason`
- 유지: `isAuthRejection` (서버 `requireUser()`가 계속 쓴다)
- 유지: `LoginFailureReason`, `loginFailureMessage`, `classifyLoginError` — **이 태스크에서 제거하지 않는다.** 아직 `login/email` 페이지가 쓰고 있어서 지우면 빌드가 깨진다. Task 11이 해당 페이지와 함께 제거한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth-errors.test.ts`에서 **이메일 관련 블록(`classifyLoginError`, `loginFailureMessage`)은 그대로 두고**, 아래 내용을 추가한다. import 줄에 `classifyOtpError`, `otpFailureMessage`를 더한다.

```ts
import { describe, expect, test } from "bun:test";
import {
  classifyLoginError,
  classifyOtpError,
  isAuthRejection,
  loginFailureMessage,
  otpFailureMessage,
} from "./auth-errors";

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
    expect(isAuthRejection({})).toBe(false);
    expect(isAuthRejection({ status: 0 })).toBe(false);
  });

  test("오류가 없으면 거부가 아니다", () => {
    expect(isAuthRejection(null)).toBe(false);
  });
});

describe("classifyOtpError", () => {
  test("만료된 인증번호", () => {
    expect(classifyOtpError({ code: "otp_expired", status: 403 })).toBe("code_expired");
    expect(classifyOtpError({ message: "Token has expired or is invalid" })).toBe("code_expired");
  });

  test("인증번호 불일치", () => {
    expect(classifyOtpError({ code: "otp_disabled" })).toBe("code_mismatch");
    expect(classifyOtpError({ message: "Invalid token" })).toBe("code_mismatch");
  });

  test("Supabase 자체 발송 한도", () => {
    expect(classifyOtpError({ status: 429 })).toBe("send_limit");
    expect(classifyOtpError({ code: "over_sms_send_rate_limit" })).toBe("send_limit");
  });

  test("모르는 오류는 unknown", () => {
    expect(classifyOtpError({ message: "some new upstream failure" })).toBe("unknown");
    expect(classifyOtpError({})).toBe("unknown");
  });
});

describe("otpFailureMessage", () => {
  test("모든 사유가 한국어 안내를 가진다", () => {
    const reasons = [
      "invalid_phone",
      "send_limit",
      "resend_wait",
      "code_mismatch",
      "code_expired",
      "fail_limit",
      "unknown",
    ] as const;
    for (const reason of reasons) {
      const message = otpFailureMessage(reason);
      expect(message.length).toBeGreaterThan(0);
      // 영문 원문이 새어나오지 않아야 함
      expect(message).not.toMatch(/[a-z]{4,}/i);
    }
  });

  test("재발송 대기는 남은 초를 문구에 넣는다", () => {
    expect(otpFailureMessage("resend_wait", { retryAfterSec: 17 })).toContain("17");
  });

  test("남은 초를 모르면 숫자 없이 안내", () => {
    expect(otpFailureMessage("resend_wait")).toContain("잠시");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `bun test src/lib/auth-errors.test.ts`
Expected: FAIL — `classifyOtpError is not a function`

- [ ] **Step 3: 구현**

`src/lib/auth-errors.ts`의 **기존 내용은 그대로 두고** 아래를 파일 상단(기존 `LoginFailureReason` 선언 앞)에 추가한다. 기존 `LoginFailureReason`/`loginFailureMessage`/`classifyLoginError`/`isAuthRejection`은 건드리지 않는다 — Task 11에서 제거한다.

```ts
// SMS 인증 실패 사유 → 시니어 사용자용 한국어 안내.
// Supabase가 돌려주는 영문 메시지를 그대로 노출하지 않기 위한 단일 매핑 지점.

export type OtpFailureReason =
  | "invalid_phone"
  | "send_limit"
  | "resend_wait"
  | "code_mismatch"
  | "code_expired"
  | "fail_limit"
  | "unknown";

const MESSAGES: Record<OtpFailureReason, string> = {
  invalid_phone: "휴대폰 번호를 다시 확인해주세요. 010으로 시작하는 번호만 가능해요.",
  send_limit: "오늘 받을 수 있는 횟수를 모두 사용했어요. 내일 다시 시도해주세요.",
  resend_wait: "잠시 후에 다시 받을 수 있어요.",
  code_mismatch: "인증번호가 맞지 않아요. 다시 확인해주세요.",
  code_expired: "인증번호 유효시간이 지났어요. 다시 받아주세요.",
  fail_limit: "여러 번 틀렸어요. 인증번호를 다시 받아주세요.",
  unknown: "잠시 후 다시 시도해주세요.",
};

export function otpFailureMessage(
  reason: OtpFailureReason,
  params?: { retryAfterSec?: number }
): string {
  if (reason === "resend_wait" && typeof params?.retryAfterSec === "number") {
    return `${params.retryAfterSec}초 후에 다시 받을 수 있어요.`;
  }
  return MESSAGES[reason];
}

// Supabase AuthError는 code가 없는 응답도 있어 message 폴백을 함께 본다.
export function classifyOtpError(error: {
  code?: string;
  status?: number;
  message?: string;
}): OtpFailureReason {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "otp_expired" || message.includes("expired")) return "code_expired";
  if (
    code === "over_sms_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    error.status === 429 ||
    message.includes("rate limit")
  ) {
    return "send_limit";
  }
  if (code === "otp_disabled" || message.includes("invalid token") || message.includes("invalid")) {
    return "code_mismatch";
  }
  return "unknown";
}

```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/auth-errors.test.ts`
Expected: PASS — 기존 이메일 테스트와 새 OTP 테스트가 모두 통과한다.

`classifyOtpError` 순서에 주의한다. `expired`를 `invalid`보다 먼저 검사해야 "Token has expired or is invalid"가 `code_expired`로 분류된다.

- [ ] **Step 5: 타입 확인 후 커밋**

이메일 함수를 남겨뒀으므로 이 시점에도 빌드가 깨지지 않는다.

```bash
bunx tsc --noEmit
git add src/lib/auth-errors.ts src/lib/auth-errors.test.ts
git commit -m "feat(auth): add OTP failure message mapping"
```

---

## Task 6: Send SMS Hook 엔드포인트

Supabase가 OTP를 만든 뒤 이 엔드포인트를 호출한다. 서명을 검증하고 발송 어댑터로 넘긴다.

**Files:**
- Create: `src/app/api/auth/sms-hook/route.ts`
- Test: `src/lib/webhook-signature.ts` + `src/lib/webhook-signature.test.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `getSmsSender()` (Task 3)
- Produces: `verifyStandardWebhook(input): boolean`

- [ ] **Step 1: 서명 검증 테스트 작성**

`src/lib/webhook-signature.test.ts`:

```ts
import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
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
    const signature = sign("v1,whsec_b3RoZXJzZWNyZXRrZXlmb3JoYXJtb255MTIzNDU2", ID, TIMESTAMP, PAYLOAD);
    expect(
      verifyStandardWebhook({ secret: SECRET, id: ID, timestamp: TIMESTAMP, payload: PAYLOAD, signature })
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
      verifyStandardWebhook({ secret: "", id: ID, timestamp: TIMESTAMP, payload: PAYLOAD, signature: "v1,x" })
    ).toBe(false);
    expect(
      verifyStandardWebhook({ secret: SECRET, id: "", timestamp: "", payload: "", signature: "" })
    ).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `bun test src/lib/webhook-signature.test.ts`
Expected: FAIL — `Cannot find module './webhook-signature'`

- [ ] **Step 3: 서명 검증 구현**

`src/lib/webhook-signature.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/webhook-signature.test.ts`
Expected: PASS (5개)

- [ ] **Step 5: 훅 라우트 구현**

`src/app/api/auth/sms-hook/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, serverError, successResponse } from "@/lib/api-response";
import { getSmsSender } from "@/lib/sms";
import { verifyStandardWebhook } from "@/lib/webhook-signature";

const HookPayloadSchema = z.object({
  user: z.object({ phone: z.string().min(1) }),
  sms: z.object({ otp: z.string().min(1) }),
});

// POST /api/auth/sms-hook — Supabase Send SMS Hook.
// Supabase가 OTP를 생성한 뒤 이 엔드포인트를 호출하고, 우리는 발송만 담당한다.
// 인증 없이 외부에서 호출되므로 서명 검증이 유일한 방어선이다.
export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_SMS_HOOK_SECRET;
  if (!secret) {
    console.error("[sms-hook] SUPABASE_SMS_HOOK_SECRET is not set");
    return serverError();
  }

  const raw = await request.text();
  const valid = verifyStandardWebhook({
    secret,
    id: request.headers.get("webhook-id") ?? "",
    timestamp: request.headers.get("webhook-timestamp") ?? "",
    signature: request.headers.get("webhook-signature") ?? "",
    payload: raw,
  });
  if (!valid) {
    console.error("[sms-hook] signature verification failed");
    return errorResponse("UNAUTHORIZED", "서명이 올바르지 않습니다", 401);
  }

  const parsed = HookPayloadSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("[sms-hook] unexpected payload shape");
    return errorResponse("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다", 400);
  }

  try {
    const { phone } = parsed.data.user;
    const { otp } = parsed.data.sms;
    await getSmsSender().send(phone, `[하모니] 인증번호 ${otp}를 입력해주세요. (3분 이내)`);
    return successResponse({ ok: true });
  } catch (err) {
    // 실패를 200으로 감추면 Supabase가 재시도하지 않는다 — 500으로 알린다.
    console.error("[sms-hook] send failed", err);
    return serverError();
  }
}
```

- [ ] **Step 6: proxy 공개 경로에 추가**

`src/proxy.ts`의 `publicPaths` 배열에서 `"/api/auth"` 항목이 이미 접두사로 매칭하므로 별도 추가는 필요 없다. 확인만 한다.

Run: `grep -n '"/api/auth"' src/proxy.ts`
Expected: 해당 줄이 출력되면 그대로 둔다. 없으면 `"/api/auth",`를 배열에 추가한다.

- [ ] **Step 7: 커밋**

```bash
bunx tsc --noEmit
git add src/lib/webhook-signature.ts src/lib/webhook-signature.test.ts src/app/api/auth/sms-hook/
git commit -m "feat(auth): add Send SMS hook endpoint with signature verification"
```

---

## Task 7: 인증번호 발송 API

**Files:**
- Create: `src/app/api/auth/phone/send/route.ts`

**Interfaces:**
- Consumes: `toE164KR` (Task 1), `decideSend`/상수 (Task 2), `otpFailureMessage` (Task 5)
- Produces: `POST /api/auth/phone/send` — 요청 `{ phone: string }`, 성공 `{ sent: true }`

- [ ] **Step 1: 구현**

`src/app/api/auth/phone/send/route.ts`:

```ts
import { createHmac } from "node:crypto";
import { and, count, desc, eq, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { otpFailureMessage } from "@/lib/auth-errors";
import { toE164KR } from "@/lib/auth-utils";
import { POLICY_WINDOW_MS, decideSend } from "@/lib/otp-policy";
import { createClient } from "@/lib/supabase/server";

const SendSchema = z.object({ phone: z.string().min(1) });

function clientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// 번호를 원문으로 저장하지 않는다 — 저엔트로피 입력이라 서버 시크릿 HMAC을 쓴다 (find-id와 동일).
function phoneKey(e164: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "harmony-dev-secret";
  return createHmac("sha256", secret).update(`otp:${e164}`).digest("hex").slice(0, 32);
}

async function countSince(key: string, action: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.ip, key),
        eq(authAttempts.action, action),
        gte(authAttempts.createdAt, since)
      )
    );
  return row?.value ?? 0;
}

// POST /api/auth/phone/send — 인증번호 발송.
// 정책은 Supabase 호출 앞단에서 강제한다. Supabase 내장 제한은 번호/IP 차원으로 나뉘지 않는다.
export async function POST(request: NextRequest) {
  const parsed = SendSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(otpFailureMessage("invalid_phone"));
  }

  const e164 = toE164KR(parsed.data.phone);
  if (!e164) {
    return validationError(otpFailureMessage("invalid_phone"));
  }

  try {
    const ip = clientIp(request);
    const key = phoneKey(e164);
    const since = new Date(Date.now() - POLICY_WINDOW_MS);

    const [sentTodayForPhone, sentTodayForIp, lastRow] = await Promise.all([
      countSince(key, "otp_send_target", since),
      countSince(ip, "otp_send", since),
      db
        .select({ createdAt: authAttempts.createdAt })
        .from(authAttempts)
        .where(and(eq(authAttempts.ip, key), eq(authAttempts.action, "otp_send_target")))
        .orderBy(desc(authAttempts.createdAt))
        .limit(1),
    ]);

    const decision = decideSend({
      now: Date.now(),
      lastSentAt: lastRow[0]?.createdAt ? new Date(lastRow[0].createdAt).getTime() : null,
      sentTodayForPhone,
      sentTodayForIp,
    });

    if (!decision.allowed) {
      const message =
        decision.reason === "resend_wait"
          ? otpFailureMessage("resend_wait", { retryAfterSec: decision.retryAfterSec })
          : otpFailureMessage("send_limit");
      return errorResponse(decision.reason.toUpperCase(), message, 429);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: true },
    });
    if (error) {
      console.error("[auth/phone/send] signInWithOtp failed", error.status, error.message);
      return errorResponse("SEND_FAILED", otpFailureMessage("unknown"), 502);
    }

    // 발송에 성공했을 때만 카운터를 올린다. 실패한 발송을 한도에 포함시키지 않는다.
    await db.insert(authAttempts).values([
      { ip: key, action: "otp_send_target" },
      { ip, action: "otp_send" },
    ]);
    // 새 인증번호를 받았으므로 이전 실패 기록을 초기화한다.
    await db
      .delete(authAttempts)
      .where(and(eq(authAttempts.ip, key), eq(authAttempts.action, "otp_fail_target")));

    return successResponse({ sent: true });
  } catch (err) {
    console.error("[auth/phone/send]", err);
    return serverError();
  }
}
```

한도 상수는 `decideSend` 내부에서만 쓰이므로 이 파일에서 import하지 않는다. 라우트는 판정 결과만 해석한다.

- [ ] **Step 2: 콘솔 어댑터로 발송 확인**

```bash
bun run dev
```

다른 터미널에서:

```bash
curl -s -X POST http://localhost:3000/api/auth/phone/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"010-1234-5678"}'
```

Expected: Supabase 대시보드 훅 설정 전이라면 `{"success":false,...,"code":"SEND_FAILED"}`. 이는 정상이며 Task 12에서 훅 설정 후 재검증한다. 형식 오류는 이 단계에서 확인한다:

```bash
curl -s -X POST http://localhost:3000/api/auth/phone/send \
  -H "Content-Type: application/json" -d '{"phone":"011-1234-5678"}'
```

Expected: `"휴대폰 번호를 다시 확인해주세요. 010으로 시작하는 번호만 가능해요."`

- [ ] **Step 3: 커밋**

```bash
bunx tsc --noEmit
git add src/app/api/auth/phone/send/
git commit -m "feat(auth): add phone OTP send endpoint with rate limits"
```

---

## Task 8: 인증번호 검증 API

**Files:**
- Create: `src/app/api/auth/phone/verify/route.ts`

**Interfaces:**
- Consumes: `toE164KR` (Task 1), `decideVerify`/`POLICY_WINDOW_MS` (Task 2), `otpFailureMessage`/`classifyOtpError` (Task 5)
- Produces: `POST /api/auth/phone/verify` — 요청 `{ phone: string; code: string }`, 성공 `{ isNewUser: boolean }`

- [ ] **Step 1: 구현**

`src/app/api/auth/phone/verify/route.ts`:

```ts
import { createHmac } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts, profiles } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { classifyOtpError, otpFailureMessage } from "@/lib/auth-errors";
import { toE164KR } from "@/lib/auth-utils";
import { POLICY_WINDOW_MS, decideVerify } from "@/lib/otp-policy";
import { createClient } from "@/lib/supabase/server";

const VerifySchema = z.object({
  phone: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "인증번호는 숫자 6자리예요"),
});

function phoneKey(e164: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "harmony-dev-secret";
  return createHmac("sha256", secret).update(`otp:${e164}`).digest("hex").slice(0, 32);
}

// POST /api/auth/phone/verify — 인증번호 확인 후 세션 발급.
// verifyOtp가 성공하면 Supabase가 세션 쿠키를 심는다 (server client의 setAll 어댑터).
export async function POST(request: NextRequest) {
  const parsed = VerifySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? otpFailureMessage("code_mismatch"));
  }

  const e164 = toE164KR(parsed.data.phone);
  if (!e164) {
    return validationError(otpFailureMessage("invalid_phone"));
  }

  try {
    const key = phoneKey(e164);
    const since = new Date(Date.now() - POLICY_WINDOW_MS);

    const [failRow] = await db
      .select({ value: count() })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.ip, key),
          eq(authAttempts.action, "otp_fail_target"),
          gte(authAttempts.createdAt, since)
        )
      );

    const gate = decideVerify({ recentFails: failRow?.value ?? 0 });
    if (!gate.allowed) {
      return errorResponse("FAIL_LIMIT", otpFailureMessage("fail_limit"), 429);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: parsed.data.code,
      type: "sms",
    });

    if (error || !data.session || !data.user) {
      await db.insert(authAttempts).values({ ip: key, action: "otp_fail_target" });
      const reason = error ? classifyOtpError(error) : "code_mismatch";
      return errorResponse(reason.toUpperCase(), otpFailureMessage(reason), 400);
    }

    // 성공 — 실패 기록 정리
    await db
      .delete(authAttempts)
      .where(and(eq(authAttempts.ip, key), eq(authAttempts.action, "otp_fail_target")));

    // 프로필 유무로 신규 여부를 판단한다. 온보딩을 중단했던 사용자도 신규로 취급해
    // 다시 온보딩을 마치게 한다 (/mypage가 이미 같은 기준으로 동작한다).
    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, data.user.id))
      .limit(1);

    return successResponse({ isNewUser: !profile });
  } catch (err) {
    console.error("[auth/phone/verify]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 형식 검증 확인**

```bash
bun run dev
```

```bash
curl -s -X POST http://localhost:3000/api/auth/phone/verify \
  -H "Content-Type: application/json" -d '{"phone":"010-1234-5678","code":"12ab"}'
```

Expected: `"인증번호는 숫자 6자리예요"`

- [ ] **Step 3: 커밋**

```bash
bunx tsc --noEmit
git add src/app/api/auth/phone/verify/
git commit -m "feat(auth): add phone OTP verify endpoint issuing session"
```

---

## Task 9: 로그인 화면 전환

가입과 로그인을 한 화면으로 합친다. 번호 입력 → 인증번호 입력 두 단계를 같은 페이지에서 처리한다.

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/phone/send` (Task 7), `POST /api/auth/phone/verify` (Task 8), `formatPhoneInput` (기존), `KEEP_SIGNIN_COOKIE` (기존)

- [ ] **Step 1: 페이지 전체 교체**

`src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { ArrowLeft, ChatCircle, DeviceMobile, Hand, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneInput } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";
import { KEEP_SIGNIN_COOKIE } from "@/lib/supabase/cookie-policy";

type Stage = "phone" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // 인증 전에 유지 정책 쿠키를 기록해 두면 이후 발급되는 auth 쿠키에 적용된다.
  function markKeepSignedIn() {
    // biome-ignore lint/suspicious/noDocumentCookie: 인증 전에 유지 정책 쿠키를 동기적으로 선기록해야 함
    document.cookie = `${KEEP_SIGNIN_COOKIE}=1; Max-Age=31536000; Path=/`;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      markKeepSignedIn();
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      setCode("");
      setStage("code");
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      router.push(json.data?.isNewUser ? "/onboarding" : "/");
      router.refresh();
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 번호를 바꾸면 이전 인증 상태를 버린다.
  function backToPhone() {
    setStage("phone");
    setCode("");
    setError("");
  }

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setError("");
    setKakaoLoading(true);
    try {
      markKeepSignedIn();
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding` },
      });
      if (error) {
        console.error("Failed to start Kakao OAuth", error);
        setError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Failed to start Kakao OAuth", error);
      setError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setKakaoLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Greeting
          icon={<Hand size={32} weight="duotone" />}
          title="다시 만나서 반가워요"
          subtitle={
            stage === "phone"
              ? "휴대폰 번호로 시작해보세요"
              : "문자로 받은 인증번호를 입력해주세요"
          }
          className="mb-7"
        />

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
          >
            <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
            <span className="pt-0.5">{error}</span>
          </div>
        )}

        {stage === "phone" ? (
          <>
            <Button
              variant="kakao"
              className="mb-6 w-full animate-fade-up text-lg font-extrabold"
              size="lg"
              type="button"
              onClick={handleKakaoLogin}
              disabled={kakaoLoading}
            >
              <ChatCircle size={28} weight="fill" />
              {kakaoLoading ? "카카오로 연결 중..." : "카카오로 로그인하기"}
            </Button>

            <p className="mb-6 rounded-2xl bg-cream-100 p-4 text-base leading-relaxed text-mocha-700">
              이전에 카카오로 시작하셨다면 위의 카카오 버튼을 눌러주세요.
            </p>

            <div className="mb-6 flex items-center gap-3 text-mocha-500" aria-hidden="true">
              <hr className="flex-1 border-mocha-200" />
              <span className="text-sm">또는 휴대폰 번호로</span>
              <hr className="flex-1 border-mocha-200" />
            </div>

            <form className="space-y-6" onSubmit={handleSend} noValidate>
              <div className="space-y-2">
                <Label htmlFor="phone">휴대폰 번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  autoComplete="tel"
                  maxLength={13}
                  required
                  leadingIcon={<DeviceMobile size={26} weight="duotone" />}
                />
              </div>
              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading ? "보내는 중이에요..." : "인증번호 받기"}
              </Button>
            </form>
          </>
        ) : (
          <form className="space-y-6" onSubmit={handleVerify} noValidate>
            <button
              type="button"
              onClick={backToPhone}
              className="inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
            >
              <ArrowLeft size={20} />
              번호 다시 입력하기
            </button>

            <p className="text-lg text-mocha-800">
              <span className="font-bold">{phone}</span> 으로 보냈어요
            </p>

            <div className="space-y-2">
              <Label htmlFor="code">인증번호 6자리</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="text-center text-2xl tracking-[0.4em]"
              />
            </div>

            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "확인 중이에요..." : "확인"}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              type="button"
              onClick={handleSend}
              disabled={loading}
            >
              인증번호 다시 받기
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 화면 확인**

```bash
bun run dev
```

`http://localhost:3000/login`에서 확인한다.

Expected: 카카오 버튼, 안내 문구, 휴대폰 번호 입력 폼이 보인다. 번호 입력 시 하이픈이 자동으로 들어간다.

- [ ] **Step 3: 커밋**

```bash
bunx tsc --noEmit
git add "src/app/(auth)/login/page.tsx"
git commit -m "feat(auth): replace login screen with phone OTP flow"
```

---

## Task 10: 온보딩 약관 동의 단계

신규 사용자에게만 약관 동의를 받는다. 카카오 가입자의 동의 누락도 함께 해결된다.

**Files:**
- Create: `src/components/onboarding/StepConsent.tsx`
- Modify: `src/app/(auth)/onboarding/page.tsx`
- Modify: `src/app/api/onboarding/complete/route.ts`

**Interfaces:**
- Produces: `StepConsent` 컴포넌트 — props `{ agreeTerms: boolean; agreePrivacy: boolean; onChange(next: { agreeTerms: boolean; agreePrivacy: boolean }): void; onNext(): void }`
- Modifies: `/api/onboarding/complete` 요청 본문에 `agreeTerms: true`, `agreePrivacy: true` 추가

- [ ] **Step 1: 동의 단계 컴포넌트 작성**

`src/components/onboarding/StepConsent.tsx`:

```tsx
"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const CHECKBOX_BRAND =
  "data-[state=checked]:border-coral-500 data-[state=checked]:bg-coral-500 focus-visible:ring-coral-200";

interface StepConsentProps {
  agreeTerms: boolean;
  agreePrivacy: boolean;
  onChange: (next: { agreeTerms: boolean; agreePrivacy: boolean }) => void;
  onNext: () => void;
}

export function StepConsent({ agreeTerms, agreePrivacy, onChange, onNext }: StepConsentProps) {
  const allAgreed = agreeTerms && agreePrivacy;

  return (
    <div className="space-y-7">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral-50">
          <ShieldCheck size={32} weight="duotone" className="text-coral-600" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-mocha-900">약관에 동의해주세요</h2>
        <p className="mt-2 text-lg leading-relaxed text-mocha-700">
          하모니를 이용하려면 아래 약관에 동의가 필요해요
        </p>
      </div>

      <div className="rounded-2xl border border-mocha-200 bg-white p-4">
        <label
          htmlFor="agree-all"
          className="flex items-center gap-3 border-b border-mocha-100 pb-3 text-lg font-extrabold text-mocha-900"
        >
          <Checkbox
            id="agree-all"
            checked={allAgreed}
            onCheckedChange={(v) => onChange({ agreeTerms: v === true, agreePrivacy: v === true })}
            className={CHECKBOX_BRAND}
          />
          전체 약관 동의
        </label>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="agree-terms"
              checked={agreeTerms}
              onCheckedChange={(v) => onChange({ agreeTerms: v === true, agreePrivacy })}
              className={CHECKBOX_BRAND}
            />
            <label htmlFor="agree-terms" className="flex-1 text-base text-mocha-800">
              이용약관 동의 (필수)
            </label>
            <Link
              href="/terms"
              className="text-sm font-bold text-coral-700 underline underline-offset-2"
            >
              보기
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="agree-privacy"
              checked={agreePrivacy}
              onCheckedChange={(v) => onChange({ agreeTerms, agreePrivacy: v === true })}
              className={CHECKBOX_BRAND}
            />
            <label htmlFor="agree-privacy" className="flex-1 text-base text-mocha-800">
              개인정보 처리방침 동의 (필수)
            </label>
            <Link
              href="/privacy"
              className="text-sm font-bold text-coral-700 underline underline-offset-2"
            >
              보기
            </Link>
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg" type="button" onClick={onNext} disabled={!allAgreed}>
        동의하고 시작하기
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 온보딩 페이지에 단계 추가**

`src/app/(auth)/onboarding/page.tsx`를 다음과 같이 수정한다.

import에 추가:

```ts
import { StepConsent } from "@/components/onboarding/StepConsent";
```

타입과 단계 배열 교체:

```ts
type OnboardingStep = "consent" | "font" | "nickname" | "region" | "hobby" | "photo";
```

```ts
const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "consent", label: "약관 동의" },
  { id: "font", label: "글자 선택" },
  { id: "nickname", label: "이름 선택" },
  { id: "region", label: "지역 선택" },
  { id: "hobby", label: "취미 선택" },
  { id: "photo", label: "사진 선택" },
];
```

`SavedProgress` 인터페이스에 추가:

```ts
  agreeTerms?: boolean;
  agreePrivacy?: boolean;
```

컴포넌트 상태에 추가 (다른 `useState` 옆):

```ts
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
```

`handleComplete`의 `fetch` 본문(`body: JSON.stringify({...})`)에 두 필드를 추가한다:

```ts
          agreeTerms,
          agreePrivacy,
```

단계 렌더링 부분에서 `font` 단계 렌더링 **앞에** 추가한다:

```tsx
            {step === "consent" && (
              <StepConsent
                agreeTerms={agreeTerms}
                agreePrivacy={agreePrivacy}
                onChange={(next) => {
                  setAgreeTerms(next.agreeTerms);
                  setAgreePrivacy(next.agreePrivacy);
                }}
                onNext={() => setStep("font")}
              />
            )}
```

초기 단계가 `"font"`로 하드코딩된 곳이 있으면 `"consent"`로 바꾼다. `readProgress()`로 복원하는 경로는 그대로 둔다.

- [ ] **Step 3: complete API에 동의 기록 추가**

`src/app/api/onboarding/complete/route.ts`를 수정한다.

import에 추가:

```ts
import { hobbies, profiles, userConsents, userHobbies, verificationBadges } from "@/db/schema";
import { CONSENT_VERSION } from "@/lib/auth-utils";
```

`CompleteOnboardingSchema`에 추가:

```ts
  agreeTerms: z.literal(true, "이용약관 동의가 필요해요"),
  agreePrivacy: z.literal(true, "개인정보 처리방침 동의가 필요해요"),
```

`db.transaction` 안에서 프로필 upsert에 전화번호를 함께 넣는다. `profileValues` 선언을 다음으로 바꾼다:

```ts
      const profileValues = {
        nickname,
        region,
        sido,
        sigungu,
        fontScale,
        prefersVoiceGuide,
        // auth.users.phone이 정본이다. 프로필은 가입 시점에 복사만 한다.
        ...(user.phone ? { phone: `+${user.phone.replace(/^\+/, "")}` } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      };
```

`verificationBadges` insert **뒤에** 동의 기록을 추가한다:

```ts
      // 온보딩을 다시 완료해도 동의가 중복 적재되지 않도록 기존 버전 기록을 정리한다.
      await tx.delete(userConsents).where(eq(userConsents.userId, user.id));
      await tx.insert(userConsents).values([
        { userId: user.id, consentType: "terms", version: CONSENT_VERSION },
        { userId: user.id, consentType: "privacy", version: CONSENT_VERSION },
      ]);
```

- [ ] **Step 4: 온보딩 화면 확인**

```bash
bun run dev
```

`http://localhost:3000/onboarding` 접근 시 약관 동의가 첫 단계로 보이고, 두 항목을 모두 체크해야 다음 버튼이 활성화된다.

- [ ] **Step 5: 커밋**

```bash
bunx tsc --noEmit
git add src/components/onboarding/StepConsent.tsx "src/app/(auth)/onboarding/page.tsx" src/app/api/onboarding/complete/route.ts
git commit -m "feat(onboarding): add consent step and record consents for all signup paths"
```

---

## Task 11: 이메일 인증 경로 제거

**Files:**
- Delete: `src/app/(auth)/login/email/`, `src/app/(auth)/register/`, `src/app/(auth)/find-id/`, `src/app/(auth)/find-password/`, `src/app/(auth)/reset-password/`
- Delete: `src/app/api/auth/signup/`, `src/app/api/auth/find-id/`, `src/app/api/auth/login-hint/`
- Modify: `src/lib/auth-utils.ts`, `src/lib/auth-utils.test.ts`, `src/proxy.ts`, `src/app/(main)/mypage/settings/page.tsx`

- [ ] **Step 1: 화면과 API 삭제**

```bash
git rm -r "src/app/(auth)/login/email" "src/app/(auth)/register" "src/app/(auth)/find-id" "src/app/(auth)/find-password" "src/app/(auth)/reset-password"
git rm -r src/app/api/auth/signup src/app/api/auth/find-id src/app/api/auth/login-hint
```

- [ ] **Step 2: 미사용 유틸 제거**

`src/lib/auth-utils.ts`에서 `normalizeEmail`과 `maskEmail` 함수를 삭제한다. `src/lib/auth-utils.test.ts`에서 두 함수의 `describe` 블록과 import를 삭제한다.

`src/lib/auth-errors.ts`에서 이메일 전용 항목을 삭제한다 (Task 5에서 남겨둔 것들).

- `LoginFailureReason` 타입
- `loginFailureMessage` 함수와 그 `MESSAGES` 상수
- `classifyLoginError` 함수

`otpFailureMessage`, `classifyOtpError`, `isAuthRejection`은 남긴다. `src/lib/auth-errors.test.ts`에서도 `classifyLoginError`/`loginFailureMessage` `describe` 블록과 import를 삭제한다.

- [ ] **Step 3: 남은 참조 확인**

```bash
grep -rn "normalizeEmail\|maskEmail\|loginFailureMessage\|classifyLoginError\|login-hint\|/register\|/find-id\|/find-password\|/reset-password\|/login/email" src/ || echo "남은 참조 없음"
```

출력된 참조를 모두 정리한다. 예상되는 곳:
- `src/proxy.ts`의 `publicPaths` — `/register`, `/find-id`, `/find-password`, `/reset-password` 항목 제거
- `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` — `href="/register"`를 `href="/login"`으로 변경

- [ ] **Step 4: 설정 화면의 비밀번호 변경 메뉴 제거**

`src/app/(main)/mypage/settings/page.tsx`에서 다음 줄을 삭제한다.

```ts
  { label: "비밀번호 변경", icon: Lock, href: "#" },
```

`Lock` import가 다른 곳에서 쓰이지 않으면 함께 제거한다.

- [ ] **Step 5: 타입·테스트·빌드 확인**

```bash
bunx tsc --noEmit
bun test src/lib/
bun run build
```

Expected: 셋 다 통과. 빌드 라우트 목록에서 `/register`, `/login/email`, `/find-id`, `/find-password`, `/reset-password`가 사라진다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "refactor(auth): remove email login, signup, and password recovery paths"
```

---

## Task 12: 전체 흐름 검증

세션 관련 동작은 dev 서버에서 재현되지 않는 전례가 있으므로 프로덕션 빌드로 확인한다.

**Files:** 없음 (검증)

- [ ] **Step 1: Supabase 대시보드 설정**

1. Authentication → Providers → Phone 활성화
2. Authentication → Hooks → Send SMS hook 활성화, URL을 배포 주소의 `/api/auth/sms-hook`으로 등록
3. 발급된 시크릿을 `.env.local`의 `SUPABASE_SMS_HOOK_SECRET`에 넣는다
4. Authentication → Providers → Phone → SMS OTP Expiry를 `180`(초)으로 설정

로컬에서 훅을 받으려면 터널이 필요하다. 로컬 검증만 할 경우 Supabase 대시보드의 훅 URL을 터널 주소로 임시 지정한다.

- [ ] **Step 2: 프로덕션 빌드 실행**

```bash
bun run build && bun run start
```

- [ ] **Step 3: 신규 가입 흐름 확인**

브라우저에서 `http://localhost:3000/login` 접속 후:
1. 휴대폰 번호 입력 → 인증번호 받기
2. 서버 로그에서 `[sms:console] to=+8210... text=[하모니] 인증번호 NNNNNN...` 확인
3. 해당 번호 입력 → 확인
4. `/onboarding`으로 이동하는지 확인
5. 약관 동의 → 나머지 단계 완료 → 홈(`/`) 도달 확인

- [ ] **Step 4: 기존 사용자 로그인 확인**

로그아웃 후 같은 번호로 다시 인증한다.

Expected: 온보딩을 건너뛰고 홈(`/`)으로 바로 이동한다.

- [ ] **Step 5: 중복 가입 방지 확인**

```bash
bun --env-file=.env.local -e '
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require" });
const rows = await sql`select phone, count(*)::int as n from auth.users where phone is not null group by phone having count(*) > 1`;
console.log("중복 번호:", rows.length === 0 ? "없음" : rows);
const p = await sql`select phone, count(*)::int as n from si_mvp.h_profiles where phone is not null group by phone having count(*) > 1`;
console.log("중복 프로필 번호:", p.length === 0 ? "없음" : p);
await sql.end();
'
```

Expected: 둘 다 `없음`

- [ ] **Step 6: 정책 동작 확인**

- 인증번호를 5회 틀린다 → "여러 번 틀렸어요. 인증번호를 다시 받아주세요." 표시
- "인증번호 다시 받기"를 누른다 → 실패 카운터가 초기화되어 정상 검증 가능
- 발송 직후 다시 발송을 누른다 → "N초 후에 다시 받을 수 있어요." 표시
- 같은 번호로 6회 발송을 시도한다 → "오늘 받을 수 있는 횟수를 모두 사용했어요." 표시

카운터 초기화가 필요하면:

```bash
bun --env-file=.env.local -e '
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require" });
const r = await sql`delete from si_mvp.h_auth_attempts where action like ${"otp_%"}`;
console.log("정리:", r.count);
await sql.end();
'
```

- [ ] **Step 7: 번호 변경 시 초기화 확인**

인증번호 입력 화면에서 "번호 다시 입력하기"를 누르고 다른 번호를 넣는다.

Expected: 이전 번호의 인증번호로는 검증되지 않는다.

- [ ] **Step 8: 카카오 로그인 회귀 확인**

로그인 화면에서 카카오 버튼으로 로그인한다.

Expected: 기존과 동일하게 동작하고, 신규 카카오 사용자는 온보딩에서 약관 동의를 거친다.

- [ ] **Step 9: 세션 유지 회귀 확인**

로그인 상태에서 홈 → 클럽 → 정보 → 채팅 → 내정보 탭을 순회하고, 새로고침과 뒤로가기·앞으로가기를 한다.

Expected: 세션이 유지된다. (2026-07-20에 고친 프리페치 로그아웃 버그의 회귀 확인)

- [ ] **Step 10: 테스트 계정 정리 후 커밋**

```bash
bun --env-file=.env.local -e '
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require" });
const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
for (const u of data.users) {
  if (!u.phone) continue;
  console.log("전화번호 계정:", u.phone.replace(/\d(?=\d{4})/g, "*"), u.id);
}
await sql.end();
'
```

검증용으로 만든 계정을 정리한 뒤 커밋한다.

```bash
git add -A
git commit -m "test: verify phone auth end-to-end on production build"
```

---

## Self-Review 결과

**스펙 커버리지 확인**

| 스펙 요구사항 | 담당 태스크 |
|---|---|
| Send SMS Hook 방식 | Task 6 |
| 화면 흐름 (번호 → 인증번호 → 온보딩/홈) | Task 9 |
| 약관 동의 온보딩 첫 단계 | Task 10 |
| 카카오 계정 분리 안내 문구 | Task 9 |
| `/api/auth/phone/send` | Task 7 |
| `/api/auth/phone/verify` | Task 8 |
| `/api/auth/sms-hook` | Task 6 |
| SmsSender 인터페이스 | Task 3 |
| `h_auth_attempts` 정책 저장 | Task 7, 8 |
| E.164 통일 | Task 1, 4, 10 |
| 삭제 대상 | Task 11 |
| OTP 오류 메시지 | Task 5 |
| 단위 테스트 | Task 1, 2, 5, 6 |
| E2E 검증 | Task 12 |
| 배포 전 운영 작업 | Task 0, 12 |
| 완료조건 1~7 | Task 12 |

**타입 일관성**

- `toE164KR`/`formatPhoneDisplay` — Task 1에서 정의, Task 7·8·10에서 사용. 이름 일치.
- `decideSend`/`decideVerify` — Task 2에서 정의, Task 7·8에서 사용. 반환 타입의 `reason` 값(`resend_wait`, `send_limit`, `fail_limit`)이 Task 5의 `OtpFailureReason`에 모두 존재.
- `otpFailureMessage`/`classifyOtpError` — Task 5에서 정의, Task 7·8·9에서 사용.
- `verifyStandardWebhook` — Task 6 내부에서 정의·사용.
- `getSmsSender` — Task 3에서 정의, Task 6에서 사용.
- `StepConsent` props — Task 10 내부에서 정의·사용.

**순서 의존성**

모든 태스크가 독립적으로 검증 가능하도록 구성했다. Task 5는 OTP 함수를 **추가만** 하고 이메일 함수를 남겨두므로, 어느 태스크 종료 시점에도 `bunx tsc --noEmit`과 `bun run build`가 통과한다. 이메일 함수 제거는 그것을 쓰는 페이지가 삭제되는 Task 11에서 함께 이뤄진다.

**Task 0 의존성**

Task 6~12는 Send SMS Hook 가용성에 의존한다. Task 1~5는 아키텍처와 무관하게 필요한 작업(번호 변환, 정책 수치, 발송 인터페이스, DB 형식 통일, 오류 문구)이므로 Task 0 확인 전에도 안전하게 진행할 수 있다.
