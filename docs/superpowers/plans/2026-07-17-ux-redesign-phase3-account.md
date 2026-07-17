# UX 리디자인 Phase 3 (계정 플로우) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시안(login1-3, 아이디/비밀번호 찾기)대로 계정 플로우를 재구성한다 — 로그인 랜딩/이메일 분리, 회원가입 약관+이름/휴대폰 수집, 아이디 찾기, 비밀번호 재설정, 약관 페이지. 첫 태스크는 h_profiles PII 컬럼 grant 축소(보안 게이트).

**Architecture:** 순수 로직(전화번호 정규화/하이픈, 이메일 마스킹, 동의 버전)은 `src/lib/auth-utils.ts`로 분리해 bun test로 고정. 가입은 새 `POST /api/auth/signup` 서버 라우트가 signUp + 프로필 스텁 upsert + 동의 기록을 원자적으로 처리(기존 onboarding/complete의 upsert와 호환). 아이디 찾기는 service-role 클라이언트(신설 `admin.ts`)로 이메일을 조회해 마스킹, `h_auth_attempts`로 IP rate limit. "로그인 상태 유지"는 `harmony-keep-signin` 쿠키를 읽는 공용 쿠키 정책을 client/server/proxy 세 어댑터에 적용.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (@supabase/ssr 0.9, PKCE code exchange 기존 callback 재사용), Drizzle, Zod v4, bun test.

**Spec:** `docs/superpowers/specs/2026-07-17-ux-redesign-captures-design.md` §7 (Phase 3), §9 (보안)

## Global Constraints

- 사용자 노출 문자열 전부 한국어 — **Zod 메시지 포함** (Zod v4 기본 로케일은 영어. 모든 min/max/regex/literal에 한국어 메시지 명시 — Phase 1에서 리뷰로 잡힌 교훈).
- 색상은 브랜드 토큰(coral/cream/mocha/sage)만. 기존 (auth) 레이아웃(BotanicalBackdrop+BrandMark 중앙 카드)이 모든 (auth) 페이지를 감싼다 — 새 페이지도 `Card` 안에 콘텐츠만 작성.
- 타입 체크 `bunx tsc --noEmit` (npx 불가). **`bun run format` 금지** — 변경 파일만 `bunx biome check <파일>`.
- 마이그레이션은 `supabase/migrations/*.sql` + `bun run db:setup`. 스키마 한정(`si_mvp.*`). drizzle-kit 금지.
- 휴대폰은 숫자만 정규화 저장(`01012345678`), 어떤 공개 API 응답에도 미포함. service-role 사용은 `/api/auth/find-id` 서버 내부로 한정.
- 객체 키 검증은 프로토타입 안전하게 (`Object.hasOwn` — `in` 금지).
- **Turbopack은 브랜드-뉴 라우트 파일을 hot-add 못 함** — 새 페이지/라우트 추가 후 dev 서버 재시작 필수 (이 Phase는 신규 라우트가 7개라 반드시 해당).
- 시안 편차(스펙 §10 승인됨): 비밀번호 찾기는 재설정 링크 방식(이름 필드 없음), 로그인 랜딩 히어로 이미지는 에셋 부재 시 생략(오픈 이슈 — public/에 이미지 없음 확인됨), 카카오 가입자는 약관 블록 미적용.
- 커밋 메시지: repo 관례 + 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 작업 브랜치: `feature/ux-redesign-phase3` (main에서 분기). 태스크마다 커밋.
- dev 서버 검증 시 공유 DB에 실계정 생성/행 삽입 금지 (예외: `h_auth_attempts`는 rate-limit 로그 테이블이므로 검증 중 삽입 허용).

---

### Task 1: 보안 게이트 — h_profiles PII 컬럼 grant 축소

**Files:**
- Create: `supabase/migrations/20260717120000_profiles_pii_grant_lockdown.sql`

**Interfaces:**
- Consumes: Phase 0에서 추가된 `h_profiles.name`/`phone` 컬럼 (현재 anon/authenticated에 노출)
- Produces: PostgREST 경유로 name/phone 조회 불가 (서버 Drizzle/service-role은 영향 없음). 이후 태스크들이 이 전제 위에서 phone을 수집.

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- Phase 3 security gate: h_profiles PII(name/phone)를 PostgREST 노출에서 제거.
-- 배경: profiles_select 정책이 USING(true)이고 anon/authenticated에 컬럼 SELECT grant가 있어
-- Phase 3에서 실제 휴대폰 수집을 시작하기 전에 반드시 차단해야 함 (Phase 0-1 최종 리뷰 게이트).
-- 방식: 테이블 grant 전체 회수 후 name/phone을 제외한 컬럼만 명시적으로 재부여 —
-- 기존 grant가 테이블 단위든 컬럼 단위든 결과가 결정적이다.
-- 주의: 이후 h_profiles에 컬럼을 추가하면 anon/authenticated에는 자동 노출되지 않는다(의도됨).

REVOKE SELECT ON si_mvp.h_profiles FROM anon, authenticated;

GRANT SELECT (id, nickname, birth_year, region, sido, sigungu, font_scale,
  prefers_voice_guide, kakao_share_done_at, bio, avatar_url, photo_urls,
  is_verified, subscription_tier, activity_score, created_at, updated_at)
  ON si_mvp.h_profiles TO anon, authenticated;
