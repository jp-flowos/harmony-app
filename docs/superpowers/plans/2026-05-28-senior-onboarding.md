# Senior Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement integrated senior onboarding from signup through home arrival with 24h hooks, persisting all inputs to DB.

**Architecture:** Stateful 5-step signup (Kakao OAuth + font scale + nickname + region + hobby) → fullscreen welcome → home with carousel + 24h hooks. Inputs are persisted in a single `POST /api/onboarding/complete` transaction. Global `FontScaleProvider` applies font scale across the app.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (Auth + Postgres + Realtime), Drizzle ORM, Tailwind v4, Radix UI + CVA, Zod, Phosphor Icons, TanStack Query, Web Push API.

**Spec:** `docs/superpowers/specs/2026-05-28-senior-onboarding-design.md`

**Scope:** Tasks 1–16 cover Phase A–F (foundation, signup, welcome, home, 24h hooks). Phase 4 D-1 cron job is split into a follow-up plan.

**Test strategy:** This repo has no test infrastructure. Each task verifies via `bunx tsc --noEmit`, `bun run lint`, and dev server (`bun run dev`) with browser or `curl` checks. Pure functions get small inline assertions in node REPL where reasonable.

**Conventions:**
- 한국어 UI 문자열, 영어 코드/변수명
- DB 테이블/enum은 `h_` 접두사 필수
- 마이그레이션은 `supabase/migrations/*.sql`이 source of truth (drizzle-kit 금지)
- API 응답은 `@/lib/api-response` 표준 포맷
- 100자 라인 폭, 2-space, double quote (Biome)

---

## File Structure

### 신규 생성

| 경로 | 책임 |
|---|---|
| `supabase/migrations/20260528000000_senior_onboarding.sql` | DB schema 변경 + hobbies seed |
| `src/lib/region/sido.ts` | 17개 시도 상수 |
| `src/lib/nickname/recommended.ts` | 닉네임 추천 풀 |
| `src/lib/voice/speak.ts` | Web Speech API TTS wrapper |
| `src/lib/onboarding/storage.ts` | sessionStorage helpers (step 진척도, dismissed cards) |
| `src/components/providers/FontScaleProvider.tsx` | font scale 글로벌 적용 |
| `src/components/onboarding/StepFontScale.tsx` | Step ② UI |
| `src/components/onboarding/StepNickname.tsx` | Step ③ UI |
| `src/components/onboarding/StepRegion.tsx` | Step ④ UI |
| `src/components/onboarding/StepHobby.tsx` | Step ⑤ UI |
| `src/components/onboarding/Confetti.tsx` | CSS 파티클 |
| `src/components/onboarding/OnboardingCarousel.tsx` | 홈 상단 3카드 슬라이더 |
| `src/components/onboarding/OperatorCard.tsx` | 카드 2 |
| `src/components/onboarding/CohortCard.tsx` | 카드 3 |
| `src/components/onboarding/FirstClubCard.tsx` | 카드 4 |
| `src/components/onboarding/KakaoShareButton.tsx` | 자녀 알리기 |
| `src/components/onboarding/NotificationOptInCard.tsx` | 모임 알림 옵트인 |
| `src/lib/kakao/share.ts` | Kakao JavaScript SDK loader + send wrapper |
| `src/app/api/onboarding/complete/route.ts` | POST: 5탭 입력 일괄 저장 |
| `src/app/api/onboarding/welcome/route.ts` | GET: 환영 카드 데이터 |
| `src/app/api/onboarding/cohort/route.ts` | GET: 또래 코호트 |
| `src/app/api/onboarding/first-club/route.ts` | GET: 첫 추천 동호회 |
| `src/app/(main)/welcome/page.tsx` | Phase 2 풀스크린 환영 |

### 수정

| 경로 | 이유 |
|---|---|
| `src/db/schema/users.ts` | profiles 컬럼 추가, verification enum 확장 |
| `src/app/layout.tsx` | `FontScaleProvider` 통합 |
| `src/app/(auth)/login/page.tsx` | Kakao OAuth 버튼 추가 |
| `src/app/(auth)/register/page.tsx` | Kakao OAuth 우선, 이메일 fallback |
| `src/app/(auth)/onboarding/page.tsx` | 5-step 재구성 + 일괄 저장 호출 |
| `src/app/(main)/page.tsx` | 4타일 홈 + `OnboardingCarousel` 통합 |
| `.env.example` | Kakao JS Key, 운영자 ENV 추가 |

---

## Task 1: DB Migration SQL

**Files:**
- Create: `supabase/migrations/20260528000000_senior_onboarding.sql`

- [ ] **Step 1: SQL 작성**

```sql
-- 1) profiles 컬럼 추가
ALTER TABLE h_profiles ADD COLUMN font_scale text NOT NULL DEFAULT 'lg';
ALTER TABLE h_profiles ADD COLUMN prefers_voice_guide boolean NOT NULL DEFAULT false;
ALTER TABLE h_profiles ADD COLUMN sido text;
ALTER TABLE h_profiles ADD COLUMN sigungu text;
ALTER TABLE h_profiles ADD COLUMN kakao_share_done_at timestamp;

-- 2) region은 점진 마이그레이션을 위해 nullable로 변경 (백필 후 V2에서 drop)
ALTER TABLE h_profiles ALTER COLUMN region DROP NOT NULL;

-- 3) verification_badges enum에 first_meeting 추가
ALTER TYPE h_verification_type ADD VALUE IF NOT EXISTS 'first_meeting';

-- 4) hobbies 마스터 시드 (27개) — 기존 onboarding 페이지의 카테고리/항목 그대로
INSERT INTO h_hobbies (id, name, category, icon) VALUES
  ('hb_hiking',   '등산',   '운동', 'mountain'),
  ('hb_golf',     '골프',   '운동', 'golf'),
  ('hb_swim',     '수영',   '운동', 'wave'),
  ('hb_yoga',     '요가',   '운동', 'yoga'),
  ('hb_badminton','배드민턴','운동', 'racket'),
  ('hb_tabletennis','탁구', '운동', 'racket'),
  ('hb_walking',  '걷기',   '운동', 'footprints'),
  ('hb_reading',  '독서',   '문화', 'book'),
  ('hb_movie',    '영화',   '문화', 'film'),
  ('hb_music',    '음악감상','문화', 'music'),
  ('hb_art',      '미술',   '문화', 'palette'),
  ('hb_photo',    '사진',   '문화', 'camera'),
  ('hb_calligraphy','서예', '문화', 'pen'),
  ('hb_cooking',  '요리',   '생활', 'pot'),
  ('hb_gardening','원예',   '생활', 'plant'),
  ('hb_travel',   '여행',   '생활', 'suitcase'),
  ('hb_fishing',  '낚시',   '생활', 'fish'),
  ('hb_baduk',    '바둑',   '생활', 'circle'),
  ('hb_dance',    '댄스',   '생활', 'dance'),
  ('hb_language', '외국어', '교육', 'globe'),
  ('hb_computer', '컴퓨터', '교육', 'laptop'),
  ('hb_instrument','악기연주','교육', 'guitar'),
  ('hb_history',  '역사탐방','교육', 'castle')
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: 마이그레이션 적용**

Run: `bun run db:setup`
Expected: `Applying migration 20260528000000_senior_onboarding.sql ... done`

- [ ] **Step 3: 적용 확인**

Run: `bunx supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name = 'h_profiles' AND column_name IN ('font_scale','sido','sigungu','prefers_voice_guide','kakao_share_done_at');"`
Expected: 5개 row.

Run: `bunx supabase db query "SELECT count(*) FROM h_hobbies;"`
Expected: `>= 23`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260528000000_senior_onboarding.sql
git commit -m "db: senior onboarding migration (profiles cols, badge enum, hobbies seed)"
```

---

## Task 2: Drizzle Schema Sync

**Files:**
- Modify: `src/db/schema/users.ts`

- [ ] **Step 1: profiles 컬럼 추가 + enum 확장**

`src/db/schema/users.ts`:

```ts
export const verificationTypeEnum = pgEnum("h_verification_type", [
  "real_name",
  "face",
  "activity",
  "review",
  "first_meeting",
]);

export const profiles = pgTable("h_profiles", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  birthYear: integer("birth_year"),
  region: text("region"),
  sido: text("sido"),
  sigungu: text("sigungu"),
  fontScale: text("font_scale").notNull().default("lg"),
  prefersVoiceGuide: boolean("prefers_voice_guide").notNull().default(false),
  kakaoShareDoneAt: timestamp("kakao_share_done_at"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
  isVerified: boolean("is_verified").default(false),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free"),
  activityScore: integer("activity_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

- [ ] **Step 2: 타입 체크**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/users.ts
git commit -m "db: sync profiles schema with onboarding migration"
```

---

## Task 3: Static Data (Sido + Nicknames)

**Files:**
- Create: `src/lib/region/sido.ts`
- Create: `src/lib/nickname/recommended.ts`

- [ ] **Step 1: 시도 상수**

`src/lib/region/sido.ts`:

```ts
export const SIDOS = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
] as const;

export type Sido = (typeof SIDOS)[number];
```

- [ ] **Step 2: 닉네임 풀**

`src/lib/nickname/recommended.ts`:

```ts
const POOL = [
  "행복한아침", "봄바람", "달빛산책", "푸른하늘", "따뜻한오후", "별빛여행",
  "맑은물소리", "산들바람", "노을지는길", "꽃피는마음", "느린걸음", "조용한숲",
  "은하수꿈", "포근한이불", "햇살가득", "바람의노래", "고요한호수", "초록잎새",
  "구름타는날", "달빛아래", "마음의쉼터", "오늘도좋은날", "감사한하루",
  "다정한이웃", "정다운목소리", "따스한손길", "고운미소", "온화한봄날",
  "한걸음한걸음", "느긋한오후",
];

export function pickNicknameCandidates(count = 6): string[] {
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

- [ ] **Step 3: 타입 체크**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/region/sido.ts src/lib/nickname/recommended.ts
git commit -m "feat(onboarding): add sido constants and nickname pool"
```

---

## Task 4: FontScaleProvider + root layout

**Files:**
- Create: `src/components/providers/FontScaleProvider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: FontScaleProvider 작성**

`src/components/providers/FontScaleProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type FontScale = "sm" | "md" | "lg" | "xl";

interface Ctx {
  scale: FontScale;
  setScale: (s: FontScale) => void;
}

const FontScaleContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "harmony.fontScale";

export function FontScaleProvider({
  children,
  initial = "lg",
}: {
  children: React.ReactNode;
  initial?: FontScale;
}) {
  const [scale, setScaleState] = useState<FontScale>(initial);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as
      | FontScale
      | null;
    if (saved) setScaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.fontScale = scale;
  }, [scale]);

  const setScale = (s: FontScale) => {
    setScaleState(s);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, s);
  };

  return (
    <FontScaleContext.Provider value={{ scale, setScale }}>{children}</FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const ctx = useContext(FontScaleContext);
  if (!ctx) throw new Error("useFontScale must be used within FontScaleProvider");
  return ctx;
}
```

- [ ] **Step 2: globals.css에 CSS 변수 추가**

`src/app/globals.css` 하단에 추가:

```css
:root[data-font-scale="sm"] { font-size: 14px; }
:root[data-font-scale="md"] { font-size: 16px; }
:root[data-font-scale="lg"] { font-size: 18px; }
:root[data-font-scale="xl"] { font-size: 20px; }
```

- [ ] **Step 3: root layout에 통합**

`src/app/layout.tsx`에서 children을 `<FontScaleProvider>`로 감쌈:

```tsx
import { FontScaleProvider } from "@/components/providers/FontScaleProvider";
// ...
<body>
  <FontScaleProvider>
    {children}
  </FontScaleProvider>
</body>
```

- [ ] **Step 4: 타입·린트·구동 확인**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

Run: `bun run dev`. 브라우저에서 DevTools Console로:
```js
document.documentElement.dataset.fontScale = "xl"
```
Expected: 본문 글자 크기가 즉시 커짐.

- [ ] **Step 5: Commit**

```bash
git add src/components/providers/FontScaleProvider.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat(onboarding): add FontScaleProvider with global CSS scaling"
```

---

## Task 5: VoiceGuide Helper

**Files:**
- Create: `src/lib/voice/speak.ts`

- [ ] **Step 1: TTS wrapper 작성**

`src/lib/voice/speak.ts`:

```ts
"use client";

const PREFS_KEY = "harmony.voiceGuide";

export function setVoiceGuideEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, enabled ? "1" : "0");
}

export function isVoiceGuideEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREFS_KEY) === "1";
}

export function speak(text: string): void {
  if (typeof window === "undefined") return;
  if (!isVoiceGuideEnabled()) return;
  if (!("speechSynthesis" in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {
    // iOS Safari throws if not user-initiated. Silently skip.
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/voice/speak.ts
git commit -m "feat(onboarding): add voice guide TTS wrapper"
```

---

## Task 6: Kakao OAuth on Login + Register

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `.env.example`

**Prereq:** Supabase 콘솔에서 Kakao OAuth provider 활성화 + redirect URL 등록 (`<APP_URL>/api/auth/callback`). 이 작업은 코드 task 아님 — Operator Manual Setup 섹션 참고.

- [ ] **Step 1: 카카오 OAuth 핸들러 추가**

두 페이지 상단에 (handler 신규):

```tsx
async function handleKakaoLogin() {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding` },
  });
}
```

- [ ] **Step 2: register 페이지 UI 변경**

`src/app/(auth)/register/page.tsx`의 `<CardContent>` 최상단에 카카오 버튼을 가장 크게 노출:

```tsx
<button
  type="button"
  onClick={handleKakaoLogin}
  className="mb-6 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] text-lg font-extrabold text-[#191919] active:scale-[0.98]"