```

- [ ] **Step 2: 클라이언트 측 h_profiles 조회가 없는지 확인**

Run: `grep -rn "from(\"h_profiles\")\|from('h_profiles')" src/`
Expected: 결과 없음 (앱은 h_profiles를 서버 Drizzle로만 읽음 — supabase-js `.from()` 사용처가 나오면 **중단하고 보고**: 해당 코드는 grant 축소 후 컬럼 제한에 걸릴 수 있음).

- [ ] **Step 3: 적용 및 검증**

Run: `bun run db:setup`
Expected: 마이그레이션 적용 성공. 이후 psql(DATABASE_URL)로:

```sql
SELECT grantee, string_agg(column_name, ',' ORDER BY column_name)
FROM information_schema.column_privileges
WHERE table_schema = 'si_mvp' AND table_name = 'h_profiles' AND privilege_type = 'SELECT'
GROUP BY grantee;
```

Expected: `anon`/`authenticated` 행에 `name`, `phone` 없음 (17개 컬럼만). `postgres`(또는 owner)는 무관.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260717120000_profiles_pii_grant_lockdown.sql
git commit -m "fix(db): lock down h_profiles name/phone from postgrest roles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 계정 유틸 라이브러리 (TDD)

**Files:**
- Create: `src/lib/auth-utils.ts`
- Test: `src/lib/auth-utils.test.ts`

**Interfaces:**
- Produces (Tasks 4-7이 사용):
  - `CONSENT_VERSION = "2026-07-17"` (약관 문서 버전 상수)
  - `normalizePhone(input: string): string` — 숫자만 추출
  - `isValidPhone(normalized: string): boolean` — `/^010\d{7,8}$/`
  - `formatPhoneInput(input: string): string` — 입력 중 자동 하이픈 (`010-1234-5678`, 10자리는 `010-123-4567`)
  - `maskEmail(email: string): string` — `ab***@d***.com` (로컬 앞 2자[1자면 1자]+***, 도메인 첫 라벨 첫 글자+***, 첫 점 이후 유지)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/auth-utils.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  CONSENT_VERSION,
  formatPhoneInput,
  isValidPhone,
  maskEmail,
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
});

describe("CONSENT_VERSION", () => {
  test("문서 버전 고정", () => {
    expect(CONSENT_VERSION).toBe("2026-07-17");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun test src/lib/auth-utils.test.ts`
Expected: FAIL — `Cannot find module './auth-utils'`

- [ ] **Step 3: 구현**

`src/lib/auth-utils.ts`:

```ts
// 계정 플로우 공용 순수 유틸 — 서버 라우트와 클라이언트 폼이 함께 사용

// /terms, /privacy 문서 버전. 약관 개정 시 이 값을 올리고 재동의 플로우를 검토한다.
export const CONSENT_VERSION = "2026-07-17";

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidPhone(normalized: string): boolean {
  return /^010\d{7,8}$/.test(normalized);
}

// 시니어 친화 자동 하이픈: 3-4-4 (11자리 기준), 초과분은 무시
export function formatPhoneInput(input: string): string {
  const digits = normalizePhone(input).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 계정 열거 방지용 마스킹: ab***@d***.com (스펙 §7.1)
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.indexOf(".");
  const maskedLocal = `${local.slice(0, Math.min(2, local.length))}***`;
  const maskedDomain =
    dot < 0 ? `${domain.slice(0, 1)}***` : `${domain.slice(0, 1)}***${domain.slice(dot)}`;
  return `${maskedLocal}@${maskedDomain}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/auth-utils.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: 타입/린트 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/lib/auth-utils.ts src/lib/auth-utils.test.ts` → 오류 없음.

```bash
git add src/lib/auth-utils.ts src/lib/auth-utils.test.ts
git commit -m "feat(auth): phone/email/consent pure utils

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: /terms · /privacy 페이지 + proxy 공개 허용목록

**Files:**
- Create: `src/app/terms/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Modify: `src/proxy.ts` (publicPaths에 5개 추가)

**Interfaces:**
- Produces: 공개 라우트 `/terms`, `/privacy` (회원가입 "보기" 링크 대상), proxy가 `/find-id`, `/find-password`, `/reset-password`, `/terms`, `/privacy`를 공개 처리 (`/login/email`은 기존 `/login` startsWith로 이미 커버)

- [ ] **Step 1: 공용 문서 레이아웃 + terms 페이지**

`src/app/terms/page.tsx`:

```tsx
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export const metadata = { title: "이용약관 | 하모니" };

// 표준 초안 — 운영(법무) 검토 후 개정 시 src/lib/auth-utils.ts의 CONSENT_VERSION을 함께 올릴 것
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <Link
        href="/register"
        className="inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
      >
        <ArrowLeft size={20} />
        돌아가기
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-mocha-900">이용약관</h1>
      <p className="mt-1 text-sm text-mocha-500">시행일: 2026년 7월 17일 (v2026-07-17)</p>

      <div className="mt-6 space-y-6 text-base leading-relaxed text-mocha-800">
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제1조 (목적)</h2>
          <p>
            본 약관은 하모니(이하 "서비스")가 제공하는 클럽·모임·커뮤니티 서비스의 이용 조건과
            절차, 회원과 서비스의 권리·의무를 정합니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제2조 (회원 가입)</h2>
          <p>
            회원은 본 약관에 동의하고 서비스가 정한 가입 절차를 완료함으로써 가입됩니다. 서비스는
            타인 명의 도용 등 부정 가입이 확인되면 이용을 제한할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제3조 (서비스 이용)</h2>
          <p>
            회원은 클럽 개설·가입, 모임 참여, 게시물 작성 등 서비스를 자유롭게 이용할 수 있습니다.
            다만 법령 위반, 타인 권리 침해, 허위 정보 게시 행위는 금지됩니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제4조 (게시물)</h2>
          <p>
            게시물의 저작권은 작성자에게 있으며, 서비스는 서비스 운영·홍보 범위에서 이를 사용할 수
            있습니다. 금지 행위에 해당하는 게시물은 사전 통지 없이 제한될 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제5조 (계약 해지)</h2>
          <p>
            회원은 언제든지 내 정보 &gt; 설정에서 탈퇴를 요청할 수 있습니다. 서비스는 약관 위반이
            중대한 경우 이용 계약을 해지할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제6조 (면책)</h2>
          <p>
            서비스는 회원 간 모임·거래에서 발생한 분쟁에 개입하지 않으며, 천재지변 등 불가항력으로
            인한 서비스 중단에 책임지지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">부칙</h2>
          <p>본 약관은 2026년 7월 17일부터 시행합니다.</p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: privacy 페이지**

`src/app/privacy/page.tsx`:

```tsx
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export const metadata = { title: "개인정보 처리방침 | 하모니" };

// 표준 초안 — 운영(법무) 검토 후 개정 시 src/lib/auth-utils.ts의 CONSENT_VERSION을 함께 올릴 것
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <Link
        href="/register"
        className="inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
      >
        <ArrowLeft size={20} />
        돌아가기
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-mocha-900">
        개인정보 처리방침
      </h1>
      <p className="mt-1 text-sm text-mocha-500">시행일: 2026년 7월 17일 (v2026-07-17)</p>

      <div className="mt-6 space-y-6 text-base leading-relaxed text-mocha-800">
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">1. 수집하는 개인정보</h2>
          <p>
            회원 가입 시 이름, 휴대폰 번호, 이메일, 비밀번호를 수집합니다. 프로필 설정 시 닉네임,
            지역, 취미, 프로필 사진을 추가로 수집할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">2. 이용 목적</h2>
          <p>
            회원 식별과 로그인, 아이디 찾기 등 본인 확인, 맞춤 모임 추천, 서비스 공지 전달에
            이용합니다. 목적 외 이용 시 별도 동의를 받습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">3. 보유 기간</h2>
          <p>
            회원 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 정보는 해당
            기간 동안 분리 보관합니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">4. 제3자 제공</h2>
          <p>
            법령에 근거하거나 회원의 별도 동의가 있는 경우를 제외하고 개인정보를 제3자에게
            제공하지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">5. 이용자의 권리</h2>
          <p>
            회원은 언제든지 자신의 개인정보를 조회·수정하거나 삭제(탈퇴)를 요청할 수 있습니다. 내
            정보 &gt; 설정에서 직접 처리할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">6. 안전성 확보 조치</h2>
          <p>
            비밀번호는 복호화 불가능한 방식으로 저장되며, 개인정보 접근 권한을 최소화하고 접근
            통제를 시행합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: proxy 허용목록 추가**

`src/proxy.ts`의 `publicPaths` 배열에서 `"/api/auth",` 줄 아래에 추가:

```ts
  "/find-id",
  "/find-password",
  "/reset-password",
  "/terms",
  "/privacy",
```

(`/login/email`은 기존 `"/login"` startsWith 매칭으로 이미 공개.)

- [ ] **Step 4: 검증 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/app/terms/page.tsx src/app/privacy/page.tsx src/proxy.ts` → 오류 없음.
Run: `bun run dev` (재시작 — 새 라우트) 후 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/terms` → `200`, `/privacy` → `200`. dev 서버 종료.

```bash
git add src/app/terms/page.tsx src/app/privacy/page.tsx src/proxy.ts
git commit -m "feat(auth): terms/privacy pages and public route allowlist

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: POST /api/auth/signup + 회원가입 페이지 재구성

**Files:**
- Create: `src/app/api/auth/signup/route.ts`
- Modify: `src/app/(auth)/register/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2 `CONSENT_VERSION`/`normalizePhone`/`isValidPhone`/`formatPhoneInput`, Drizzle `profiles`/`userConsents`, `@/lib/api-response`
- Produces: `POST /api/auth/signup` — body `{ name, phone, email, password, agreeTerms: true, agreePrivacy: true }` → 성공 `{ success: true, data: { needsEmailConfirm: boolean } }`. 프로필 스텁(id, nickname=이름, name, phone) upsert + 동의 2건 기록. 온보딩(`/api/onboarding/complete`)의 기존 `onConflictDoUpdate`가 nickname을 덮어쓰므로 호환.

- [ ] **Step 1: signup 라우트 구현**

`src/app/api/auth/signup/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { profiles, userConsents } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { CONSENT_VERSION, isValidPhone, normalizePhone } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";

const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[가-힣]{2,10}$/, "이름은 한글 2~10자로 입력해주세요"),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine(isValidPhone, "휴대폰 번호가 올바르지 않아요"),
  email: z.email("이메일 형식이 올바르지 않아요"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 해요")
    .max(72, "비밀번호는 72자 이내로 입력해주세요"),
  agreeTerms: z.literal(true, "이용약관 동의가 필요해요"),
  agreePrivacy: z.literal(true, "개인정보 처리방침 동의가 필요해요"),
});