>
  💬 카카오로 시작하기
</button>
<div className="mb-6 flex items-center gap-3 text-mocha-500">
  <hr className="flex-1 border-mocha-200" />
  <span className="text-sm">또는 이메일로</span>
  <hr className="flex-1 border-mocha-200" />
</div>
```

기존 이메일·비번 form은 그대로 유지.

- [ ] **Step 3: login 페이지에 동일 카카오 버튼 추가**

`src/app/(auth)/login/page.tsx`에 같은 패턴 적용.

- [ ] **Step 4: env.example 갱신**

`.env.example`에 주석 추가 (실 키는 Supabase 콘솔에 입력):

```
# Supabase Kakao OAuth (configured in Supabase dashboard, not env)
# Redirect URL: <APP_URL>/api/auth/callback
```

- [ ] **Step 5: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 6: 수동 verification**

Run: `bun run dev`. `/register`에서 카카오 버튼이 큰 노란 버튼으로 보이는지 확인. 클릭 시 Supabase OAuth URL로 이동하는지 (`signInWithOAuth` 호출됨). 실제 카카오 인증은 provider 설정 후 가능.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx .env.example
git commit -m "feat(auth): add Kakao OAuth entry on login/register"
```

---

## Task 7: Onboarding 5-step Page

**Files:**
- Modify: `src/app/(auth)/onboarding/page.tsx`
- Create: `src/components/onboarding/StepFontScale.tsx`
- Create: `src/components/onboarding/StepNickname.tsx`
- Create: `src/components/onboarding/StepRegion.tsx`
- Create: `src/components/onboarding/StepHobby.tsx`

- [ ] **Step 1: StepFontScale 컴포넌트**

`src/components/onboarding/StepFontScale.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { useFontScale, type FontScale } from "@/components/providers/FontScaleProvider";
import { setVoiceGuideEnabled, isVoiceGuideEnabled } from "@/lib/voice/speak";
import { useState } from "react";

const OPTIONS: { value: FontScale; label: string; sample: string }[] = [
  { value: "sm", label: "작게", sample: "text-base" },
  { value: "md", label: "보통", sample: "text-lg" },
  { value: "lg", label: "큼", sample: "text-xl" },
  { value: "xl", label: "아주큼", sample: "text-2xl" },
];

export function StepFontScale({ onNext }: { onNext: () => void }) {
  const { scale, setScale } = useFontScale();
  const [voiceOn, setVoiceOn] = useState(isVoiceGuideEnabled());

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold text-mocha-900">글자 크기를 골라주세요</h2>
        <p className="mt-2 text-mocha-700">언제든 마이페이지에서 바꿀 수 있어요</p>
      </header>
      <div className="space-y-3">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setScale(o.value)}
            aria-pressed={scale === o.value}
            className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 ${
              scale === o.value
                ? "border-coral-500 bg-coral-50"
                : "border-mocha-200 bg-white"
            }`}
          >
            <span className="font-bold">{o.label}</span>
            <span className={`${o.sample} text-mocha-700`}>가 나 다</span>
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 rounded-xl bg-cream-50 p-4">
        <input
          type="checkbox"
          checked={voiceOn}
          onChange={(e) => {
            setVoiceOn(e.target.checked);
            setVoiceGuideEnabled(e.target.checked);
          }}
          className="h-6 w-6"
        />
        <span>🔊 안내 음성으로 듣기</span>
      </label>
      <Button className="w-full" size="lg" onClick={onNext}>
        다음
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: StepNickname**

`src/components/onboarding/StepNickname.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pickNicknameCandidates } from "@/lib/nickname/recommended";

export function StepNickname({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const candidates = useMemo(() => pickNicknameCandidates(6), []);
  const [custom, setCustom] = useState(false);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold text-mocha-900">뭐라고 불러드릴까요?</h2>
      </header>
      {!custom && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {candidates.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-pressed={value === n}
                className={`min-h-[60px] rounded-2xl border-2 px-3 text-lg font-bold ${
                  value === n
                    ? "border-coral-500 bg-coral-50"
                    : "border-mocha-200 bg-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCustom(true)}
            className="block w-full text-center text-mocha-700 underline"
          >
            또는 직접 입력
          </button>
        </>
      )}
      {custom && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="나의 닉네임"
          maxLength={20}
        />
      )}
      <Button className="w-full" size="lg" disabled={!value.trim()} onClick={onNext}>
        다음
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: StepRegion**

`src/components/onboarding/StepRegion.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SIDOS } from "@/lib/region/sido";

export function StepRegion({
  sido,
  sigungu,
  onChangeSido,
  onChangeSigungu,
  onNext,
}: {
  sido: string;
  sigungu: string;
  onChangeSido: (v: string) => void;
  onChangeSigungu: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold text-mocha-900">어디에 살고 계세요?</h2>
        <p className="mt-2 text-mocha-700">시·도는 필수, 시·군·구는 비워두셔도 돼요</p>
      </header>
      <div className="space-y-3">
        <select
          value={sido}
          onChange={(e) => onChangeSido(e.target.value)}
          className="h-14 w-full rounded-2xl border-2 border-mocha-200 bg-white px-4 text-lg"
        >
          <option value="">시·도를 선택하세요</option>
          {SIDOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Input
          value={sigungu}
          onChange={(e) => onChangeSigungu(e.target.value)}
          placeholder="시·군·구 (예: 송파구) — 선택"
          maxLength={20}
        />
      </div>
      <Button className="w-full" size="lg" disabled={!sido} onClick={onNext}>
        다음
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: StepHobby**

`src/components/onboarding/StepHobby.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Hobby { id: string; name: string; category: string }