// POST /api/auth/signup — 이메일 가입 (프로필 스텁 + 약관 동의 기록까지 원자 처리)
export async function POST(request: NextRequest) {
  const parsed = SignupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  const { name, phone, email, password } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, nickname: name } },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return errorResponse("ALREADY_REGISTERED", "이미 가입된 이메일이에요. 로그인해주세요.", 409);
      }
      console.error("[auth/signup] signUp failed", error);
      return errorResponse("SIGNUP_FAILED", "가입에 실패했어요. 잠시 후 다시 시도해주세요.", 400);
    }
    if (!data.user) {
      return errorResponse("SIGNUP_FAILED", "가입에 실패했어요. 잠시 후 다시 시도해주세요.", 400);
    }

    const userId = data.user.id;
    await db.transaction(async (tx) => {
      await tx
        .insert(profiles)
        .values({ id: userId, nickname: name, name, phone })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { name, phone, updatedAt: new Date() },
        });
      await tx.insert(userConsents).values([
        { userId, consentType: "terms", version: CONSENT_VERSION },
        { userId, consentType: "privacy", version: CONSENT_VERSION },
      ]);
    });

    // 이메일 확인이 켜진 프로젝트면 session이 없다 — 클라이언트가 안내 문구로 분기
    return successResponse({ needsEmailConfirm: !data.session }, 201);
  } catch (err) {
    console.error("[auth/signup]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: register 페이지 전체 교체**

`src/app/(auth)/register/page.tsx` — 기존 닉네임 필드 제거, 이름/휴대폰/이메일/비밀번호/비밀번호 확인 + 약관 동의 블록(시안 login3). 카카오 버튼·StepIndicator·CompleteStep·ErrorBanner 구조는 유지:

```tsx
"use client";

import {
  ChatCircle,
  DeviceMobile,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Hand,
  Lock,
  Sparkle,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepIndicator } from "@/components/ui/step-indicator";
import { formatPhoneInput } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";

type Step = "info" | "complete";

const CHECKBOX_BRAND =
  "data-[state=checked]:border-coral-500 data-[state=checked]:bg-coral-500 focus-visible:ring-coral-200";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const allAgreed = agreeTerms && agreePrivacy;

  function toggleAll(checked: boolean) {
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 달라요. 다시 확인해주세요.");
      return;
    }
    if (!allAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          password,
          agreeTerms,
          agreePrivacy,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "가입에 실패했어요. 다시 시도해주세요.");
        return;
      }
      setNeedsEmailConfirm(Boolean(json.data?.needsEmailConfirm));
      setStep("complete");
    } catch {
      setError("가입에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setError("");
    setKakaoLoading(true);
    try {
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
        <div className="mb-6 flex justify-center">
          <StepIndicator
            steps={[{ label: "정보" }, { label: "완료" }]}
            current={step === "info" ? 1 : 2}
            ariaLabel="회원가입 진행 단계"
          />
        </div>

        {error && <ErrorBanner message={error} />}

        {step === "info" && (
          <>
            <Greeting
              icon={<Hand size={32} weight="duotone" />}
              title="하모니에 오신 것을 환영합니다"
              subtitle="간단한 정보 입력으로 하모니를 시작해보세요"
              className="mb-7"
            />

            <Button
              variant="kakao"
              className="mb-6 w-full animate-fade-up text-lg font-extrabold"
              size="lg"
              type="button"
              onClick={handleKakaoLogin}
              disabled={kakaoLoading}
            >
              <ChatCircle size={28} weight="fill" />
              {kakaoLoading ? "카카오로 연결 중..." : "카카오로 시작하기"}
            </Button>
            <div className="mb-6 flex items-center gap-3 text-mocha-500" aria-hidden="true">
              <hr className="flex-1 border-mocha-200" />
              <span className="text-sm">또는 이메일로</span>
              <hr className="flex-1 border-mocha-200" />
            </div>

            <form className="stagger-children space-y-6" onSubmit={handleRegister} noValidate>
              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-name">이름</Label>
                <Input
                  id="reg-name"
                  placeholder="실명을 입력해주세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={10}
                  required
                  leadingIcon={<User size={26} weight="duotone" />}
                  aria-describedby="name-help"
                />
                <p id="name-help" className="px-1 text-base text-mocha-700">
                  아이디 찾기 등 본인 확인에만 사용해요
                </p>
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-phone">휴대폰 번호</Label>
                <Input
                  id="reg-phone"
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

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-email">이메일 주소</Label>
                <Input
                  id="reg-email"
                  type="email"
                  inputMode="email"
                  placeholder="example@harmony.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  leadingIcon={<EnvelopeSimple size={26} weight="duotone" />}
                />
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-password">비밀번호</Label>
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8자 이상 입력해주세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  leadingIcon={<Lock size={26} weight="duotone" />}
                  trailingAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                      aria-pressed={showPassword}
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200 focus:outline-none focus:ring-4 focus:ring-coral-200"
                    >
                      {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                    </button>
                  }
                />
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-password-confirm">비밀번호 확인</Label>
                <Input
                  id="reg-password-confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="다시 한번 입력해주세요"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  leadingIcon={<Lock size={26} weight="duotone" />}
                />
              </div>

              {/* 약관 동의 블록 (시안 login3) */}
              <div className="animate-fade-up rounded-2xl border border-mocha-200 bg-white p-4">
                <label className="flex items-center gap-3 border-b border-mocha-100 pb-3 text-lg font-extrabold text-mocha-900">
                  <Checkbox
                    checked={allAgreed}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    className={CHECKBOX_BRAND}
                    aria-label="전체 약관 동의"
                  />
                  전체 약관 동의
                </label>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={agreeTerms}
                      onCheckedChange={(v) => setAgreeTerms(v === true)}
                      className={CHECKBOX_BRAND}
                      aria-label="이용약관 동의 (필수)"
                    />
                    <span className="flex-1 text-base text-mocha-800">이용약관 동의 (필수)</span>
                    <Link
                      href="/terms"
                      className="text-sm font-bold text-coral-700 underline underline-offset-2"
                    >
                      보기
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={agreePrivacy}
                      onCheckedChange={(v) => setAgreePrivacy(v === true)}
                      className={CHECKBOX_BRAND}
                      aria-label="개인정보 처리방침 동의 (필수)"
                    />
                    <span className="flex-1 text-base text-mocha-800">
                      개인정보 처리방침 동의 (필수)
                    </span>
                    <Link
                      href="/privacy"
                      className="text-sm font-bold text-coral-700 underline underline-offset-2"
                    >
                      보기
                    </Link>
                  </div>
                </div>
              </div>

              <Button
                className="w-full animate-fade-up"
                size="lg"
                type="submit"
                disabled={loading || !allAgreed}
              >
                {loading ? "가입 중이에요..." : "회원가입 완료"}
              </Button>
            </form>

            <div className="mt-7 border-t border-mocha-100 pt-6 text-center">
              <p className="text-lg text-mocha-700">
                이미 회원이신가요?{" "}
                <Link
                  href="/login"
                  className="font-bold text-coral-700 underline decoration-2 underline-offset-4 hover:text-coral-800"
                >
                  로그인
                </Link>
              </p>
            </div>
          </>
        )}

        {step === "complete" && <CompleteStep needsEmailConfirm={needsEmailConfirm} />}
      </CardContent>
    </Card>
  );
}

function CompleteStep({ needsEmailConfirm }: { needsEmailConfirm: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center animate-fade-up">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-coral-200/40 blur-xl" />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-coral-400 to-coral-600 shadow-warm">
          <Sparkle size={56} weight="fill" className="text-white" />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-extrabold text-mocha-900 tracking-tight">가입을 환영해요</h3>
        <p className="mt-3 text-lg text-mocha-700 leading-relaxed">
          {needsEmailConfirm ? (
            <>
              메일함에서 확인 메일을 열어
              <br />
              가입을 완료해주세요
            </>
          ) : (
            <>
              이제 하모니에서
              <br />
              새로운 친구를 만나보세요
            </>
          )}
        </p>
      </div>
      {!needsEmailConfirm && (
        <Link href="/onboarding" className="block w-full">
          <Button className="w-full" size="lg" asChild>
            <span>시작하기</span>
          </Button>
        </Link>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
    >
      <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
      <span className="pt-0.5">{message}</span>
    </div>
  );
}
```

- [ ] **Step 3: 정적 검증**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/app/api/auth/signup/route.ts "src/app/(auth)/register/page.tsx"` → 오류 없음.

- [ ] **Step 4: 런타임 검증 (실계정 생성 금지 범위 내)**

dev 서버 재시작(새 라우트) 후:

```bash
curl -s -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d '{"name":"홍","phone":"010","email":"bad","password":"1","agreeTerms":false,"agreePrivacy":false}'
```

Expected: `{"success":false,"error":{"code":"VALIDATION_ERROR","message":"이름은 한글 2~10자로 입력해주세요"}}` (첫 번째 위반의 한국어 메시지). `/register` 페이지 `200` 확인. **실제 유효 payload로 가입하지 말 것** (공유 DB). dev 서버 종료.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/signup/route.ts "src/app/(auth)/register/page.tsx"
git commit -m "feat(auth): signup api with consents + register page per mockup

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 로그인 랜딩/이메일 분리 + 로그인 상태 유지

**Files:**
- Create: `src/lib/supabase/cookie-policy.ts`
- Modify: `src/lib/supabase/client.ts` (쿠키 어댑터)
- Modify: `src/lib/supabase/server.ts` (setAll 정책 적용)
- Modify: `src/proxy.ts` (setAll 정책 적용)
- Modify: `src/app/(auth)/login/page.tsx` (랜딩으로 전체 교체 — 토글 제거)
- Create: `src/app/(auth)/login/email/page.tsx`

**Interfaces:**
- Consumes: 기존 카카오 핸들러 패턴, `Checkbox`, Task 3의 `/find-password`·`/find-id` 라우트(다음 태스크에서 생성 — 링크만 먼저 걸림, 접속은 Task 6-7 후 유효)
- Produces: `/login`(랜딩) + `/login/email`. `KEEP_SIGNIN_COOKIE = "harmony-keep-signin"` — 값 "0"이면 auth 쿠키가 세션 쿠키로 강등(브라우저 종료 시 만료), 그 외 기본 유지. 이메일 로그인 성공 시 `/`(홈) 이동.

- [ ] **Step 1: cookie-policy 구현**

`src/lib/supabase/cookie-policy.ts`:

```ts
// "로그인 상태 유지" 정책 — client/server/proxy 세 곳의 쿠키 어댑터가 공유 (스펙 §7.4)
export const KEEP_SIGNIN_COOKIE = "harmony-keep-signin";

// 값이 "0"일 때만 유지 해제 — auth 쿠키를 만료 없는 세션 쿠키로 강등
export function shouldPersist(value: string | undefined): boolean {
  return value !== "0";
}

export function stripPersistence<T extends { maxAge?: number; expires?: Date }>(options: T): T {
  const next = { ...options };
  delete next.maxAge;
  delete next.expires;
  return next;
}
```

- [ ] **Step 2: client.ts 어댑터 교체**

`src/lib/supabase/client.ts` 전체 교체:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { KEEP_SIGNIN_COOKIE, shouldPersist, stripPersistence } from "@/lib/supabase/cookie-policy";

function readCookie(name: string): string | undefined {
  const pair = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : undefined;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    {
      cookies: {
        getAll() {
          return document.cookie
            .split("; ")
            .filter(Boolean)
            .map((pair) => {
              const i = pair.indexOf("=");
              return { name: pair.slice(0, i), value: pair.slice(i + 1) };
            });
        },
        setAll(cookiesToSet) {
          const persist = shouldPersist(readCookie(KEEP_SIGNIN_COOKIE));
          for (const { name, value, options } of cookiesToSet) {
            const opts = persist ? options : stripPersistence(options);
            let str = `${name}=${value}; Path=${opts.path ?? "/"}`;
            if (typeof opts.maxAge === "number") str += `; Max-Age=${opts.maxAge}`;
            if (opts.expires) str += `; Expires=${new Date(opts.expires).toUTCString()}`;
            if (opts.sameSite) {
              str += `; SameSite=${typeof opts.sameSite === "string" ? opts.sameSite : "Lax"}`;
            }
            if (opts.secure) str += "; Secure";
            document.cookie = str;
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: server.ts / proxy.ts에 정책 적용**

`src/lib/supabase/server.ts`의 `setAll` 루프를 다음으로 교체 (import에 cookie-policy 추가):

```ts
        setAll(cookiesToSet) {
          try {
            const persist = shouldPersist(cookieStore.get(KEEP_SIGNIN_COOKIE)?.value);
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, persist ? options : stripPersistence(options));
            }
          } catch {
            // Server component can't set cookies
          }
        },