export function StepHobby({
  value,
  onChange,
  onSubmit,
  submitting,
}: {
  value: string;
  onChange: (id: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);

  useEffect(() => {
    fetch("/api/hobbies")
      .then((r) => r.json())
      .then((j) => setHobbies(j.data ?? []))
      .catch(() => setHobbies([]));
  }, []);

  const grouped = Object.entries(
    hobbies.reduce<Record<string, Hobby[]>>((acc, h) => {
      acc[h.category] = acc[h.category] || [];
      acc[h.category].push(h);
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold text-mocha-900">
          관심 있는 활동 하나를 골라주세요
        </h2>
        <p className="mt-2 text-mocha-700">더 추가는 나중에 할 수 있어요</p>
      </header>
      <div className="space-y-5">
        {grouped.map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <h3 className="font-bold text-mocha-800">{cat}</h3>
            <div className="flex flex-wrap gap-2">
              {items.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onChange(h.id)}
                  aria-pressed={value === h.id}
                  className={`rounded-full border-2 px-4 py-2 text-lg ${
                    value === h.id
                      ? "border-coral-500 bg-coral-500 text-white"
                      : "border-mocha-200 bg-white text-mocha-900"
                  }`}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button className="w-full" size="lg" disabled={!value || submitting} onClick={onSubmit}>
        {submitting ? "저장 중이에요..." : "시작하기"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: 보조 API — GET /api/hobbies**

Create `src/app/api/hobbies/route.ts`:

```ts
import { db } from "@/db";
import { hobbies } from "@/db/schema";
import { successResponse, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const rows = await db.select().from(hobbies);
    return successResponse(rows);
  } catch {
    return serverError();
  }
}
```

- [ ] **Step 6: onboarding 페이지 재구성**

`src/app/(auth)/onboarding/page.tsx` 전체 교체:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/ui/step-indicator";
import { StepFontScale } from "@/components/onboarding/StepFontScale";
import { StepNickname } from "@/components/onboarding/StepNickname";
import { StepRegion } from "@/components/onboarding/StepRegion";
import { StepHobby } from "@/components/onboarding/StepHobby";
import { useFontScale } from "@/components/providers/FontScaleProvider";
import { isVoiceGuideEnabled } from "@/lib/voice/speak";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { scale } = useFontScale();
  const [step, setStep] = useState<Step>(1);
  const [nickname, setNickname] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [hobbyId, setHobbyId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          sido,
          sigungu: sigungu || null,
          hobbyId,
          fontScale: scale,
          prefersVoiceGuide: isVoiceGuideEnabled(),
        }),
      });
      const j = await r.json();
      if (!j.success) {
        setError(j.error?.message ?? "저장에 실패했어요");
        return;
      }
      router.push("/welcome");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <div className="mb-7 flex justify-center">
          <StepIndicator
            steps={[
              { label: "글자" },
              { label: "닉네임" },
              { label: "지역" },
              { label: "취미" },
            ]}
            current={step}
            ariaLabel="시작하기 진행 단계"
          />
        </div>
        {error && <p className="mb-4 text-coral-700">{error}</p>}
        {step === 1 && <StepFontScale onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepNickname value={nickname} onChange={setNickname} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <StepRegion
            sido={sido}
            sigungu={sigungu}
            onChangeSido={setSido}
            onChangeSigungu={setSigungu}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StepHobby
            value={hobbyId}
            onChange={setHobbyId}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 8: dev server verification**

Run: `bun run dev`. 가입 후 `/onboarding` 접근. 4단계 진행이 이루어지는지. (현재 Task 8 미완성이므로 마지막 제출은 실패함 — 정상)

- [ ] **Step 9: Commit**

```bash
git add src/app/\(auth\)/onboarding/page.tsx src/components/onboarding/ src/app/api/hobbies/route.ts
git commit -m "feat(onboarding): rebuild signup as 4-step (post-auth) with hobby fetch"
```

---

## Task 8: POST /api/onboarding/complete

**Files:**
- Create: `src/app/api/onboarding/complete/route.ts`

- [ ] **Step 1: API 작성**

```ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db";
import { profiles, userHobbies, verificationBadges } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  successResponse,
  unauthorizedError,
  validationError,
  serverError,
} from "@/lib/api-response";

const Body = z.object({
  nickname: z.string().min(1).max(20),
  sido: z.string().min(1),
  sigungu: z.string().max(20).nullable().optional(),
  hobbyId: z.string().min(1),
  fontScale: z.enum(["sm", "md", "lg", "xl"]),
  prefersVoiceGuide: z.boolean(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const v = parsed.data;
  const region = v.sigungu ? `${v.sido} ${v.sigungu}` : v.sido;

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, user.id));

      if (existing.length === 0) {
        await tx.insert(profiles).values({
          id: user.id,
          nickname: v.nickname,
          region,
          sido: v.sido,
          sigungu: v.sigungu ?? null,
          fontScale: v.fontScale,
          prefersVoiceGuide: v.prefersVoiceGuide,
        });
      } else {
        await tx
          .update(profiles)
          .set({
            nickname: v.nickname,
            region,
            sido: v.sido,
            sigungu: v.sigungu ?? null,
            fontScale: v.fontScale,
            prefersVoiceGuide: v.prefersVoiceGuide,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, user.id));
      }

      await tx
        .insert(userHobbies)
        .values({ userId: user.id, hobbyId: v.hobbyId })
        .onConflictDoNothing();

      await tx.insert(verificationBadges).values({
        id: createId(),
        userId: user.id,
        type: "first_meeting",
      });
    });

    return successResponse({ ok: true });
  } catch (e) {
    console.error("[onboarding/complete] failed", e);
    return serverError();
  }
}
```

- [ ] **Step 2: cuid2 의존성 확인**

Run: `cat package.json | grep -i cuid`
없으면 추가: `bun add @paralleldrive/cuid2`

- [ ] **Step 3: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 4: dev server verification**

Run: `bun run dev`. 가입 후 `/onboarding`에서 4단계 완주 → `/welcome`로 redirect되는지 확인. Supabase studio 또는 SQL로:
```sql
SELECT id, nickname, sido, sigungu, font_scale, prefers_voice_guide FROM h_profiles WHERE id = '<user_id>';
SELECT * FROM h_user_hobbies WHERE user_id = '<user_id>';
SELECT * FROM h_verification_badges WHERE user_id = '<user_id>';
```
Expected: 각각 1 row.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/onboarding/complete/route.ts package.json bun.lock
git commit -m "feat(onboarding): persist 4-step input via transactional insert"
```

---

## Task 9: GET /api/onboarding/welcome

**Files:**
- Create: `src/app/api/onboarding/welcome/route.ts`

- [ ] **Step 1: API 작성**

```ts
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { successResponse, unauthorizedError, serverError } from "@/lib/api-response";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const me = await db
      .select({ sido: profiles.sido, sigungu: profiles.sigungu })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!me[0]?.sido) {
      return successResponse({ regionMemberCount: 0, regionLabel: "전국", peerSamples: [] });
    }

    const { sido, sigungu } = me[0];

    // 1) 시군구 우선 카운트
    let regionLabel = sigungu ? `${sido} ${sigungu}` : sido;
    const sigunguCount = sigungu
      ? await db
          .select({ c: sql<number>`count(*)::int` })
          .from(profiles)
          .where(and(eq(profiles.sido, sido), eq(profiles.sigungu, sigungu)))
      : null;

    let regionMemberCount = sigunguCount?.[0]?.c ?? 0;

    if (regionMemberCount < 10) {
      const sidoCount = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(profiles)
        .where(eq(profiles.sido, sido));
      regionMemberCount = sidoCount[0]?.c ?? 0;
      regionLabel = sido;
    }

    if (regionMemberCount < 10) {
      const total = await db.select({ c: sql<number>`count(*)::int` }).from(profiles);
      regionMemberCount = total[0]?.c ?? 0;
      regionLabel = "전국";
    }

    // 2) 또래 샘플 (같은 sido 최근 활동 회원 3명, 본인 제외)
    const peers = await db
      .select({ nickname: profiles.nickname })
      .from(profiles)
      .where(and(eq(profiles.sido, sido), ne(profiles.id, user.id), isNotNull(profiles.nickname)))
      .limit(3);

    return successResponse({
      regionMemberCount,
      regionLabel,
      peerSamples: peers.map((p) => ({ nickname: p.nickname })),
    });
  } catch (e) {
    console.error("[onboarding/welcome] failed", e);
    return serverError();
  }
}
```

- [ ] **Step 2: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 3: curl verification**

Run: `bun run dev`. 로그인 상태에서:
```
curl -b 'sb-...=<session-cookie>' http://localhost:3000/api/onboarding/welcome
```
Expected: `{"success":true,"data":{"regionMemberCount":<n>,"regionLabel":"...","peerSamples":[...]}}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/onboarding/welcome/route.ts
git commit -m "feat(onboarding): GET /api/onboarding/welcome (region count + peers)"
```

---

## Task 10: Welcome Fullscreen Page + Confetti

**Files:**
- Create: `src/app/(main)/welcome/page.tsx`
- Create: `src/components/onboarding/Confetti.tsx`

- [ ] **Step 1: Confetti CSS 컴포넌트**

`src/components/onboarding/Confetti.tsx`:

```tsx
"use client";

const COLORS = ["#FF6F61", "#FFB84C", "#FFE07A", "#7ED6A0", "#7CC4FF", "#C58BFF"];

export function Confetti({ count = 24 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.4 + Math.random() * 1.2;
        const color = COLORS[i % COLORS.length];
        return (
          <span
            key={i}
            className="absolute -top-4 h-2 w-2 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Welcome 페이지**

`src/app/(main)/welcome/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/onboarding/Confetti";
import { speak } from "@/lib/voice/speak";

interface WelcomeData {
  regionMemberCount: number;
  regionLabel: string;
  peerSamples: { nickname: string }[];
}

export default function WelcomePage() {
  const [data, setData] = useState<WelcomeData | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/welcome")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setData(j.data);
          speak(`${j.data.regionLabel}의 ${j.data.regionMemberCount}명이 환영합니다`);
        }
      })
      .catch(() => setData(null));
  }, []);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <Confetti />
      <div className="relative z-10 max-w-md space-y-8">
        <div className="text-6xl">✨</div>
        <h1 className="text-3xl font-extrabold text-mocha-900 leading-tight">
          {data?.regionLabel ?? "전국"}의
          <br />
          {data ? data.regionMemberCount.toLocaleString() : "—"}명이
          <br />
          환영해요
        </h1>
        {data && data.peerSamples.length > 0 && (
          <div className="flex justify-center gap-3">
            {data.peerSamples.map((p) => (
              <div key={p.nickname} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral-100 text-xl font-bold text-coral-700">
                  {p.nickname.slice(0, 1)}
                </div>
                <p className="mt-2 text-sm text-mocha-700">{p.nickname}</p>
              </div>
            ))}
          </div>
        )}
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-orange-700">
          🏅 첫 만남 배지를 받았어요
        </div>
        <Link href="/" className="block">
          <Button className="w-full" size="lg" asChild>
            <span>다음 →</span>
          </Button>
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 4: dev server verification**

Run: `bun run dev`. 가입~온보딩 완주 후 `/welcome`에 도달, Confetti가 떨어지고 환영 텍스트와 또래 아바타 3개 표시되는지 확인. "다음" 클릭 시 `/`로.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main\)/welcome/page.tsx src/components/onboarding/Confetti.tsx
git commit -m "feat(onboarding): add fullscreen welcome page with confetti"
```

---

## Task 11: GET /api/onboarding/cohort

**Files:**
- Create: `src/app/api/onboarding/cohort/route.ts`

- [ ] **Step 1: API 작성**

```ts
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { successResponse, unauthorizedError, serverError } from "@/lib/api-response";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function joinedAgoLabel(createdAt: Date): string {
  const days = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "오늘 시작";
  if (days === 1) return "어제 시작";
  return `${days}일 전 시작`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const me = await db
      .select({ sido: profiles.sido, sigungu: profiles.sigungu })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    const sido = me[0]?.sido;
    if (!sido) return successResponse({ peers: [] });

    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    const query = db
      .select({ nickname: profiles.nickname, createdAt: profiles.createdAt })
      .from(profiles)
      .where(
        and(
          eq(profiles.sido, sido),
          ne(profiles.id, user.id),
          gte(profiles.createdAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(profiles.createdAt))
      .limit(5);

    const rows = await query;
    const peers = rows.map((r) => ({
      nickname: r.nickname,
      joinedAgo: r.createdAt ? joinedAgoLabel(r.createdAt) : "최근 시작",
    }));

    return successResponse({ peers });
  } catch (e) {
    console.error("[onboarding/cohort] failed", e);
    return serverError();
  }
}
```

- [ ] **Step 2: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 3: curl verification**

```
curl -b '<cookie>' http://localhost:3000/api/onboarding/cohort
```
Expected: `{"success":true,"data":{"peers":[...]}}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/onboarding/cohort/route.ts
git commit -m "feat(onboarding): GET /api/onboarding/cohort (recent peers in sido)"
```

---

## Task 12: GET /api/onboarding/first-club

**Files:**
- Create: `src/app/api/onboarding/first-club/route.ts`

- [ ] **Step 1: API 작성**

```ts
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clubMembers, clubs, hobbies, profiles, userHobbies } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { successResponse, unauthorizedError, serverError } from "@/lib/api-response";
import { scoreClubs } from "@/lib/recommendation";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const me = await db
      .select({ sido: profiles.sido, birthYear: profiles.birthYear })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    const sido = me[0]?.sido;
    if (!sido) return successResponse({ club: null });

    const userHobbyRows = await db
      .select({ name: hobbies.name, category: hobbies.category })
      .from(userHobbies)
      .innerJoin(hobbies, eq(userHobbies.hobbyId, hobbies.id))
      .where(eq(userHobbies.userId, user.id));
    const hobbyCategories = userHobbyRows.map((h) => h.category);

    const allClubs = await db.select().from(clubs).limit(200);
    if (allClubs.length === 0) return successResponse({ club: null });

    const clubIds = allClubs.map((c) => c.id);
    const memberRows = clubIds.length
      ? await db
          .select({ clubId: clubMembers.clubId, userId: clubMembers.userId })
          .from(clubMembers)
          .where(inArray(clubMembers.clubId, clubIds))
      : [];
    const membersByClub = new Map<string, string[]>();
    for (const m of memberRows) {
      if (!membersByClub.has(m.clubId)) membersByClub.set(m.clubId, []);
      membersByClub.get(m.clubId)!.push(m.userId);
    }

    const forScoring = allClubs.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      region: c.region,
      memberCount: c.memberCount ?? 0,
      members: membersByClub.get(c.id) ?? [],
    }));

    const scored = scoreClubs(
      {
        id: user.id,
        region: sido,
        birthYear: me[0]?.birthYear ?? null,
        hobbies: hobbyCategories,
      },
      forScoring
    );

    const top = scored[0];
    if (!top) return successResponse({ club: null });

    const club = allClubs.find((c) => c.id === top.id);
    if (!club) return successResponse({ club: null });

    return successResponse({
      club: {
        id: club.id,
        name: club.name,
        category: club.category,
        description: club.description ?? "",
        memberCount: club.memberCount ?? 0,
        reasons: top.reasons,
      },
    });
  } catch (e) {
    console.error("[onboarding/first-club] failed", e);
    return serverError();
  }
}
```

- [ ] **Step 2: clubs / clubMembers 컬럼명 확인**

Run: `bunx tsc --noEmit`
Expected: 0 errors. 만약 `clubs.region` 또는 `clubMembers.userId` 컬럼명이 다르면 schema에 맞춰 조정.

- [ ] **Step 3: curl verification**

```
curl -b '<cookie>' http://localhost:3000/api/onboarding/first-club
```
Expected: `{"success":true,"data":{"club":{...}}}` 또는 `{"club":null}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/onboarding/first-club/route.ts
git commit -m "feat(onboarding): GET /api/onboarding/first-club (recommended top match)"
```

---

## Task 13: OnboardingCarousel + Card Components

**Files:**
- Create: `src/components/onboarding/OperatorCard.tsx`
- Create: `src/components/onboarding/CohortCard.tsx`
- Create: `src/components/onboarding/FirstClubCard.tsx`
- Create: `src/components/onboarding/OnboardingCarousel.tsx`
- Create: `src/lib/onboarding/storage.ts`

- [ ] **Step 1: dismiss storage helper**

`src/lib/onboarding/storage.ts`:

```ts
const KEY = "harmony.onboarding.dismissed";

type CardId = "operator" | "cohort" | "first-club" | "kakao-share" | "notif-opt-in";

export function isDismissed(id: CardId): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const arr = JSON.parse(raw) as CardId[];
    return arr.includes(id);
  } catch {
    return false;
  }
}

export function dismiss(id: CardId) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(KEY);
  let arr: CardId[] = [];
  try {
    arr = raw ? (JSON.parse(raw) as CardId[]) : [];
  } catch {}
  if (!arr.includes(id)) arr.push(id);
  localStorage.setItem(KEY, JSON.stringify(arr));
}
```

- [ ] **Step 2: OperatorCard**

`src/components/onboarding/OperatorCard.tsx`:

```tsx
"use client";

const NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "운영팀 김미경";
const KAKAO = process.env.NEXT_PUBLIC_OPERATOR_KAKAO_CHANNEL_URL ?? "";

export function OperatorCard() {
  return (
    <article className="space-y-4 rounded-2xl bg-white p-6">
      <p className="text-2xl">👋</p>
      <h3 className="text-lg font-extrabold">안녕하세요, 저는 {NAME}입니다</h3>
      <p className="text-mocha-700">처음이 어려울 수 있어요. 언제든 카톡으로 물어보세요.</p>
      {KAKAO && (
        <a
          href={KAKAO}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-xl bg-[#FEE500] px-4 py-3 font-bold text-[#191919]"
        >
          💬 카카오상담 열기
        </a>
      )}
    </article>
  );
}
```

- [ ] **Step 3: CohortCard**

`src/components/onboarding/CohortCard.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface Peer { nickname: string; joinedAgo: string }

export function CohortCard() {
  const [peers, setPeers] = useState<Peer[] | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/cohort")
      .then((r) => r.json())
      .then((j) => setPeers(j.success ? j.data.peers : []))
      .catch(() => setPeers([]));
  }, []);

  if (!peers || peers.length === 0) return null;

  return (
    <article className="space-y-3 rounded-2xl bg-white p-6">
      <p className="text-2xl">👥</p>
      <h3 className="text-lg font-extrabold">함께 시작한 {peers.length}명</h3>
      <ul className="space-y-2">
        {peers.map((p) => (
          <li key={p.nickname} className="flex items-center justify-between">
            <span>⊙ {p.nickname}</span>
            <span className="text-sm text-mocha-700">{p.joinedAgo}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
```

- [ ] **Step 4: FirstClubCard**

`src/components/onboarding/FirstClubCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Club {
  id: string;
  name: string;
  category: string;
  description: string;
  memberCount: number;
  reasons: string[];
}

export function FirstClubCard() {
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/first-club")
      .then((r) => r.json())
      .then((j) => setClub(j.success ? j.data.club : null))
      .catch(() => setClub(null));
  }, []);

  if (!club) return null;

  return (
    <article className="space-y-3 rounded-2xl bg-white p-6">
      <p className="text-sm text-mocha-600">✨ 어울리는 모임</p>
      <h3 className="text-xl font-extrabold">{club.name}</h3>
      <p className="text-sm text-mocha-700">
        #{club.category} · 멤버 {club.memberCount}명
      </p>
      {club.description && <p className="text-mocha-800">"{club.description}"</p>}
      <Link
        href={`/club/${club.id}`}
        className="inline-block rounded-xl bg-coral-500 px-4 py-3 font-bold text-white"
      >
        자세히 보기
      </Link>
    </article>
  );
}
```

- [ ] **Step 5: OnboardingCarousel**

`src/components/onboarding/OnboardingCarousel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { OperatorCard } from "./OperatorCard";
import { CohortCard } from "./CohortCard";
import { FirstClubCard } from "./FirstClubCard";
import { dismiss, isDismissed } from "@/lib/onboarding/storage";

const CARDS = [
  { id: "operator" as const, Component: OperatorCard },
  { id: "cohort" as const, Component: CohortCard },
  { id: "first-club" as const, Component: FirstClubCard },
];

export function OnboardingCarousel() {
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(CARDS.filter((c) => isDismissed(c.id)).map((c) => c.id))
  );

  const visible = CARDS.filter((c) => !hidden.has(c.id));
  if (visible.length === 0) return null;

  const current = visible[Math.min(active, visible.length - 1)];

  function handleDismiss(id: string) {
    dismiss(id as Parameters<typeof dismiss>[0]);
    setHidden((s) => new Set(s).add(id));
    setActive(0);
  }

  return (
    <section className="relative">
      <div className="rounded-2xl bg-cream-50 p-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => handleDismiss(current.id)}
            aria-label="이 카드 닫기"
            className="absolute right-2 top-2 z-10 rounded-full bg-white p-1 shadow"
          >
            <X size={20} />
          </button>
          <current.Component />
        </div>
        {visible.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {visible.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${i + 1}번째 카드`}
                className={`h-2 w-2 rounded-full ${
                  i === Math.min(active, visible.length - 1) ? "bg-coral-500" : "bg-mocha-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/ src/lib/onboarding/storage.ts
git commit -m "feat(onboarding): add home carousel (operator/cohort/first-club)"
```

---

## Task 14: Home Integration

**Files:**
- Modify: `src/app/(main)/page.tsx`

- [ ] **Step 1: 7일 경과 여부 판단 후 carousel 통합**

`src/app/(main)/page.tsx` 상단에 server-side로 가입일을 가져와 7일 이내일 때만 carousel 노출:

```tsx
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showCarousel = false;
  if (user) {
    const [me] = await db
      .select({ createdAt: profiles.createdAt })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (me?.createdAt && Date.now() - me.createdAt.getTime() < SEVEN_DAYS_MS) {
      showCarousel = true;
    }
  }

  return (
    <main className="space-y-6 px-4 pb-24 pt-6">
      {showCarousel && <OnboardingCarousel />}
      {/* ... 기존 4타일 또는 기존 콘텐츠 유지 ... */}
    </main>
  );
}
```

기존 `(main)/page.tsx` 본문은 보존하고 carousel을 상단에 prepend.

- [ ] **Step 2: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 3: dev server verification**

Run: `bun run dev`. 새 사용자로 가입~온보딩~welcome 완주 후 `/` 진입 시 상단에 carousel 카드가 보이는지. X 클릭하면 다음 카드로, 모두 닫으면 사라지는지.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(main\)/page.tsx
git commit -m "feat(onboarding): mount OnboardingCarousel for first 7 days on home"
```

---

## Task 15: KakaoShareButton (자녀 알리기)

**Files:**
- Create: `src/lib/kakao/share.ts`
- Create: `src/components/onboarding/KakaoShareButton.tsx`
- Modify: `src/app/layout.tsx` (Kakao SDK script)
- Modify: `src/app/(main)/page.tsx` (mount button)
- Modify: `.env.example`

- [ ] **Step 1: Kakao SDK loader**

`src/lib/kakao/share.ts`:

```ts
declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (opts: Record<string, unknown>) => void;
      };
    };
  }
}

export function initKakao() {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return;
  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
}

export function shareToKakao(opts: {
  title: string;
  description: string;
  imageUrl: string;
  link: string;
}) {
  if (typeof window === "undefined" || !window.Kakao?.isInitialized()) return false;
  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: opts.title,
      description: opts.description,
      imageUrl: opts.imageUrl,
      link: { mobileWebUrl: opts.link, webUrl: opts.link },
    },
    buttons: [
      { title: "함께 보기", link: { mobileWebUrl: opts.link, webUrl: opts.link } },
    ],
  });
  return true;
}
```

- [ ] **Step 2: SDK script + .env.example**

`src/app/layout.tsx`의 `<head>` 또는 `<body>` 마지막에 추가:

```tsx
import Script from "next/script";
// ...
<Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" strategy="afterInteractive" />
```

`.env.example`에 추가:

```
NEXT_PUBLIC_KAKAO_JS_KEY=
NEXT_PUBLIC_OPERATOR_NAME=
NEXT_PUBLIC_OPERATOR_KAKAO_CHANNEL_URL=
NEXT_PUBLIC_OPERATOR_AVATAR_URL=
```

- [ ] **Step 3: KakaoShareButton 컴포넌트**

`src/components/onboarding/KakaoShareButton.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { initKakao, shareToKakao } from "@/lib/kakao/share";
import { isDismissed, dismiss } from "@/lib/onboarding/storage";

export function KakaoShareButton() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    initKakao();
    if (isDismissed("kakao-share")) setHidden(true);
  }, []);

  if (hidden) return null;

  function handleClick() {
    const ok = shareToKakao({
      title: "어머니가 하모니에 가입하셨어요",
      description: "55세 이상 친구들의 활동 공간 · 함께 보세요",
      imageUrl: `${window.location.origin}/og.png`,
      link: window.location.origin,
    });
    if (ok) {
      fetch("/api/onboarding/share-done", { method: "POST" }).catch(() => {});
      dismiss("kakao-share");
      setHidden(true);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-soft"
    >
      <span className="font-bold">📱 자녀에게 가입 알리기</span>
      <span>↗</span>
    </button>
  );
}
```

- [ ] **Step 4: 보조 API — POST /api/onboarding/share-done**

Create `src/app/api/onboarding/share-done/route.ts`:

```ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { successResponse, unauthorizedError, serverError } from "@/lib/api-response";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();
  try {
    await db
      .update(profiles)
      .set({ kakaoShareDoneAt: new Date() })
      .where(eq(profiles.id, user.id));
    return successResponse({ ok: true });
  } catch {
    return serverError();
  }
}
```

- [ ] **Step 5: home에 mount**

`src/app/(main)/page.tsx`에서 carousel 다음에 추가 (가입 24시간 이내일 때만):

```tsx
import { KakaoShareButton } from "@/components/onboarding/KakaoShareButton";
// ...
{showCarousel && me?.createdAt && Date.now() - me.createdAt.getTime() < 24 * 60 * 60 * 1000 && (
  <KakaoShareButton />
)}
```

- [ ] **Step 6: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 7: dev server verification**

ENV에 `NEXT_PUBLIC_KAKAO_JS_KEY`를 임시 값으로 세팅 후 `bun run dev`. 가입 직후 홈에서 "자녀에게 가입 알리기" 카드가 보이는지. (Kakao 키 없으면 클릭해도 동작 안 함 — 의도된 동작)

- [ ] **Step 8: Commit**

```bash
git add src/lib/kakao/share.ts src/components/onboarding/KakaoShareButton.tsx src/app/api/onboarding/share-done/route.ts src/app/layout.tsx src/app/\(main\)/page.tsx .env.example
git commit -m "feat(onboarding): add Kakao share button for child notification"
```

---

## Task 16: NotificationOptInCard

**Files:**
- Create: `src/components/onboarding/NotificationOptInCard.tsx`
- Modify: `src/app/(main)/page.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/onboarding/NotificationOptInCard.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { subscribeUser } from "@/lib/notifications";
import { isDismissed, dismiss } from "@/lib/onboarding/storage";