```

`src/proxy.ts`의 `setAll`에서 `supabaseResponse.cookies.set(name, value, options)` 줄을 다음으로 교체 (import 추가):

```ts
        const persist = shouldPersist(request.cookies.get(KEEP_SIGNIN_COOKIE)?.value);
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, persist ? options : stripPersistence(options));
        }
```

(import: `import { KEEP_SIGNIN_COOKIE, shouldPersist, stripPersistence } from "@/lib/supabase/cookie-policy";` — proxy는 `@/` alias 사용 가능.)

- [ ] **Step 4: /login 랜딩 교체**

`src/app/(auth)/login/page.tsx` 전체 교체 — 이메일 토글 제거, 시안 login1 구조 (히어로 이미지는 에셋 부재로 생략 — 스펙 §12 오픈 이슈):

```tsx
"use client";

import { ChatCircle, EnvelopeSimple, Hand, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setError("");
    setKakaoLoading(true);
    try {
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
          subtitle="편한 방법으로 시작해보세요"
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

        <div className="stagger-children space-y-3">
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

          <div className="mb-6 flex items-center gap-3 text-mocha-500" aria-hidden="true">
            <hr className="flex-1 border-mocha-200" />
            <span className="text-sm">또는 이메일로</span>
            <hr className="flex-1 border-mocha-200" />
          </div>

          <Link href="/login/email" className="block">
            <Button variant="outline" className="w-full animate-fade-up" size="lg" type="button">
              <EnvelopeSimple size={26} weight="duotone" />
              이메일로 로그인
            </Button>
          </Link>
        </div>

        <div className="mt-7 border-t border-mocha-100 pt-6 text-center">
          <p className="text-lg text-mocha-700">
            아직 회원이 아니신가요?{" "}
            <Link
              href="/register"
              className="font-bold text-coral-700 underline decoration-2 underline-offset-4 hover:text-coral-800"
            >
              회원가입
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: /login/email 신설**

`src/app/(auth)/login/email/page.tsx` (시안 login2 — 로그인 상태 유지, 비밀번호 찾기, 하단 아이디 찾기 | 회원가입, 브랜드 카드):

```tsx
"use client";

import { ArrowLeft, EnvelopeSimple, Eye, EyeSlash, Lock, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { KEEP_SIGNIN_COOKIE } from "@/lib/supabase/cookie-policy";

const CHECKBOX_BRAND =
  "data-[state=checked]:border-coral-500 data-[state=checked]:bg-coral-500 focus-visible:ring-coral-200";

export default function EmailLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 로그인 전에 유지 정책 쿠키를 먼저 기록 — 이후 발급되는 auth 쿠키에 적용됨
      document.cookie = `${KEEP_SIGNIN_COOKIE}=${keepSignedIn ? "1" : "0"}; Max-Age=31536000; Path=/`;
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 일치하지 않아요"
            : error.message
        );
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
        >
          <ArrowLeft size={20} />
          다른 방법으로 로그인
        </Link>

        <Greeting
          icon={<EnvelopeSimple size={32} weight="duotone" />}
          title="이메일 로그인"
          subtitle="하모니에 오신 것을 환영합니다. 이메일과 비밀번호를 입력해주세요."
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

        <form className="stagger-children space-y-6" onSubmit={handleEmailLogin} noValidate>
          <div className="space-y-2 animate-fade-up">
            <Label htmlFor="email">이메일 주소</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              placeholder="example@harmony.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              leadingIcon={<EnvelopeSimple size={26} weight="duotone" />}
            />
          </div>
          <div className="space-y-2 animate-fade-up">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              leadingIcon={<Lock size={26} weight="duotone" />}
              trailingAction={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  aria-pressed={showPassword}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200 focus:outline-none focus:ring-4 focus:ring-coral-200"
                >
                  {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                </button>
              }
            />
          </div>

          <div className="flex items-center justify-between animate-fade-up">
            <label className="flex items-center gap-2 text-base text-mocha-800">
              <Checkbox
                checked={keepSignedIn}
                onCheckedChange={(v) => setKeepSignedIn(v === true)}
                className={CHECKBOX_BRAND}
                aria-label="로그인 상태 유지"
              />
              로그인 상태 유지
            </label>
            <Link
              href="/find-password"
              className="text-base font-bold text-mocha-700 underline underline-offset-2"
            >
              비밀번호 찾기
            </Link>
          </div>

          <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
            {loading ? "로그인 중이에요..." : "로그인"}
          </Button>
        </form>

        <div className="mt-7 border-t border-mocha-100 pt-6 text-center">
          <p className="text-lg text-mocha-700">
            <Link
              href="/find-id"
              className="font-bold text-coral-700 underline decoration-2 underline-offset-4"
            >
              아이디 찾기
            </Link>
            <span className="mx-2 text-mocha-300">|</span>
            <Link
              href="/register"
              className="font-bold text-coral-700 underline decoration-2 underline-offset-4"
            >
              회원가입
            </Link>
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-coral-50 to-cream-100 p-6 text-center">
          <p className="text-lg font-extrabold leading-relaxed text-coral-800">
            당신의 매일이
            <br />
            조화롭고 활기차게
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: 검증 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/lib/supabase/ "src/app/(auth)/login/"` → 오류 없음 (기존 파일의 사전 존재 이슈 제외).
dev 서버 재시작 후: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` → `200`, `/login/email` → `200`. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `307` (인증 리다이렉트 여전히 정상 — 쿠키 어댑터 변경이 비로그인 플로우를 깨지 않음). dev 서버 종료.

```bash
git add src/lib/supabase/cookie-policy.ts src/lib/supabase/client.ts src/lib/supabase/server.ts src/proxy.ts "src/app/(auth)/login/page.tsx" "src/app/(auth)/login/email/page.tsx"
git commit -m "feat(auth): split login landing/email pages, keep-signin cookie policy

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 아이디 찾기 (/find-id + API)

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/app/api/auth/find-id/route.ts`
- Create: `src/app/(auth)/find-id/page.tsx`

**Interfaces:**
- Consumes: Task 2 `normalizePhone`/`isValidPhone`/`maskEmail`/`formatPhoneInput`, Drizzle `profiles`/`authAttempts`
- Produces: `POST /api/auth/find-id` — body `{ name, phone }` → `{ success: true, data: { found: false } | { found: true, provider: "kakao" } | { found: true, maskedEmail: string } }`, 10분/IP 5회 초과 시 429. `createAdminClient()` (service-role, 서버 전용).

- [ ] **Step 1: admin 클라이언트**

`src/lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service-role 클라이언트 — find-id처럼 auth admin 조회가 필요한 서버 라우트 전용.
// 절대 응답에 원본 이메일/전화번호를 그대로 싣지 말 것 (스펙 §9).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase service-role environment variables");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 2: find-id 라우트**

`src/app/api/auth/find-id/route.ts`:

```ts
import { and, count, eq, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts, profiles } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { isValidPhone, maskEmail, normalizePhone } from "@/lib/auth-utils";
import { createAdminClient } from "@/lib/supabase/admin";

const FindIdSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(10, "이름이 올바르지 않아요"),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine(isValidPhone, "휴대폰 번호가 올바르지 않아요"),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// POST /api/auth/find-id — 이름+휴대폰으로 마스킹된 이메일 조회 (스펙 §7.3)
export async function POST(request: NextRequest) {
  const parsed = FindIdSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const ip = clientIp(request);
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const [attempts] = await db
      .select({ value: count() })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.ip, ip),
          eq(authAttempts.action, "find_id"),
          gte(authAttempts.createdAt, windowStart)
        )
      );
    if ((attempts?.value ?? 0) >= MAX_ATTEMPTS) {
      return errorResponse("RATE_LIMITED", "시도가 너무 많아요. 잠시 후 다시 시도해주세요.", 429);
    }
    await db.insert(authAttempts).values({ ip, action: "find_id" });

    const { name, phone } = parsed.data;
    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.name, name), eq(profiles.phone, phone)))
      .limit(1);

    // 불일치 시 어느 필드가 틀렸는지 노출하지 않음 (계정 열거 방지)
    if (!profile) return successResponse({ found: false as const });

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(profile.id);
    if (error || !data.user?.email) {
      console.error("[auth/find-id] admin lookup failed", error);
      return successResponse({ found: false as const });
    }
    if (data.user.app_metadata?.provider === "kakao") {
      return successResponse({ found: true as const, provider: "kakao" as const });
    }
    return successResponse({ found: true as const, maskedEmail: maskEmail(data.user.email) });
  } catch (err) {
    console.error("[auth/find-id]", err);
    return serverError();
  }
}
```

- [ ] **Step 3: find-id 페이지**

`src/app/(auth)/find-id/page.tsx` (시안: 이름+휴대폰+보안 안내 → 결과 표시):

```tsx
"use client";

import { ArrowLeft, DeviceMobile, ShieldCheck, User, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneInput } from "@/lib/auth-utils";

type Result =
  | { found: false }
  | { found: true; provider: "kakao" }
  | { found: true; maskedEmail: string };

export default function FindIdPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      setResult(json.data as Result);
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Link
          href="/login/email"
          className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
        >
          <ArrowLeft size={20} />
          로그인으로 돌아가기
        </Link>

        <Greeting
          icon={<User size={32} weight="duotone" />}
          title="아이디 찾기"
          subtitle="가입 시 등록한 이름과 휴대폰 번호를 입력해주세요."
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

        {result && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-sage-200 bg-sage-50 p-5 text-center"
          >
            {!result.found ? (
              <p className="text-base leading-relaxed text-mocha-800">
                입력하신 정보와 일치하는 계정을 찾지 못했어요.
                <br />
                가입 시 정보를 다시 확인해주세요.
                <br />
                <span className="text-sm text-mocha-600">
                  (예전에 가입하셨다면 이름·휴대폰이 등록되지 않았을 수 있어요)
                </span>
              </p>
            ) : "provider" in result ? (
              <p className="text-base leading-relaxed text-mocha-800">
                카카오로 가입된 계정이에요.
                <br />
                <Link href="/login" className="font-bold text-coral-700 underline">
                  카카오로 로그인하기
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-base text-mocha-800">회원님의 아이디는</p>
                <p className="text-xl font-extrabold text-mocha-900">{result.maskedEmail}</p>
                <Link href="/login/email" className="block">
                  <Button className="w-full" size="lg" asChild>
                    <span>로그인하러 가기</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        <form className="stagger-children space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2 animate-fade-up">
            <Label htmlFor="find-name">이름</Label>
            <Input
              id="find-name"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={10}
              required
              leadingIcon={<User size={26} weight="duotone" />}
            />
          </div>
          <div className="space-y-2 animate-fade-up">
            <Label htmlFor="find-phone">휴대폰 번호</Label>
            <Input
              id="find-phone"
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

          <div className="flex items-center gap-3 rounded-2xl bg-cream-100 p-4 animate-fade-up">
            <ShieldCheck size={28} weight="duotone" className="shrink-0 text-coral-600" />
            <p className="text-base text-mocha-700">소중한 개인정보는 안전하게 보호됩니다</p>
          </div>

          <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
            {loading ? "찾는 중이에요..." : "아이디 찾기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: 검증 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/lib/supabase/admin.ts src/app/api/auth/find-id/route.ts "src/app/(auth)/find-id/page.tsx"` → 오류 없음.
dev 서버 재시작 후:

```bash
curl -s -X POST http://localhost:3000/api/auth/find-id -H "Content-Type: application/json" -d '{"name":"존재안함","phone":"010-9999-8888"}'
```

Expected: `{"success":true,"data":{"found":false}}`. 같은 요청을 총 6회 반복 → 6번째는 `{"success":false,"error":{"code":"RATE_LIMITED",...}}` (429). `/find-id` 페이지 `200`. dev 서버 종료.

```bash
git add src/lib/supabase/admin.ts src/app/api/auth/find-id/route.ts "src/app/(auth)/find-id/page.tsx"
git commit -m "feat(auth): find-id flow with rate limit and masked email

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 비밀번호 찾기 + 재설정

**Files:**
- Create: `src/app/(auth)/find-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`

**Interfaces:**
- Consumes: 기존 `/api/auth/callback` (code 교환 + `next` 리다이렉트 — 수정 불필요, 확인만), supabase client `resetPasswordForEmail`/`updateUser`
- Produces: `/find-password` (링크 발송, 결과는 항상 동일 안내 — 열거 방지), `/reset-password` (recovery 세션에서 새 비밀번호 설정)

- [ ] **Step 1: find-password 페이지**

`src/app/(auth)/find-password/page.tsx` (시안 레이아웃 유지, 문구는 재설정 링크 방식 — 스펙 §10 편차, 이름 필드 없음):

```tsx
"use client";

import { ArrowLeft, EnvelopeSimple, LockKey, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function FindPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });
      if (error) {
        console.error("[find-password] reset request failed", error);
        setError("요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Link
          href="/login/email"
          className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
        >
          <ArrowLeft size={20} />
          로그인으로 돌아가기
        </Link>

        <div className="mb-6 flex flex-col items-center gap-2 rounded-2xl bg-cream-100 p-5 text-center">
          <LockKey size={40} weight="duotone" className="text-coral-600" />
          <p className="text-lg font-extrabold text-mocha-900">보안 안내</p>
          <p className="text-base text-mocha-700">
            비밀번호를 재설정하기 위해 이메일 주소를 입력해 주세요.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
          >
            <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
            <span className="pt-0.5">{error}</span>
          </div>
        )}

        {sent ? (
          <div role="status" className="rounded-2xl border border-sage-200 bg-sage-50 p-6 text-center">
            <PaperPlaneTilt size={36} weight="duotone" className="mx-auto mb-3 text-sage-700" />
            <p className="text-base leading-relaxed text-mocha-800">
              가입된 이메일이라면 재설정 링크를 보내드렸어요.
              <br />
              메일함(스팸함 포함)을 확인해주세요.
            </p>
          </div>
        ) : (
          <form className="stagger-children space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2 animate-fade-up">
              <Label htmlFor="fp-email">이메일 주소</Label>
              <Input
                id="fp-email"
                type="email"
                inputMode="email"
                placeholder="example@harmony.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                leadingIcon={<EnvelopeSimple size={26} weight="duotone" />}
              />
            </div>

            <div className="rounded-2xl border-l-4 border-coral-400 bg-cream-100 p-4 animate-fade-up">
              <p className="text-base text-mocha-700">
                가입하실 때 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
              </p>
            </div>

            <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
              {loading ? "보내는 중이에요..." : "재설정 링크 발송"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: reset-password 페이지**

`src/app/(auth)/reset-password/page.tsx` (recovery 링크 착지 — callback이 code 교환 후 여기로 보냄):

```tsx
"use client";

import { CheckCircle, Eye, EyeSlash, Lock, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "invalid" | "form" | "done";

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setPhase(user ? "form" : "invalid");
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 달라요. 다시 확인해주세요.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("[reset-password] update failed", error);
        setError("비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setPhase("done");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Greeting
          icon={<Lock size={32} weight="duotone" />}
          title="비밀번호 재설정"
          subtitle="새로 사용할 비밀번호를 입력해주세요."
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

        {phase === "checking" && (
          <p className="py-8 text-center text-base text-mocha-700">확인 중이에요...</p>
        )}

        {phase === "invalid" && (
          <div className="space-y-5 py-4 text-center">
            <p className="text-base leading-relaxed text-mocha-800">
              링크가 만료됐거나 올바르지 않아요.
              <br />
              재설정 링크를 다시 받아주세요.
            </p>
            <Link href="/find-password" className="block">
              <Button className="w-full" size="lg" asChild>
                <span>재설정 링크 다시 받기</span>
              </Button>
            </Link>
          </div>
        )}

        {phase === "form" && (
          <form className="stagger-children space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2 animate-fade-up">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="8자 이상 입력해주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                leadingIcon={<Lock size={26} weight="duotone" />}
                trailingAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    aria-pressed={showPassword}
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200 focus:outline-none focus:ring-4 focus:ring-coral-200"
                  >
                    {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                  </button>
                }
              />
            </div>
            <div className="space-y-2 animate-fade-up">
              <Label htmlFor="new-password-confirm">새 비밀번호 확인</Label>
              <Input
                id="new-password-confirm"
                type={showPassword ? "text" : "password"}
                placeholder="다시 한번 입력해주세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                leadingIcon={<Lock size={26} weight="duotone" />}
              />
            </div>
            <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
              {loading ? "변경 중이에요..." : "비밀번호 변경"}
            </Button>
          </form>
        )}

        {phase === "done" && (
          <div className="space-y-5 py-4 text-center">
            <CheckCircle size={48} weight="fill" className="mx-auto text-sage-600" />
            <p className="text-lg font-extrabold text-mocha-900">비밀번호가 변경됐어요</p>
            <Link href="/" className="block">
              <Button className="w-full" size="lg" asChild>
                <span>홈으로 가기</span>
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 검증 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check "src/app/(auth)/find-password/page.tsx" "src/app/(auth)/reset-password/page.tsx"` → 오류 없음.
dev 서버 재시작 후: `/find-password` → `200`, `/reset-password` → `200` (세션 없으니 "링크 만료" 안내가 렌더될 것 — HTML에 "링크가 만료됐거나" 포함 확인: `curl -s http://localhost:3000/reset-password | grep -c "재설정"` ≥ 1). **실제 재설정 메일 발송은 임의 이메일로 시도하지 말 것** (타인 메일로 발송됨) — 발송 플로우는 사용자 수동 패스. dev 서버 종료.

```bash
git add "src/app/(auth)/find-password/page.tsx" "src/app/(auth)/reset-password/page.tsx"
git commit -m "feat(auth): password reset request and reset pages

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 최종 통합 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 정적 검증**

```bash
bunx tsc --noEmit
bun test src/lib
bunx biome check src/lib/auth-utils.ts src/lib/auth-utils.test.ts src/lib/supabase/ src/app/terms/page.tsx src/app/privacy/page.tsx src/proxy.ts src/app/api/auth/signup/route.ts src/app/api/auth/find-id/route.ts "src/app/(auth)/"
```

Expected: tsc 출력 없음, bun test 36 pass (기존 27 + 신규 9), biome 오류 없음.

- [ ] **Step 2: 공개 라우트 및 API 런타임 검증**

dev 서버 재시작 후:

1. `/login`, `/login/email`, `/register`, `/find-id`, `/find-password`, `/reset-password`, `/terms`, `/privacy` → 전부 `200`
2. `/` → `307` (인증 게이트 회귀 없음)
3. signup 검증 오류 매트릭스 (한국어 메시지): 잘못된 이름/전화/이메일/약관 미동의 각각 422 + 해당 메시지
4. find-id: 불일치 → `{found:false}`, 6회 반복 → 429
5. `GET /api/clubs?sort=popular` → 200 (Phase 1 회귀 없음)
6. dev 서버 종료

- [ ] **Step 3: 결과 보고**

검증 결과 + 사용자 수동 패스 필요 항목(실가입 E2E, 카카오 로그인, 재설정 메일 왕복, 로그인 상태 유지 체크 해제 후 브라우저 재시작) 보고. 발견된 문제는 수정 후 재검증.

---

## 셀프 리뷰 노트 (플랜 작성 시 확인 완료)

- 스펙 §7 커버: 라우트 7종(§7.1 표)=Tasks 3-7, signup 처리(§7.2)=Task 4, find-id(§7.3)=Task 6, 상태 유지(§7.4)=Task 5, proxy 허용목록=Task 3. §9 보안: grant 축소=Task 1(P0-1 최종 리뷰 게이트), rate limit+마스킹+단일 메시지=Task 6, service role 한정=Task 6 admin.ts.
- 기존 코드와의 정합: onboarding/complete의 `onConflictDoUpdate`가 signup 스텁과 호환(nickname 덮어씀, name/phone 보존)을 소스에서 확인. callback은 code+next 지원이라 재설정 링크에 재사용(수정 없음). proxy publicPaths는 startsWith라 /login/email 자동 커버.
- 타입 일관성: `CONSENT_VERSION`/`normalizePhone`/`isValidPhone`/`formatPhoneInput`/`maskEmail`(Task 2) ↔ Tasks 4/6 사용부, `KEEP_SIGNIN_COOKIE`/`shouldPersist`/`stripPersistence`(Task 5) ↔ client/server/proxy 3개 어댑터, find-id 응답 3분기 ↔ 페이지 Result 타입.
- Phase 1-2 교훈 반영: Zod 전 검증자 한국어 메시지, 프로토타입-안전(여기선 `in` 미사용), Turbopack 신규 라우트 재시작, 실계정/타인 이메일로의 부작용 있는 호출 금지.
- 시안 편차는 전부 스펙 §10/§12에 근거: 재설정 링크 방식, 히어로 에셋 생략, 카카오 약관 갈음.