export function NotificationOptInCard() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isDismissed("notif-opt-in")) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    setHidden(false);
  }, []);

  if (hidden) return null;

  async function handleOptIn() {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await subscribeUser();
      }
    } finally {
      dismiss("notif-opt-in");
      setHidden(true);
    }
  }

  return (
    <button
      type="button"
      onClick={handleOptIn}
      className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-soft"
    >
      <span className="font-bold">🔔 내일 모임 알림 받기 (1탭)</span>
      <span>→</span>
    </button>
  );
}
```

**중요**: `src/lib/notifications.ts`에 `subscribeUser`가 없다면, 기존 모듈에서 해당 클라이언트 함수 이름을 확인하고 맞춰 import. 만약 함수가 export 안 되어 있으면 다음 step에서 추가.

- [ ] **Step 2: notifications.ts 확인 및 보강**

Run: `grep -n "export" src/lib/notifications.ts`로 export 확인. 클라이언트 subscribe 함수가 없으면 다음을 추가:

```ts
export async function subscribeUser() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  });
  await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
}
```

(이미 있다면 그대로 사용)

- [ ] **Step 3: home에 mount**

`src/app/(main)/page.tsx`에 `KakaoShareButton` 다음 줄에 추가:

```tsx
import { NotificationOptInCard } from "@/components/onboarding/NotificationOptInCard";
// ...
{showCarousel && <NotificationOptInCard />}
```

- [ ] **Step 4: 타입·린트**

Run: `bunx tsc --noEmit && bun run lint`
Expected: 0 errors.

- [ ] **Step 5: dev server verification**

`bun run dev`. 홈 진입 시 "내일 모임 알림 받기" 카드가 보이는지. 클릭 시 브라우저 알림 권한 팝업 뜨는지. 거부/승인 모두 카드가 사라지는지.

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/NotificationOptInCard.tsx src/app/\(main\)/page.tsx src/lib/notifications.ts
git commit -m "feat(onboarding): add notification opt-in card on home"
```

---

## Operator Manual Setup (코드 task 아님)

다음은 배포 전에 사람이 직접 처리:

- [ ] Supabase 콘솔 → Authentication → Providers → Kakao 활성화 + Client ID/Secret 입력
- [ ] Kakao Developers에서 redirect URL에 `<APP_URL>/api/auth/callback` 등록
- [ ] Kakao Developers JavaScript 키를 `NEXT_PUBLIC_KAKAO_JS_KEY`에 입력
- [ ] Kakao Business 채널 등록 + URL을 `NEXT_PUBLIC_OPERATOR_KAKAO_CHANNEL_URL`에 입력
- [ ] 운영자 1명 지정 (이름/아바타) → `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_OPERATOR_AVATAR_URL`
- [ ] Vercel 프로젝트 ENV에 동일 키 모두 등록 (Preview + Production)

---

## Follow-up Plan (별도 작성)

다음은 본 플랜에 포함하지 않은 항목 — 별도 플랜으로 구현:

- Phase 4 D-1 푸시 알림 cron job (Vercel Cron `0 9 * * *`)
- Admin UI: 첫 모임 신청자 D-1 리스트 (운영자 수동 안부용)
- 자녀 초대 deep link의 invite token 발급/검증
- birthYear 마이페이지 입력 권유
- 비로그인 콘텐츠 미리보기

---

## Self-Review

스펙(`docs/superpowers/specs/2026-05-28-senior-onboarding-design.md`) 16개 섹션 대응:

| 스펙 섹션 | 대응 Task |
|---|---|
| 4 사용자 여정 | 전체 Task 1~16 |
| 5 Phase 1 (가입 5탭) | Task 6, 7, 8 |
| 6 Phase 2 (풀스크린 환영) | Task 9, 10 |
| 7 Phase 3 (홈 도달) | Task 11, 12, 13, 14 |
| 8 DB 변경 | Task 1, 2 |
| 9 API 명세 | Task 8, 9, 11, 12, 15 |
| 10 UI 컴포넌트 | Task 4, 7, 10, 13, 15, 16 |
| 11 ENV / 외부 서비스 | Task 6, 15, Operator Manual Setup |
| 12 정적 데이터 | Task 3 |
| 13 핵심 설계 원칙 | 전 Task에 분산 (가짜 금지, 마케팅 톤 금지 등) |
| 14 비기능 요구사항 | dev verification step에서 수동 점검 |
| 15 위험·열린 질문 | Follow-up plan에서 다룸 |

**스펙 vs 플랜의 의도된 차이**:
- 스펙은 "Phase 1 Step ①: 카카오 OAuth가 1번째 탭". 플랜에서는 `(auth)/register`가 OAuth 진입, `(auth)/onboarding`이 4-step. 결과적으로 사용자 경험은 5탭이지만 코드상은 (auth)/login·register와 (auth)/onboarding으로 분리. 스펙의 5탭 카운트는 UX 카운트로 유지.
- 스펙의 "시군구 데이터: kr-sido-sigungu.json (행자부 표준)". 플랜에서는 MVP에서 시군구를 자유 텍스트 input으로 단순화. 행자부 JSON은 V2.

**Placeholder 점검**: 없음. 모든 step은 실제 코드 또는 실행 가능 커맨드 포함.

**Type consistency 점검**: 
- `font_scale` ↔ `fontScale` (DB ↔ Drizzle) — Task 1·2에서 일관
- `peerSamples`, `peers`, `club` 키명 — API ↔ UI 일치 확인됨

---

## Execution Handoff

플랜이 완성되어 `docs/superpowers/plans/2026-05-28-senior-onboarding.md`에 저장되었습니다.
두 가지 실행 옵션:

**1. Subagent-Driven (recommended)** — 각 task마다 새 subagent를 dispatch, task 사이에 review, 빠른 반복.

**2. Inline Execution** — 본 세션에서 executing-plans 스킬로 batch 실행, checkpoint마다 사용자 review.

**어느 쪽으로 진행할까요?**
