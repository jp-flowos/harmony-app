# 카톡 공유 웨지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 열리는 공개 공유 페이지(`/s/*`) + 카톡 공유 인프라 위에 모임 초대장(게스트 RSVP)과 운세 공유 카드를 구축한다.

**Architecture:** 공개 라우트는 `/s/` prefix 하나로 통일하고 proxy publicPaths에 등록. 운세 카드는 deterministic 엔진(`@/lib/fortune`)을 서버에서 재사용 (DB 불필요). 모임 초대장은 클럽 생성 → 미팅 생성 → 공개 초대장 → 게스트 RSVP의 수직 슬라이스 — 클럽/미팅 도메인이 현재 전부 스텁이라 최소 wire-up이 선행된다. 참석 인원은 저장 컬럼(`current_count`) 대신 항상 라이브 계산.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (postgres-js, `si_mvp` search_path), Supabase Auth SSR, Zod v4, `next/og` ImageResponse, Kakao JS SDK 2.7.2 (root layout에 이미 로드됨), Biome.

**Spec:** `docs/superpowers/specs/2026-07-10-kakao-share-wedge-design.md`

## Global Constraints

- DB 테이블/enum 이름은 반드시 `h_` prefix (예: `h_meeting_rsvps`, `h_rsvp_status`).
- 마이그레이션은 `supabase/migrations/*.sql` 수기 작성, DDL은 `si_mvp.` 스키마 한정어 필수. **drizzle-kit generate/migrate 절대 금지.**
- API 응답은 `@/lib/api-response`만 사용 (`@/lib/api-utils` 신규 import 금지).
- 사용자 노출 문자열은 전부 한국어. 터치 타겟 최소 `h-12`(48px).
- Biome 스타일: 2-space indent, double quotes, trailing commas ES5, 100자 폭. 검증: `bun run lint`.
- TypeScript 변경 후 `npx tsc --noEmit`.
- proxy publicPaths에는 반드시 `"/s/"` (trailing slash 포함) — `"/s"`는 `startsWith` 매칭이라 `/search`, `/subscribe`까지 공개해버리는 보안 버그.
- 게스트 전화번호(`guest_phone`)는 공개 페이지/공개 API 응답에 절대 포함하지 않는다. 클럽 owner/admin 뷰에서만 노출.
- 커밋은 `feature/kakao-share-wedge` 브랜치에. 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## 검증 정책 (기존 info/fortune plan과 동일)

단위 테스트 러너 없음. 각 태스크는 ① `npx tsc --noEmit` ② `bun run lint` ③ 런타임 검증(공개 API는 PowerShell `Invoke-RestMethod`, 인증 필요 흐름은 브라우저 수동 스모크)으로 검증한다. dev 서버: `bun run dev` (http://localhost:3000).

---

## File Structure

```
Create:
  src/app/s/layout.tsx                                  — 공유 전용 레이아웃 (인증X, BottomNav X, CTA 배너)
  src/app/s/fortune/[date]/[zodiac]/page.tsx            — 운세 공유 페이지
  src/app/s/fortune/[date]/[zodiac]/opengraph-image.tsx — 운세 OG 이미지
  src/app/s/meeting/[id]/page.tsx                       — 모임 초대장
  src/app/s/meeting/[id]/opengraph-image.tsx            — 초대장 OG 이미지
  src/app/s/meeting/[id]/RsvpForm.tsx                   — 게스트 응답 폼 (client)
  src/app/api/share/meetings/[id]/rsvp/route.ts         — 게스트 RSVP API (공개)
  src/app/api/clubs/[id]/meetings/[mid]/join/route.ts   — 회원 참석 토글 API
  src/app/(main)/club/[id]/ClubDetailClient.tsx         — 클럽 상세 client subtree
  src/app/(main)/club/[id]/meeting/create/page.tsx      — 모임 만들기 폼
  src/app/(main)/club/[id]/meeting/[mid]/MeetingDetailClient.tsx — 미팅 상세 client subtree
  src/components/share/ShareBar.tsx                     — 카톡 공유 + 링크 복사
  src/components/fortune/FortuneCard.tsx                — 운세 카드 (server/client 공용)
  src/lib/og-font.ts                                    — OG용 한글 폰트 로더
  src/lib/format-date.ts                                — KST 일시 포맷 헬퍼
  src/assets/fonts/Pretendard-Bold.otf                  — OG 이미지용 폰트 (다운로드)
  supabase/migrations/20260710000000_meeting_rsvps.sql  — h_meeting_rsvps + h_rsvp_status

Modify:
  src/proxy.ts                       — publicPaths에 "/s/" 추가
  src/db/schema/clubs.ts             — meetingRsvps 테이블 + rsvpStatusEnum 추가
  src/app/api/clubs/route.ts         — POST를 DB wire-up (GET 스텁은 유지)
  src/app/api/clubs/[id]/meetings/route.ts — GET/POST DB wire-up
  src/app/(main)/club/create/page.tsx      — 폼 submit을 API에 연결
  src/app/(main)/club/[id]/page.tsx        — 서버 컴포넌트로 전환 (클럽 헤더 + 일정 탭 실데이터)
  src/app/(main)/club/[id]/meeting/[mid]/page.tsx — 서버 컴포넌트로 전환 + ShareBar
  src/app/(main)/fortune/page.tsx    — FortuneCard import 교체 + ShareBar 적용
```

---

### Task 1: 공개 라우트 기반 + 운세 공유 페이지

**Files:**
- Modify: `src/proxy.ts:4-17`
- Create: `src/app/s/layout.tsx`
- Create: `src/components/fortune/FortuneCard.tsx`
- Create: `src/app/s/fortune/[date]/[zodiac]/page.tsx`
- Modify: `src/app/(main)/fortune/page.tsx` (FortuneCard/ScoreStars 정의 제거, import로 교체)

**Interfaces:**
- Consumes: `generateFortune(date, zodiac)`, `ZODIAC_ANIMALS`, `getZodiacEmoji`, `FortuneResult` — `@/lib/fortune` (기존)
- Produces:
  - `FortuneCard({ fortune }: { fortune: FortuneResult })` — `@/components/fortune/FortuneCard` (서버/클라 공용, "use client" 없음)
  - `todaySeoul(): string` — `/s/fortune` page 내 로컬 함수 (Task 3에서 동일 로직을 fortune 페이지에 복제)
  - 공개 URL 패턴 `/s/fortune/{YYYY-MM-DD}/{띠}` — Task 2, 3이 사용

- [ ] **Step 1: proxy publicPaths에 `"/s/"` 추가**

`src/proxy.ts`의 `publicPaths` 배열에 추가 (기존 항목 뒤):

```typescript
const publicPaths = [
  "/login",
  "/logout",
  "/register",
  "/onboarding",
  "/api/auth",
  // PWA + offline shell — must be reachable without a session
  "/offline",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon",
  "/apple-icon",
  "/icon-maskable",
  // 공개 공유 페이지 — trailing slash 필수 ("/s"는 /search, /subscribe까지 매칭됨)
  "/s/",
];
```

- [ ] **Step 2: 공유 레이아웃 생성**

`src/app/s/layout.tsx`:

```tsx
import Link from "next/link";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-cream-100 pb-28">
      <header className="flex items-center justify-center border-b border-mocha-100 bg-white py-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-coral-600">
          하모니
        </Link>
      </header>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-mocha-100 bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Link
            href="/register"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-coral-500 text-xl font-extrabold text-white shadow-warm active:scale-[0.98]"
          >
            하모니 시작하기
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: FortuneCard 공용 컴포넌트 추출**

`src/components/fortune/FortuneCard.tsx` 생성 — 기존 `src/app/(main)/fortune/page.tsx`의 `ScoreStars`(40-53행)와 `FortuneCard`(55-104행)를 그대로 옮기되, **"use client" 없이** 서버/클라 공용으로 만들고 아이콘은 ssr 엔트리에서 import:

```tsx
import { Star } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getZodiacEmoji } from "@/lib/fortune";
import type { FortuneResult } from "@/lib/fortune";

const SCORE_STARS = [1, 2, 3, 4, 5] as const;

export function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${score}점 만점에 5점`}>
      {SCORE_STARS.map((star) => (
        <Star
          key={star}
          size={22}
          weight={star <= score ? "fill" : "regular"}
          className={star <= score ? "text-[var(--color-warning)]" : "text-mocha-200"}
        />
      ))}
    </div>
  );
}

export function FortuneCard({ fortune }: { fortune: FortuneResult }) {
  return (
    <Card className="overflow-hidden border-coral-100">
      <div className="bg-gradient-to-br from-coral-50 via-cream-100 to-sage-50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-4xl shadow-soft">
            {getZodiacEmoji(fortune.zodiac)}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-extrabold text-mocha-900 tracking-tight">
              {fortune.zodiac}띠 운세
            </h3>
            <p className="mt-0.5 text-base font-semibold text-mocha-700">{fortune.date}</p>
            <div className="mt-2">
              <ScoreStars score={fortune.score} />
            </div>
          </div>
        </div>
      </div>
      <CardContent className="space-y-5 p-6">
        <div>
          <Badge className="mb-2">종합운</Badge>
          <p className="text-lg text-mocha-900 leading-relaxed">{fortune.general}</p>
        </div>
        <div>
          <Badge variant="secondary" className="mb-2">
            건강운
          </Badge>
          <p className="text-lg text-mocha-900 leading-relaxed">{fortune.health}</p>
        </div>
        <div>
          <Badge variant="cream" className="mb-2">
            금전운
          </Badge>
          <p className="text-lg text-mocha-900 leading-relaxed">{fortune.money}</p>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-mocha-100 pt-4 text-base">
          <span className="text-mocha-700">
            행운의 색:{" "}
            <strong className="font-extrabold text-mocha-900">{fortune.luckyColor}</strong>
          </span>
          <span className="text-mocha-700">
            행운의 숫자:{" "}
            <strong className="font-extrabold text-mocha-900">{fortune.luckyNumber}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

기존 `src/app/(main)/fortune/page.tsx`에서 `ScoreStars`/`FortuneCard` 정의와 이제 안 쓰는 import(`Star`는 탭 트리거에서 여전히 사용하므로 유지, `Badge`/`Card` 계열 중 미사용만 정리)를 제거하고 교체:

```tsx
import { FortuneCard } from "@/components/fortune/FortuneCard";
```

- [ ] **Step 4: 운세 공유 페이지 생성**

`src/app/s/fortune/[date]/[zodiac]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FortuneCard } from "@/components/fortune/FortuneCard";
import { generateFortune, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function todaySeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function isAllowedDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const today = todaySeoul();
  if (date > today) return false;
  const diff =
    new Date(`${today}T00:00:00+09:00`).getTime() - new Date(`${date}T00:00:00+09:00`).getTime();
  return diff <= WEEK_MS;
}

function parseZodiac(raw: string): ZodiacAnimal | null {
  const decoded = decodeURIComponent(raw);
  return (ZODIAC_ANIMALS as readonly string[]).includes(decoded)
    ? (decoded as ZodiacAnimal)
    : null;
}

interface Props {
  params: Promise<{ date: string; zodiac: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date, zodiac: rawZodiac } = await params;
  const zodiac = parseZodiac(rawZodiac);
  if (!zodiac || !DATE_RE.test(date)) return {};
  const fortune = generateFortune(date, zodiac);
  return {
    title: `${zodiac}띠 오늘의 운세 (${date})`,
    description: fortune.general,
  };
}

export default async function SharedFortunePage({ params }: Props) {
  const { date, zodiac: rawZodiac } = await params;
  const zodiac = parseZodiac(rawZodiac);
  if (!zodiac) notFound();
  if (!isAllowedDate(date)) {
    redirect(`/s/fortune/${todaySeoul()}/${encodeURIComponent(zodiac)}`);
  }

  const fortune = generateFortune(date, zodiac);

  return (
    <div className="space-y-5 p-5">
      <h1 className="pt-2 text-center text-3xl font-extrabold tracking-tight text-mocha-900">
        오늘의 운세
      </h1>
      <FortuneCard fortune={fortune} />
      <p className="text-center text-lg font-semibold text-mocha-700">
        하모니에 가입하면 내 띠 운세를 매일 받아볼 수 있어요
      </p>
    </div>
  );
}
```

- [ ] **Step 5: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 둘 다 에러 0.

- [ ] **Step 6: 런타임 검증 (시크릿 창)**

`bun run dev` 실행 후 브라우저 **시크릿 창**(비로그인)에서:

1. `http://localhost:3000/s/fortune/2026-07-10/용` → 로그인 redirect 없이 운세 카드 + 하단 "하모니 시작하기" 배너 렌더 확인 (날짜는 실행일 기준 오늘로 대체)
2. `http://localhost:3000/s/fortune/2020-01-01/용` → 오늘 날짜 URL로 redirect 확인
3. `http://localhost:3000/s/fortune/2026-07-10/고양이` → 404 확인
4. **회귀 확인**: `http://localhost:3000/search` → 로그인으로 redirect되는지 확인 (`/s/` prefix가 `/search`를 뚫지 않았는지)

- [ ] **Step 7: Commit**

```powershell
git add src/proxy.ts src/app/s/ src/components/fortune/ "src/app/(main)/fortune/page.tsx"
git commit -m "feat(share): public /s/ routes + shared fortune page"
```

---

### Task 2: OG 폰트 + 운세 OG 이미지

**Files:**
- Create: `src/assets/fonts/Pretendard-Bold.otf` (다운로드)
- Create: `src/lib/og-font.ts`
- Create: `src/app/s/fortune/[date]/[zodiac]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `generateFortune`, `getZodiacEmoji`, `ZODIAC_ANIMALS` — `@/lib/fortune`
- Produces: `loadOgFont(): Promise<ArrayBuffer>` — `@/lib/og-font` (Task 10의 미팅 OG 이미지도 사용)

- [ ] **Step 1: 폰트 다운로드**

satori(ImageResponse)는 한글 폰트를 번들하지 않아 폰트 없이는 한글이 전부 깨진다(tofu). 앱이 이미 쓰는 Pretendard의 Bold OTF를 받는다:

```powershell
New-Item -ItemType Directory -Force src/assets/fonts
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/public/static/Pretendard-Bold.otf" -OutFile src/assets/fonts/Pretendard-Bold.otf
(Get-Item src/assets/fonts/Pretendard-Bold.otf).Length
```

Expected: 파일 크기 1MB 이상 (한글 전체 글리프 포함). 404가 나면 대체 URL: `https://github.com/orioncactus/pretendard/raw/v1.3.9/dist/public/static/Pretendard-Bold.otf`

- [ ] **Step 2: 폰트 로더 생성**

`src/lib/og-font.ts` — `fetch(new URL(...))` 패턴은 Next가 빌드 시 정적 추적해서 배포 번들에 폰트를 포함시킨다:

```typescript
// OG 이미지(satori)용 한글 폰트 — satori는 시스템 폰트를 못 쓰므로 번들 필수
let fontData: ArrayBuffer | null = null;

export async function loadOgFont(): Promise<ArrayBuffer> {
  if (!fontData) {
    const res = await fetch(new URL("../assets/fonts/Pretendard-Bold.otf", import.meta.url));
    fontData = await res.arrayBuffer();
  }
  return fontData;
}
```

- [ ] **Step 3: 운세 OG 이미지 생성**

`src/app/s/fortune/[date]/[zodiac]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { generateFortune, getZodiacEmoji, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";
import { loadOgFont } from "@/lib/og-font";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ date: string; zodiac: string }>;
}

export default async function OgImage({ params }: Props) {
  const { date, zodiac: rawZodiac } = await params;
  const decoded = decodeURIComponent(rawZodiac);
  const zodiac: ZodiacAnimal = (ZODIAC_ANIMALS as readonly string[]).includes(decoded)
    ? (decoded as ZodiacAnimal)
    : "용";
  const fortune = generateFortune(date, zodiac);
  const stars = "★".repeat(fortune.score) + "☆".repeat(5 - fortune.score);
  const font = await loadOgFont();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        backgroundColor: "#FFF7ED",
        fontFamily: "Pretendard",
        padding: 60,
      }}
    >
      <div style={{ fontSize: 120 }}>{getZodiacEmoji(zodiac)}</div>
      <div style={{ fontSize: 64, color: "#3D2C24" }}>{`${zodiac}띠 오늘의 운세`}</div>
      <div style={{ fontSize: 40, color: "#8A6F5F" }}>{date}</div>
      <div style={{ fontSize: 48, color: "#F59E0B" }}>{stars}</div>
      <div
        style={{
          fontSize: 36,
          color: "#3D2C24",
          textAlign: "center",
          maxWidth: 1000,
        }}
      >
        {fortune.general}
      </div>
      <div style={{ fontSize: 32, color: "#EC6A52", marginTop: 12 }}>하모니</div>
    </div>,
    { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700 }] }
  );
}
```

- [ ] **Step 4: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 5: 런타임 검증**

시크릿 창에서 `http://localhost:3000/s/fortune/2026-07-10/용/opengraph-image` 열기 (날짜는 오늘로).
Expected: 1200×630 PNG — 띠 이모지 + "용띠 오늘의 운세" 한글이 깨지지 않고 렌더. 페이지 소스(`view-source:.../s/fortune/.../용`)에서 `og:image` 메타 태그 존재 확인.

- [ ] **Step 6: Commit**

```powershell
git add src/assets/fonts/Pretendard-Bold.otf src/lib/og-font.ts "src/app/s/fortune/[date]/[zodiac]/opengraph-image.tsx"
git commit -m "feat(share): korean font bundle + fortune og image"
```

---

### Task 3: ShareBar 컴포넌트 + 앱 내 운세 공유 버튼 교체

**Files:**
- Create: `src/components/share/ShareBar.tsx`
- Modify: `src/app/(main)/fortune/page.tsx` (`handleShare`/공유 버튼 → ShareBar, `getToday` KST 수정)

**Interfaces:**
- Consumes: `initKakao()`, `shareToKakao(opts)` — `@/lib/kakao/share` (기존; `declare global`로 `window.Kakao` 타입 제공)
- Produces: `ShareBar({ title, description, path, imagePath? })` — `@/components/share/ShareBar`
  - `path`: 사이트 상대 경로 (예: `/s/fortune/2026-07-10/용`). 내부에서 `window.location.origin`으로 절대화.
  - `imagePath` 생략 시 `${path}/opengraph-image` 사용.

- [ ] **Step 1: ShareBar 생성**

`src/components/share/ShareBar.tsx`:

```tsx
"use client";

import { ChatCircleDots, LinkSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { initKakao, shareToKakao } from "@/lib/kakao/share";

interface ShareBarProps {
  title: string;
  description: string;
  path: string;
  imagePath?: string;
}

export function ShareBar({ title, description, path, imagePath }: ShareBarProps) {
  const [kakaoReady, setKakaoReady] = useState(false);
  const [copied, setCopied] = useState(false);

  // SDK 스크립트(afterInteractive)가 마운트보다 늦게 로드될 수 있어 최대 5초 폴링
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      initKakao();
      if (window.Kakao?.isInitialized()) {
        setKakaoReady(true);
        clearInterval(timer);
      } else if (++tries >= 10) {
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  function absolute(p: string): string {
    return `${window.location.origin}${p}`;
  }

  function handleKakao() {
    shareToKakao({
      title,
      description,
      imageUrl: absolute(imagePath ?? `${path}/opengraph-image`),
      link: absolute(path),
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(absolute(path));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 미지원 브라우저 — 버튼 동작 없음
    }
  }

  return (
    <div className="flex gap-2">
      {kakaoReady && (
        <Button
          size="lg"
          className="flex-1 bg-[#FEE500] text-[#191919] hover:bg-[#FDD800]"
          onClick={handleKakao}
        >
          <ChatCircleDots size={24} weight="fill" />
          카카오톡으로 공유
        </Button>
      )}
      <Button size="lg" variant="outline" className="flex-1" onClick={handleCopy}>
        <LinkSimple size={24} weight="bold" />
        {copied ? "복사됐어요!" : "링크 복사"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 운세 페이지에 적용**

`src/app/(main)/fortune/page.tsx`:

1. `getToday()`를 KST 기준으로 수정 (공유 링크 날짜가 UTC 자정 전후로 틀어지는 것 방지):

```typescript
function getToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}
```

2. `handleShare` 콜백(115-127행)과 기존 공유 `<Button>`(178-181행)을 제거하고 교체:

```tsx
<ShareBar
  title={`${fortune.zodiac}띠 오늘의 운세`}
  description={fortune.general}
  path={`/s/fortune/${today}/${encodeURIComponent(selectedZodiac)}`}
/>
```

3. import 정리: `ShareNetwork`, `useCallback` 제거, `ShareBar` 추가.

- [ ] **Step 3: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 4: 런타임 검증**

로그인 상태로 `http://localhost:3000/fortune`:
1. [링크 복사] 클릭 → "복사됐어요!" 표시, 붙여넣기 하면 `http://localhost:3000/s/fortune/{오늘}/{띠}` 형태
2. `NEXT_PUBLIC_KAKAO_JS_KEY`가 `.env.local`에 있으면 노란 카카오 버튼 표시 확인 (없으면 링크 복사만 보이는 게 정상 폴백)
3. 복사한 링크를 시크릿 창에서 열어 운세 카드 렌더 확인

- [ ] **Step 5: Commit**

```powershell
git add src/components/share/ "src/app/(main)/fortune/page.tsx"
git commit -m "feat(share): ShareBar component + fortune page kakao share"
```

---

### Task 4: 클럽 생성 wire-up

**Files:**
- Modify: `src/app/api/clubs/route.ts` (POST만 DB 연결; GET 스텁은 이번 범위 밖 — 그대로 둠)
- Modify: `src/app/(main)/club/create/page.tsx` (submit → API)

**Interfaces:**
- Consumes: `db`, `clubs`, `clubMembers` — `@/db`, `@/db/schema`; `createClient` — `@/lib/supabase/server`
- Produces: `POST /api/clubs` — body `{ name, category, region, description, joinType? }` → `{ success: true, data: { id, name, ... } }` (201). 생성자는 `h_club_members`에 `role: "owner"`로 등록됨. Task 5의 권한 검사, Task 7의 클럽 조회가 이 데이터에 의존.

- [ ] **Step 1: POST /api/clubs 재작성**

`src/app/api/clubs/route.ts` — 파일 상단 import와 POST 전체 교체 (GET은 기존 `jsonResponse` 스텁 유지, 두 유틸 import 공존은 GET wire-up 시점에 해소 예정):

```typescript
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import {
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { errorResponse, jsonResponse } from "@/lib/api-utils";
import { createClient } from "@/lib/supabase/server";
```

(기존 GET은 그대로. 기존 POST를 아래로 교체:)

```typescript
const CreateClubSchema = z.object({
  name: z.string().trim().min(2, "클럽 이름은 2자 이상이어야 해요").max(30),
  category: z.string().trim().min(1, "카테고리를 선택해주세요").max(20),
  region: z.string().trim().min(1, "지역을 선택해주세요").max(20),
  description: z.string().trim().min(1, "클럽 소개를 입력해주세요").max(500),
  joinType: z.enum(["open", "approval"]).default("open"),
});

// POST /api/clubs - 클럽 생성 (생성자가 owner로 등록)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = CreateClubSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const clubId = crypto.randomUUID();
    await db.insert(clubs).values({
      id: clubId,
      ...parsed.data,
      ownerId: user.id,
      memberCount: 1,
    });
    await db.insert(clubMembers).values({ clubId, userId: user.id, role: "owner" });

    const [created] = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
    return successResponse(created, 201);
  } catch (err) {
    console.error("[clubs POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 클럽 생성 폼 연결**

`src/app/(main)/club/create/page.tsx`의 `handleSubmit`(66-70행)을 교체하고 상태 추가:

```tsx
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!category || !region) {
    setError("카테고리와 지역을 선택해주세요");
    return;
  }
  setSubmitting(true);
  setError(null);
  try {
    const res = await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, region, description, joinType }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "클럽을 만들지 못했어요. 다시 시도해주세요");
      return;
    }
    router.push(`/club/${json.data.id}`);
  } catch {
    setError("클럽을 만들지 못했어요. 다시 시도해주세요");
  } finally {
    setSubmitting(false);
  }
}
```

제출 버튼(159-161행) 교체:

```tsx
{error && <p className="text-base font-semibold text-red-600">{error}</p>}
<Button className="w-full" size="lg" type="submit" disabled={submitting}>
  {submitting ? "만드는 중..." : "클럽 만들기"}
</Button>
```

- [ ] **Step 3: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 4: 런타임 검증 (브라우저)**

로그인 상태로 `http://localhost:3000/club/create` → 폼 작성 → 제출.
Expected: `/club/{uuid}`로 이동 (페이지는 아직 목업 — Task 7에서 실데이터). 미인증 검증: 시크릿 창에서 `Invoke-RestMethod`:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/clubs" -Method Post -ContentType "application/json" -Body '{"name":"테스트"}'
```

Expected: 401 에러 (`UNAUTHORIZED`). (Invoke-RestMethod는 4xx에서 예외를 던지므로 예외 메시지로 확인)

- [ ] **Step 5: Commit**

```powershell
git add src/app/api/clubs/route.ts "src/app/(main)/club/create/page.tsx"
git commit -m "feat(club): wire club creation to db"
```

---

### Task 5: h_meeting_rsvps 마이그레이션 + Drizzle 스키마

**Files:**
- Create: `supabase/migrations/20260710000000_meeting_rsvps.sql`
- Modify: `src/db/schema/clubs.ts` (파일 끝에 추가)

**Interfaces:**
- Produces:
  - DB: `si_mvp.h_meeting_rsvps` 테이블, `si_mvp.h_rsvp_status` enum
  - Drizzle: `meetingRsvps`, `rsvpStatusEnum` — `@/db/schema` (barrel export는 `clubs.ts` 전체를 re-export하므로 자동 포함)
  - Task 6(카운트), 8(명단), 9(INSERT), 10(명단)이 사용

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/20260710000000_meeting_rsvps.sql`:

```sql
-- Guest RSVP for public meeting invites (kakao share wedge).
-- Non-members respond to a meeting invite with just a name (+optional phone).
-- guest_phone is operator-facing only — never exposed on public pages/APIs.
--
-- Schema-qualified DDL (si_mvp.*) — no search_path dependency.

CREATE TYPE si_mvp.h_rsvp_status AS ENUM ('joined', 'declined');

CREATE TABLE si_mvp.h_meeting_rsvps (
  id text PRIMARY KEY,
  meeting_id text NOT NULL REFERENCES si_mvp.h_club_meetings(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_phone text,
  status si_mvp.h_rsvp_status NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX h_meeting_rsvps_meeting_id_idx ON si_mvp.h_meeting_rsvps (meeting_id);
```

- [ ] **Step 2: 마이그레이션 적용**

```powershell
bun run db:setup
```

Expected: `20260710000000_meeting_rsvps.sql` 적용 로그. 실패 시(supabase CLI 링크 문제 등) Supabase 대시보드 SQL Editor에서 위 SQL 직접 실행으로 대체하고 결과를 보고.

- [ ] **Step 3: Drizzle 스키마 추가**

`src/db/schema/clubs.ts` 파일 끝(`meetingParticipants` 뒤)에 추가:

```typescript
export const rsvpStatusEnum = pgEnum("h_rsvp_status", ["joined", "declined"]);

// 비로그인 게스트의 초대장 응답 — guest_phone은 공개 페이지에 절대 노출 금지
export const meetingRsvps = pgTable("h_meeting_rsvps", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id")
    .notNull()
    .references(() => clubMeetings.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  guestPhone: text("guest_phone"),
  status: rsvpStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

- [ ] **Step 4: typecheck + lint + 검증**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0. DB 확인 (psql 또는 Supabase 대시보드):

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'si_mvp' AND table_name = 'h_meeting_rsvps';
```

Expected: id, meeting_id, guest_name, guest_phone, status, created_at 6개 행.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations/20260710000000_meeting_rsvps.sql src/db/schema/clubs.ts
git commit -m "feat(db): h_meeting_rsvps guest rsvp table"
```

---

### Task 6: 미팅 API wire-up + 모임 만들기 페이지

**Files:**
- Modify: `src/app/api/clubs/[id]/meetings/route.ts` (전체 재작성)
- Create: `src/lib/format-date.ts`
- Create: `src/app/(main)/club/[id]/meeting/create/page.tsx`

**Interfaces:**
- Consumes: `clubMeetings`, `clubMembers`, `meetingParticipants`, `meetingRsvps` — `@/db/schema`
- Produces:
  - `GET /api/clubs/[id]/meetings` → `{ success, data: { meetings: [{ id, title, date, location, maxParticipants, description, joinedCount }] } }` (인증 필요)
  - `POST /api/clubs/[id]/meetings` — body `{ title, date: "YYYY-MM-DD", time: "HH:mm", location, maxParticipants?, description? }` → 201 `{ success, data: meeting }`. owner/admin만.
  - `formatMeetingDate(date: Date): string` — `@/lib/format-date` (예: "2026년 7월 15일 (수) 오전 10:00"). Task 7, 8, 10이 사용.
  - 미팅 일시는 KST(+09:00) instant로 저장 — `new Date(\`${date}T${time}:00+09:00\`)`

- [ ] **Step 1: 날짜 포맷 헬퍼 생성**

`src/lib/format-date.ts`:

```typescript
const MEETING_DATE_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatMeetingDate(date: Date): string {
  return MEETING_DATE_FMT.format(date);
}
```

- [ ] **Step 2: 미팅 API 재작성**

`src/app/api/clubs/[id]/meetings/route.ts` 전체 교체:

```typescript
import { and, asc, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMeetings, clubMembers, clubs, meetingParticipants, meetingRsvps } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const CreateMeetingSchema = z.object({
  title: z.string().trim().min(2, "모임 이름은 2자 이상이어야 해요").max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 선택해주세요"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "시간을 선택해주세요"),
  location: z.string().trim().min(1, "장소를 입력해주세요").max(100),
  maxParticipants: z.number().int().min(2).max(200).default(20),
  description: z.string().trim().max(500).optional(),
});

// GET /api/clubs/[id]/meetings - 정기모임 목록 (참석 인원은 라이브 계산)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const rows = await db
      .select({
        id: clubMeetings.id,
        title: clubMeetings.title,
        date: clubMeetings.date,
        location: clubMeetings.location,
        maxParticipants: clubMeetings.maxParticipants,
        description: clubMeetings.description,
        joinedCount: sql<number>`
          (SELECT count(*) FROM ${meetingParticipants}
            WHERE ${meetingParticipants.meetingId} = ${clubMeetings.id}
              AND ${meetingParticipants.status} = 'joined')::int
          + (SELECT count(*) FROM ${meetingRsvps}
              WHERE ${meetingRsvps.meetingId} = ${clubMeetings.id}
                AND ${meetingRsvps.status} = 'joined')::int
        `,
      })
      .from(clubMeetings)
      .where(eq(clubMeetings.clubId, id))
      .orderBy(asc(clubMeetings.date));

    return successResponse({ meetings: rows });
  } catch (err) {
    console.error("[meetings GET]", err);
    return serverError();
  }
}

// POST /api/clubs/[id]/meetings - 정기모임 생성 (owner/admin만)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = CreateMeetingSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, id)).limit(1);
    if (!club) return notFoundError("클럽을 찾을 수 없습니다");

    const [membership] = await db
      .select({ role: clubMembers.role })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (!membership || membership.role === "member") {
      return forbiddenError("모임 만들기는 모임장/운영진만 할 수 있어요");
    }

    const { title, date, time, location, maxParticipants, description } = parsed.data;
    const meetingId = crypto.randomUUID();
    await db.insert(clubMeetings).values({
      id: meetingId,
      clubId: id,
      title,
      date: new Date(`${date}T${time}:00+09:00`),
      location,
      maxParticipants,
      description: description ?? null,
    });

    const [created] = await db
      .select()
      .from(clubMeetings)
      .where(eq(clubMeetings.id, meetingId))
      .limit(1);
    return successResponse(created, 201);
  } catch (err) {
    console.error("[meetings POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 3: 모임 만들기 페이지 생성**

`src/app/(main)/club/[id]/meeting/create/page.tsx`:

```tsx
"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CreateMeetingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("20");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${params.id}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date,
          time,
          location,
          maxParticipants: Number(maxParticipants) || 20,
          description: description || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "모임을 만들지 못했어요. 다시 시도해주세요");
        return;
      }
      router.push(`/club/${params.id}/meeting/${json.data.id}`);
    } catch {
      setError("모임을 만들지 못했어요. 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/club/${params.id}`}
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">모임 만들기</CardTitle>
          <p className="text-base text-gray-500">만든 뒤 카톡으로 초대장을 보낼 수 있어요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">모임 이름</Label>
              <Input
                id="meeting-title"
                placeholder="예) 7월 정기 산행"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="meeting-date">날짜</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="meeting-time">시간</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-location">장소</Label>
              <Input
                id="meeting-location"
                placeholder="예) 북한산 우이역 1번 출구"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-max">최대 인원</Label>
              <Input
                id="meeting-max"
                type="number"
                min={2}
                max={200}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-description">설명 (선택)</Label>
              <Textarea
                id="meeting-description"
                placeholder="모임에 대해 알려주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-base font-semibold text-red-600">{error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? "만드는 중..." : "모임 만들기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 5: 런타임 검증 (브라우저)**

Task 4에서 만든 클럽으로 `http://localhost:3000/club/{clubId}/meeting/create` → 폼 작성 → 제출.
Expected: `/club/{clubId}/meeting/{meetingId}`로 이동 (아직 목업 페이지 — Task 8에서 실데이터). DB 확인:

```sql
SELECT id, title, date, location FROM si_mvp.h_club_meetings ORDER BY created_at DESC LIMIT 1;
```

Expected: 방금 만든 미팅. `date`가 입력한 KST 일시와 일치하는 instant인지 확인 (표시 검증은 Task 8 Step 5에서 재확인).

- [ ] **Step 6: Commit**

```powershell
git add "src/app/api/clubs/[id]/meetings/route.ts" src/lib/format-date.ts "src/app/(main)/club/[id]/meeting/create/page.tsx"
git commit -m "feat(club): wire meetings api + meeting create page"
```

---

### Task 7: 클럽 상세 페이지 — 서버 컴포넌트 전환 (헤더 + 일정 탭 실데이터)

**Files:**
- Modify: `src/app/(main)/club/[id]/page.tsx` (서버 컴포넌트로 재작성)
- Create: `src/app/(main)/club/[id]/ClubDetailClient.tsx`

**Interfaces:**
- Consumes: `formatMeetingDate` — `@/lib/format-date`; Drizzle 스키마
- Produces: `ClubDetailClient({ club, meetings, canCreateMeeting })`
  - `club: { id: string; name: string; category: string; region: string; description: string; memberCount: number }`
  - `meetings: { id: string; title: string; dateLabel: string; location: string; joinedCount: number; maxParticipants: number }[]`
  - `canCreateMeeting: boolean` (owner/admin 여부)

- [ ] **Step 1: 서버 컴포넌트 재작성**

`src/app/(main)/club/[id]/page.tsx` 전체 교체:

```tsx
import { and, asc, eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { clubMeetings, clubMembers, clubs, meetingParticipants, meetingRsvps } from "@/db/schema";
import { formatMeetingDate } from "@/lib/format-date";
import { createClient } from "@/lib/supabase/server";
import { ClubDetailClient } from "./ClubDetailClient";

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [club] = await db.select().from(clubs).where(eq(clubs.id, id)).limit(1);
  if (!club) notFound();

  const [membership] = await db
    .select({ role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
    .limit(1);

  const meetingRows = await db
    .select({
      id: clubMeetings.id,
      title: clubMeetings.title,
      date: clubMeetings.date,
      location: clubMeetings.location,
      maxParticipants: clubMeetings.maxParticipants,
      joinedCount: sql<number>`
        (SELECT count(*) FROM ${meetingParticipants}
          WHERE ${meetingParticipants.meetingId} = ${clubMeetings.id}
            AND ${meetingParticipants.status} = 'joined')::int
        + (SELECT count(*) FROM ${meetingRsvps}
            WHERE ${meetingRsvps.meetingId} = ${clubMeetings.id}
              AND ${meetingRsvps.status} = 'joined')::int
      `,
    })
    .from(clubMeetings)
    .where(eq(clubMeetings.clubId, id))
    .orderBy(asc(clubMeetings.date));

  return (
    <ClubDetailClient
      club={{
        id: club.id,
        name: club.name,
        category: club.category,
        region: club.region,
        description: club.description,
        memberCount: club.memberCount ?? 0,
      }}
      meetings={meetingRows.map((m) => ({
        id: m.id,
        title: m.title,
        dateLabel: formatMeetingDate(m.date),
        location: m.location,
        joinedCount: m.joinedCount,
        maxParticipants: m.maxParticipants ?? 20,
      }))}
      canCreateMeeting={membership?.role === "owner" || membership?.role === "admin"}
    />
  );
}
```

- [ ] **Step 2: 클라이언트 서브트리 생성**

`src/app/(main)/club/[id]/ClubDetailClient.tsx` — 기존 page.tsx의 JSX를 기반으로 하되:
- `clubData` 목업 제거 → `club` prop 사용 (emoji는 카테고리 이모지 맵으로: 아래 `CATEGORY_EMOJI` 사용, 없으면 "🌼")
- `meetings` 목업 제거 → `meetings` prop 사용, `참여하기` 버튼 제거(카드 전체가 상세 링크)
- 일정 탭 상단에 `canCreateMeeting`일 때 [+ 모임 만들기] 버튼 (`/club/{id}/meeting/create` 링크)
- `notices`/`posts`/`members`/사진 목업은 유지하고 mypage 스타일 주석으로 표기

```tsx
"use client";

import { Bell, CalendarDots, ChatCircle, ImageSquare, MapPin, Plus, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClubInfo {
  id: string;
  name: string;
  category: string;
  region: string;
  description: string;
  memberCount: number;
}

interface MeetingItem {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  joinedCount: number;
  maxParticipants: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  등산: "⛰️",
  골프: "⛳",
  독서: "📚",
  요리: "🍳",
  사진: "📷",
  여행: "✈️",
  음악: "🎵",
  댄스: "💃",
  낚시: "🎣",
  바둑: "⚫",
  원예: "🌿",
  수영: "🏊",
};

// Mock data — to be replaced when respective domains are wired (Phase 3+):
//   notices ← h_club_posts type='notice', posts ← h_club_posts, members ← h_club_members
const notices = [
  { id: "1", content: "3월 정기모임: 3/15(토) 북한산 코스", date: "2024-03-01" },
  { id: "2", content: "신입 회원 환영합니다!", date: "2024-02-28" },
];
const posts = [
  {
    id: "1",
    author: "산사랑",
    content: "지난주 관악산 후기입니다 🏔️",
    likes: 12,
    comments: 3,
    date: "2024-03-02",
  },
  {
    id: "2",
    author: "등산매니아",
    content: "등산화 추천 부탁드려요",
    likes: 5,
    comments: 8,
    date: "2024-03-01",
  },
];
const members = [
  { id: "u1", nickname: "산사랑", role: "owner" as const },
  { id: "u2", nickname: "등산매니아", role: "admin" as const },
  { id: "u3", nickname: "건강한인생", role: "member" as const },
  { id: "u4", nickname: "행복한시니어", role: "member" as const },
];
const photoSlots = ["photo-1", "photo-2", "photo-3", "photo-4", "photo-5", "photo-6"] as const;
const roleLabels: Record<string, string> = { owner: "모임장", admin: "운영진", member: "멤버" };

export function ClubDetailClient({
  club,
  meetings,
  canCreateMeeting,
}: {
  club: ClubInfo;
  meetings: MeetingItem[];
  canCreateMeeting: boolean;
}) {
  const [joined, setJoined] = useState(false);

  return (
    <div className="space-y-4">
      {/* Club Header */}
      <div className="bg-gradient-to-b from-orange-100 to-white p-6 text-center">
        <div className="text-5xl mb-3">{CATEGORY_EMOJI[club.category] ?? "🌼"}</div>
        <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Badge>{club.category}</Badge>
          <Badge variant="secondary">{club.region}</Badge>
          <span className="text-sm text-gray-400">멤버 {club.memberCount}명</span>
        </div>
        <p className="mt-3 text-base text-gray-600">{club.description}</p>
        <Button
          className="mt-4 w-full max-w-xs"
          size="lg"
          variant={joined ? "outline" : "default"}
          onClick={() => setJoined(!joined)}
        >
          {joined ? "가입됨 ✓" : "클럽 가입하기"}
        </Button>
      </div>

      {/* 지도에서 보기 — Phase 2 cross-link */}
      <div className="px-4">
        <Link href="/map" className="block">
          <Card className="transition-all hover:border-sage-200 hover:shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-50">
                <MapPin size={24} weight="duotone" className="text-sage-700" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-mocha-900">지도에서 보기</p>
                <p className="text-base text-mocha-700">모임 장소와 주변 정보를 확인해보세요</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="notice">
          <TabsList>
            <TabsTrigger value="notice">
              <Bell size={18} className="mr-1" /> 공지
            </TabsTrigger>
            <TabsTrigger value="board">게시판</TabsTrigger>
            <TabsTrigger value="meeting">
              <CalendarDots size={18} className="mr-1" /> 일정
            </TabsTrigger>
            <TabsTrigger value="photo">
              <ImageSquare size={18} className="mr-1" /> 사진
            </TabsTrigger>
            <TabsTrigger value="chat">
              <ChatCircle size={18} className="mr-1" /> 채팅
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users size={18} className="mr-1" /> 멤버
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notice" className="space-y-3">
            {notices.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <p className="text-base font-medium text-gray-900">{n.content}</p>
                  <p className="mt-1 text-sm text-gray-400">{n.date}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="board" className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">{post.author[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-base font-medium">{post.author}</span>
                    <span className="text-sm text-gray-400">{post.date}</span>
                  </div>
                  <p className="text-base text-gray-700">{post.content}</p>
                  <div className="mt-2 flex gap-3 text-sm text-gray-400">
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="meeting" className="space-y-3">
            {canCreateMeeting && (
              <Link href={`/club/${club.id}/meeting/create`} className="block">
                <Button className="w-full" size="lg" variant="outline">
                  <Plus size={22} weight="bold" />
                  모임 만들기
                </Button>
              </Link>
            )}
            {meetings.length === 0 && (
              <p className="py-8 text-center text-base text-gray-400">아직 예정된 모임이 없어요</p>
            )}
            {meetings.map((m) => (
              <Link key={m.id} href={`/club/${club.id}/meeting/${m.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{m.title}</h3>
                    <p className="mt-1 text-base text-gray-500">📅 {m.dateLabel}</p>
                    <p className="text-base text-gray-500">📍 {m.location}</p>
                    <p className="mt-2 text-sm text-gray-400">
                      {m.joinedCount}/{m.maxParticipants}명 참여
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="photo">
            <div className="grid grid-cols-3 gap-2">
              {photoSlots.map((photoId) => (
                <div
                  key={photoId}
                  className="aspect-square rounded-xl bg-gray-200 flex items-center justify-center text-2xl"
                >
                  📷
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <div className="py-8 text-center">
              <ChatCircle size={48} className="mx-auto text-gray-300" />
              <p className="mt-3 text-base text-gray-400">클럽 채팅방</p>
              <Button className="mt-3" onClick={() => {}}>
                채팅 참여하기
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
                <Avatar>
                  <AvatarFallback>{m.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900">{m.nickname}</span>
                </div>
                <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                  {roleLabels[m.role]}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 4: 런타임 검증 (브라우저)**

`http://localhost:3000/club/{Task4의 clubId}`:
1. 헤더에 실제 클럽 이름/카테고리/지역/소개 표시
2. 일정 탭: [모임 만들기] 버튼(owner라서 보임) + Task 6에서 만든 미팅이 KST 일시 라벨로 표시
3. 존재하지 않는 id `/club/no-such-club` → 404

- [ ] **Step 5: Commit**

```powershell
git add "src/app/(main)/club/[id]/page.tsx" "src/app/(main)/club/[id]/ClubDetailClient.tsx"
git commit -m "feat(club): club detail server component + real meetings tab"
```

---

### Task 8: 회원 참석 API + 미팅 상세 페이지 재작성 (+ShareBar)

**Files:**
- Create: `src/app/api/clubs/[id]/meetings/[mid]/join/route.ts`
- Modify: `src/app/(main)/club/[id]/meeting/[mid]/page.tsx` (서버 컴포넌트로 재작성)
- Create: `src/app/(main)/club/[id]/meeting/[mid]/MeetingDetailClient.tsx`

**Interfaces:**
- Consumes: `formatMeetingDate`, `ShareBar`, Drizzle 스키마
- Produces:
  - `POST /api/clubs/[id]/meetings/[mid]/join` — body `{ action: "join" | "cancel" }` → `{ success, data: { status } }`. 클럽 멤버만. 정원 초과 시 409 `MEETING_FULL`.
  - `MeetingDetailClient({ clubId, meeting, viewerJoined, participants, guests, isOwnerAdmin, isPast })`
    - `meeting: { id, title, dateLabel, location, description, maxParticipants, joinedCount }`
    - `participants: { userId: string; nickname: string }[]` (joined만)
    - `guests: { id: string; name: string; status: "joined" | "declined"; phone: string | null }[]` — `phone`은 서버가 `isOwnerAdmin`일 때만 채워서 내려줌 (아니면 항상 null)

- [ ] **Step 1: 참석 토글 API 생성**

`src/app/api/clubs/[id]/meetings/[mid]/join/route.ts`:

```typescript
import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMeetings, clubMembers, meetingParticipants, meetingRsvps } from "@/db/schema";
import {
  errorResponse,
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const JoinSchema = z.object({ action: z.enum(["join", "cancel"]) });

// POST /api/clubs/[id]/meetings/[mid]/join - 회원 참석/취소 토글
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const { id, mid } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = JoinSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError();

  try {
    const [meeting] = await db
      .select({ id: clubMeetings.id, date: clubMeetings.date, max: clubMeetings.maxParticipants })
      .from(clubMeetings)
      .where(and(eq(clubMeetings.id, mid), eq(clubMeetings.clubId, id)))
      .limit(1);
    if (!meeting) return notFoundError("모임을 찾을 수 없습니다");
    if (meeting.date < new Date()) {
      return errorResponse("MEETING_PAST", "이미 지난 모임이에요", 409);
    }

    const [membership] = await db
      .select({ role: clubMembers.role })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (!membership) return forbiddenError("클럽 회원만 참석할 수 있어요");

    if (parsed.data.action === "join") {
      const [{ count }] = await db
        .select({
          count: sql<number>`
            (SELECT count(*) FROM ${meetingParticipants}
              WHERE ${meetingParticipants.meetingId} = ${mid}
                AND ${meetingParticipants.status} = 'joined')::int
            + (SELECT count(*) FROM ${meetingRsvps}
                WHERE ${meetingRsvps.meetingId} = ${mid}
                  AND ${meetingRsvps.status} = 'joined')::int
          `,
        })
        .from(clubMeetings)
        .where(eq(clubMeetings.id, mid));
      if (count >= (meeting.max ?? 20)) {
        return errorResponse("MEETING_FULL", "모임 정원이 가득 찼어요", 409);
      }
    }

    const status = parsed.data.action === "join" ? ("joined" as const) : ("cancelled" as const);
    await db
      .insert(meetingParticipants)
      .values({ meetingId: mid, userId: user.id, status })
      .onConflictDoUpdate({
        target: [meetingParticipants.meetingId, meetingParticipants.userId],
        set: { status },
      });

    return successResponse({ status });
  } catch (err) {
    console.error("[meeting join POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 미팅 상세 서버 컴포넌트 재작성**

`src/app/(main)/club/[id]/meeting/[mid]/page.tsx` 전체 교체 (기존 목업/리뷰 UI 제거 — 리뷰는 도메인 wire-up 전이므로 이번 재작성에서 탭 자체를 뺀다):

```tsx
import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import {
  clubMeetings,
  clubMembers,
  clubs,
  meetingParticipants,
  meetingRsvps,
  profiles,
} from "@/db/schema";
import { formatMeetingDate } from "@/lib/format-date";
import { createClient } from "@/lib/supabase/server";
import { MeetingDetailClient } from "./MeetingDetailClient";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id, mid } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [row] = await db
    .select({ meeting: clubMeetings, clubName: clubs.name })
    .from(clubMeetings)
    .leftJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(and(eq(clubMeetings.id, mid), eq(clubMeetings.clubId, id)))
    .limit(1);
  if (!row) notFound();
  const { meeting, clubName } = row;

  const [membership] = await db
    .select({ role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
    .limit(1);
  const isOwnerAdmin = membership?.role === "owner" || membership?.role === "admin";

  const participantRows = await db
    .select({
      userId: meetingParticipants.userId,
      status: meetingParticipants.status,
      nickname: profiles.nickname,
    })
    .from(meetingParticipants)
    .leftJoin(profiles, eq(meetingParticipants.userId, profiles.id))
    .where(eq(meetingParticipants.meetingId, mid));

  const guestRows = await db
    .select()
    .from(meetingRsvps)
    .where(eq(meetingRsvps.meetingId, mid))
    .orderBy(asc(meetingRsvps.createdAt));

  const participants = participantRows
    .filter((p) => p.status === "joined")
    .map((p) => ({ userId: p.userId, nickname: p.nickname ?? "회원" }));
  const guests = guestRows.map((g) => ({
    id: g.id,
    name: g.guestName,
    status: g.status,
    phone: isOwnerAdmin ? g.guestPhone : null,
  }));
  const joinedCount = participants.length + guests.filter((g) => g.status === "joined").length;

  return (
    <MeetingDetailClient
      clubId={id}
      meeting={{
        id: meeting.id,
        title: meeting.title,
        clubName: clubName ?? "하모니 모임",
        dateLabel: formatMeetingDate(meeting.date),
        location: meeting.location,
        description: meeting.description ?? "",
        maxParticipants: meeting.maxParticipants ?? 20,
        joinedCount,
      }}
      viewerJoined={participantRows.some((p) => p.userId === user.id && p.status === "joined")}
      participants={participants}
      guests={guests}
      isOwnerAdmin={isOwnerAdmin}
      isPast={meeting.date < new Date()}
    />
  );
}
```

- [ ] **Step 3: 미팅 상세 클라이언트 서브트리 생성**

`src/app/(main)/club/[id]/meeting/[mid]/MeetingDetailClient.tsx`:

```tsx
"use client";

import { ArrowLeft, CalendarDots, MapPin, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareBar } from "@/components/share/ShareBar";

interface MeetingInfo {
  id: string;
  title: string;
  clubName: string;
  dateLabel: string;
  location: string;
  description: string;
  maxParticipants: number;
  joinedCount: number;
}

interface GuestItem {
  id: string;
  name: string;
  status: "joined" | "declined";
  phone: string | null;
}

export function MeetingDetailClient({
  clubId,
  meeting,
  viewerJoined,
  participants,
  guests,
  isOwnerAdmin,
  isPast,
}: {
  clubId: string;
  meeting: MeetingInfo;
  viewerJoined: boolean;
  participants: { userId: string; nickname: string }[];
  guests: GuestItem[];
  isOwnerAdmin: boolean;
  isPast: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleJoin() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/meetings/${meeting.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: viewerJoined ? "cancel" : "join" }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "요청에 실패했어요. 다시 시도해주세요");
        return;
      }
      router.refresh();
    } catch {
      setError("요청에 실패했어요. 다시 시도해주세요");
    } finally {
      setPending(false);
    }
  }

  const joinedGuests = guests.filter((g) => g.status === "joined");

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/club/${clubId}`}
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <p className="text-base font-semibold text-coral-600">{meeting.clubName}</p>
          <CardTitle className="text-2xl">{meeting.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-center gap-2 text-lg text-gray-700">
            <CalendarDots size={22} weight="duotone" />
            {meeting.dateLabel}
          </p>
          <p className="flex items-center gap-2 text-lg text-gray-700">
            <MapPin size={22} weight="duotone" />
            {meeting.location}
          </p>
          <p className="flex items-center gap-2 text-lg text-gray-700">
            <Users size={22} weight="duotone" />
            {meeting.joinedCount}명 참여 중 (최대 {meeting.maxParticipants}명)
          </p>
          {meeting.description && (
            <p className="border-t border-gray-100 pt-3 text-base text-gray-700">
              {meeting.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 카톡 초대장 공유 — 이 기능이 이 페이지의 핵심 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">카톡으로 초대장 보내기</CardTitle>
          <p className="text-base text-gray-500">
            회원이 아니어도 초대장에서 바로 참석 응답할 수 있어요
          </p>
        </CardHeader>
        <CardContent>
          <ShareBar
            title={`${meeting.clubName} · ${meeting.title}`}
            description={`${meeting.dateLabel} · ${meeting.location}`}
            path={`/s/meeting/${meeting.id}`}
          />
        </CardContent>
      </Card>

      {!isPast && (
        <div className="space-y-2">
          {error && <p className="text-base font-semibold text-red-600">{error}</p>}
          <Button
            className="w-full"
            size="lg"
            variant={viewerJoined ? "outline" : "default"}
            disabled={pending || (!viewerJoined && meeting.joinedCount >= meeting.maxParticipants)}
            onClick={toggleJoin}
          >
            {viewerJoined
              ? "참석 취소하기"
              : meeting.joinedCount >= meeting.maxParticipants
                ? "정원이 가득 찼어요"
                : "참석하기"}
          </Button>
        </div>
      )}
      {isPast && <p className="text-center text-base text-gray-400">지난 모임이에요</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">참석자 ({meeting.joinedCount}명)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-2">
              <span className="text-base font-medium text-gray-900">{p.nickname}</span>
              <Badge variant="secondary">회원</Badge>
            </div>
          ))}
          {joinedGuests.map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <span className="text-base font-medium text-gray-900">{g.name}</span>
              <Badge variant="cream">초대 손님</Badge>
              {isOwnerAdmin && g.phone && <span className="text-sm text-gray-400">{g.phone}</span>}
            </div>
          ))}
          {meeting.joinedCount === 0 && (
            <p className="text-base text-gray-400">아직 참석자가 없어요</p>
          )}
        </CardContent>
      </Card>

      {isOwnerAdmin && guests.some((g) => g.status === "declined") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">불참 응답</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {guests
              .filter((g) => g.status === "declined")
              .map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-base text-gray-500">{g.name}</span>
                  {g.phone && <span className="text-sm text-gray-400">{g.phone}</span>}
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 5: 런타임 검증 (브라우저)**

`http://localhost:3000/club/{clubId}/meeting/{meetingId}`:
1. 실제 미팅 정보 렌더, **일시 라벨이 Task 6에서 입력한 KST 시각과 일치** (타임존 왕복 검증)
2. [참석하기] 클릭 → 새로고침 후 "참석 취소하기"로 바뀌고 참석자 목록에 내 닉네임 + 회원 배지
3. "카톡으로 초대장 보내기" 카드에서 [링크 복사] → `/s/meeting/{meetingId}` 링크 확인 (페이지는 Task 10에서 생성 — 아직 404여도 정상)

- [ ] **Step 6: Commit**

```powershell
git add "src/app/api/clubs/[id]/meetings/[mid]/join/route.ts" "src/app/(main)/club/[id]/meeting/[mid]/page.tsx" "src/app/(main)/club/[id]/meeting/[mid]/MeetingDetailClient.tsx"
git commit -m "feat(club): meeting join api + meeting detail with invite share"
```

---

### Task 9: 게스트 RSVP API (공개)

**Files:**
- Create: `src/app/api/share/meetings/[id]/rsvp/route.ts`

**Interfaces:**
- Consumes: `clubMeetings`, `meetingParticipants`, `meetingRsvps` — `@/db/schema`
- Produces: `POST /api/share/meetings/[id]/rsvp` (인증 없음 — proxy는 `/api/*` 미차단, 라우트도 auth 검사 안 함)
  - body: `{ guestName: string(1~20), guestPhone?: string, status: "joined" | "declined" }`
  - 201 `{ success, data: { id, guestName, status } }` — **guestPhone은 응답에 미포함**
  - 409 `MEETING_PAST` | `MEETING_FULL` | `RSVP_CAP`, 404, 422

- [ ] **Step 1: RSVP 라우트 생성**

`src/app/api/share/meetings/[id]/rsvp/route.ts`:

```typescript
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMeetings, meetingParticipants, meetingRsvps } from "@/db/schema";
import {
  errorResponse,
  notFoundError,
  serverError,
  successResponse,
  validationError,
} from "@/lib/api-response";

const RSVP_CAP = 200;

const RsvpSchema = z.object({
  guestName: z.string().trim().min(1, "이름을 입력해주세요").max(20, "이름은 20자까지 가능해요"),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[0-9-]{8,13}$/, "전화번호 형식이 올바르지 않아요")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["joined", "declined"]),
});

// POST /api/share/meetings/[id]/rsvp - 비로그인 게스트 참석 응답 (공개)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = RsvpSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const [meeting] = await db
      .select({ id: clubMeetings.id, date: clubMeetings.date, max: clubMeetings.maxParticipants })
      .from(clubMeetings)
      .where(eq(clubMeetings.id, id))
      .limit(1);
    if (!meeting) return notFoundError("초대장을 찾을 수 없어요");
    if (meeting.date < new Date()) {
      return errorResponse("MEETING_PAST", "이미 지난 모임이에요", 409);
    }

    const [{ rsvpCount }] = await db
      .select({ rsvpCount: sql<number>`count(*)::int` })
      .from(meetingRsvps)
      .where(eq(meetingRsvps.meetingId, id));
    if (rsvpCount >= RSVP_CAP) {
      return errorResponse("RSVP_CAP", "응답이 너무 많아요. 총무님께 직접 말씀해주세요", 409);
    }

    if (parsed.data.status === "joined") {
      const [{ joinedCount }] = await db
        .select({
          joinedCount: sql<number>`
            (SELECT count(*) FROM ${meetingParticipants}
              WHERE ${meetingParticipants.meetingId} = ${id}
                AND ${meetingParticipants.status} = 'joined')::int
            + (SELECT count(*) FROM ${meetingRsvps}
                WHERE ${meetingRsvps.meetingId} = ${id}
                  AND ${meetingRsvps.status} = 'joined')::int
          `,
        })
        .from(clubMeetings)
        .where(eq(clubMeetings.id, id));
      if (joinedCount >= (meeting.max ?? 20)) {
        return errorResponse("MEETING_FULL", "모임 정원이 가득 찼어요", 409);
      }
    }

    const rsvpId = crypto.randomUUID();
    await db.insert(meetingRsvps).values({
      id: rsvpId,
      meetingId: id,
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone ?? null,
      status: parsed.data.status,
    });

    return successResponse({ id: rsvpId, guestName: parsed.data.guestName, status: parsed.data.status }, 201);
  } catch (err) {
    console.error("[share rsvp POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 3: 런타임 검증 (PowerShell, 비인증)**

`{meetingId}`는 Task 6에서 만든 미팅 id로 치환:

```powershell
# 정상 참석
Invoke-RestMethod -Uri "http://localhost:3000/api/share/meetings/{meetingId}/rsvp" -Method Post -ContentType "application/json" -Body '{"guestName":"김영희","status":"joined"}'
# 정상 불참 (전화번호 포함)
Invoke-RestMethod -Uri "http://localhost:3000/api/share/meetings/{meetingId}/rsvp" -Method Post -ContentType "application/json" -Body '{"guestName":"박철수","guestPhone":"010-1234-5678","status":"declined"}'
# 검증 실패 (빈 이름)
Invoke-RestMethod -Uri "http://localhost:3000/api/share/meetings/{meetingId}/rsvp" -Method Post -ContentType "application/json" -Body '{"guestName":"","status":"joined"}'
# 없는 모임
Invoke-RestMethod -Uri "http://localhost:3000/api/share/meetings/no-such-meeting/rsvp" -Method Post -ContentType "application/json" -Body '{"guestName":"김영희","status":"joined"}'
```

Expected 순서대로: 201 성공(응답에 guestPhone 없음) / 201 성공 / 422 예외 / 404 예외.

- [ ] **Step 4: Commit**

```powershell
git add src/app/api/share/
git commit -m "feat(share): public guest rsvp api"
```

---

### Task 10: 모임 초대장 페이지 (+메타데이터, OG 이미지)

**Files:**
- Create: `src/app/s/meeting/[id]/page.tsx`
- Create: `src/app/s/meeting/[id]/RsvpForm.tsx`
- Create: `src/app/s/meeting/[id]/opengraph-image.tsx`

**Interfaces:**
- Consumes: Task 9의 RSVP API, `formatMeetingDate`, `ShareBar`, `loadOgFont`, Drizzle 스키마
- Produces: 공개 URL `/s/meeting/{meetingId}` — Task 8의 ShareBar가 이 링크를 공유

- [ ] **Step 1: 초대장 페이지 생성**

`src/app/s/meeting/[id]/page.tsx` — `cache()`로 page/generateMetadata 간 중복 쿼리 제거:

```tsx
import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarDots, MapPin, Users } from "@phosphor-icons/react/dist/ssr";
import { ShareBar } from "@/components/share/ShareBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { clubMeetings, clubs, meetingParticipants, meetingRsvps, profiles } from "@/db/schema";
import { formatMeetingDate } from "@/lib/format-date";
import { RsvpForm } from "./RsvpForm";

const getMeeting = cache(async (id: string) => {
  const [row] = await db
    .select({ meeting: clubMeetings, clubName: clubs.name })
    .from(clubMeetings)
    .leftJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(eq(clubMeetings.id, id))
    .limit(1);
  return row ?? null;
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getMeeting(id);
  if (!row) return {};
  const { meeting, clubName } = row;
  return {
    title: `${clubName ?? "하모니"} · ${meeting.title}`,
    description: `${formatMeetingDate(meeting.date)} · ${meeting.location} · 참석 여부를 알려주세요`,
  };
}

function kakaoMapUrl(location: string, lat: string | null, lng: string | null): string {
  if (lat && lng) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(location)},${lat},${lng}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(location)}`;
}

export default async function MeetingInvitePage({ params }: Props) {
  const { id } = await params;
  const row = await getMeeting(id);
  if (!row) notFound();
  const { meeting, clubName } = row;

  const participantRows = await db
    .select({ nickname: profiles.nickname, status: meetingParticipants.status })
    .from(meetingParticipants)
    .leftJoin(profiles, eq(meetingParticipants.userId, profiles.id))
    .where(eq(meetingParticipants.meetingId, id));
  const guestRows = await db
    .select({ id: meetingRsvps.id, name: meetingRsvps.guestName, status: meetingRsvps.status })
    .from(meetingRsvps)
    .where(eq(meetingRsvps.meetingId, id))
    .orderBy(asc(meetingRsvps.createdAt));

  const attendees = [
    ...participantRows
      .filter((p) => p.status === "joined")
      .map((p, i) => ({ key: `p-${i}`, name: p.nickname ?? "회원" })),
    ...guestRows.filter((g) => g.status === "joined").map((g) => ({ key: g.id, name: g.name })),
  ];
  const isPast = meeting.date < new Date();
  const isFull = attendees.length >= (meeting.maxParticipants ?? 20);
  const dateLabel = formatMeetingDate(meeting.date);

  return (
    <div className="space-y-4 p-5">
      <div className="pt-2 text-center">
        <p className="text-lg font-bold text-coral-600">{clubName ?? "하모니 모임"}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-mocha-900">
          {meeting.title}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="flex items-center gap-2 text-lg text-mocha-900">
            <CalendarDots size={24} weight="duotone" className="shrink-0 text-coral-500" />
            {dateLabel}
          </p>
          <div className="flex items-center gap-2 text-lg text-mocha-900">
            <MapPin size={24} weight="duotone" className="shrink-0 text-coral-500" />
            <span className="flex-1">{meeting.location}</span>
            <a
              href={kakaoMapUrl(meeting.location, meeting.locationLat, meeting.locationLng)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sage-50 px-3 py-2 text-base font-bold text-sage-700"
            >
              길찾기
            </a>
          </div>
          <p className="flex items-center gap-2 text-lg text-mocha-900">
            <Users size={24} weight="duotone" className="shrink-0 text-coral-500" />
            {attendees.length}명 참석 (최대 {meeting.maxParticipants ?? 20}명)
          </p>
          {meeting.description && (
            <p className="border-t border-mocha-100 pt-3 text-base leading-relaxed text-mocha-800">
              {meeting.description}
            </p>
          )}
        </CardContent>
      </Card>

      {isPast ? (
        <p className="py-4 text-center text-lg font-semibold text-mocha-500">지난 모임이에요</p>
      ) : (
        <RsvpForm meetingId={meeting.id} isFull={isFull} />
      )}

      {attendees.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">참석하는 분들</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {attendees.map((a) => (
              <Badge key={a.key} variant="secondary" className="text-base">
                {a.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        <ShareBar
          title={`${clubName ?? "하모니 모임"} · ${meeting.title}`}
          description={`${dateLabel} · ${meeting.location}`}
          path={`/s/meeting/${meeting.id}`}
        />
      </div>

      <p className="text-center text-base font-semibold text-mocha-700">
        하모니에 가입하면 다음 모임 알림을 받을 수 있어요
      </p>
    </div>
  );
}
```

- [ ] **Step 2: RSVP 폼 생성**

`src/app/s/meeting/[id]/RsvpForm.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RsvpStatus = "joined" | "declined";

interface StoredRsvp {
  name: string;
  status: RsvpStatus;
}

function storageKey(meetingId: string): string {
  return `harmony.rsvp.${meetingId}`;
}

export function RsvpForm({ meetingId, isFull }: { meetingId: string; isFull: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState<StoredRsvp | null>(null);
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(meetingId));
      if (raw) setDone(JSON.parse(raw));
    } catch {
      // localStorage 접근 불가 — 폼 그대로 노출
    }
  }, [meetingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/meetings/${meetingId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName: name, guestPhone: phone || undefined, status }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "응답을 보내지 못했어요. 다시 시도해주세요");
        return;
      }
      const stored: StoredRsvp = { name, status };
      try {
        localStorage.setItem(storageKey(meetingId), JSON.stringify(stored));
      } catch {
        // 저장 실패해도 응답 자체는 완료
      }
      setDone(stored);
      router.refresh();
    } catch {
      setError("응답을 보내지 못했어요. 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="border-coral-100 bg-coral-50">
        <CardContent className="space-y-1 p-5 text-center">
          <p className="text-xl font-extrabold text-mocha-900">
            {done.name}님, {done.status === "joined" ? "참석" : "불참"}으로 응답하셨어요
          </p>
          <p className="text-base text-mocha-700">변경은 총무님께 말씀해주세요</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <p className="text-center text-xl font-extrabold text-mocha-900">참석하시나요?</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            className="flex-1"
            variant={status === "joined" ? "default" : "outline"}
            disabled={isFull}
            onClick={() => setStatus("joined")}
          >
            참석해요
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1"
            variant={status === "declined" ? "default" : "outline"}
            onClick={() => setStatus("declined")}
          >
            못 가요
          </Button>
        </div>
        {isFull && (
          <p className="text-center text-base font-semibold text-mocha-500">
            정원이 가득 찼어요. 불참 응답만 보낼 수 있어요
          </p>
        )}
        {status && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rsvp-name">이름</Label>
              <Input
                id="rsvp-name"
                placeholder="이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rsvp-phone">전화번호 (선택)</Label>
              <Input
                id="rsvp-phone"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error && <p className="text-base font-semibold text-red-600">{error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? "보내는 중..." : "응답 보내기"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 초대장 OG 이미지 생성**

`src/app/s/meeting/[id]/opengraph-image.tsx`:

```tsx
import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/db";
import { clubMeetings, clubs } from "@/db/schema";
import { formatMeetingDate } from "@/lib/format-date";
import { loadOgFont } from "@/lib/og-font";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ meeting: clubMeetings, clubName: clubs.name })
    .from(clubMeetings)
    .leftJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(eq(clubMeetings.id, id))
    .limit(1);
  const font = await loadOgFont();

  const title = row?.meeting.title ?? "모임 초대장";
  const clubName = row?.clubName ?? "하모니";
  const dateLabel = row ? formatMeetingDate(row.meeting.date) : "";
  const location = row?.meeting.location ?? "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        backgroundColor: "#FFF7ED",
        fontFamily: "Pretendard",
        padding: 60,
      }}
    >
      <div style={{ fontSize: 40, color: "#EC6A52" }}>{clubName}</div>
      <div style={{ fontSize: 72, color: "#3D2C24", textAlign: "center", maxWidth: 1000 }}>
        {title}
      </div>
      <div style={{ fontSize: 40, color: "#8A6F5F" }}>{`📅 ${dateLabel}`}</div>
      <div style={{ fontSize: 40, color: "#8A6F5F" }}>{`📍 ${location}`}</div>
      <div
        style={{
          marginTop: 16,
          fontSize: 36,
          color: "#FFFFFF",
          backgroundColor: "#EC6A52",
          padding: "16px 48px",
          borderRadius: 24,
        }}
      >
        참석 여부를 알려주세요
      </div>
    </div>,
    { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700 }] }
  );
}
```

- [ ] **Step 4: typecheck + lint**

```powershell
npx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 5: 런타임 검증 (시크릿 창 — 핵심 E2E)**

시크릿 창(비로그인)에서 `http://localhost:3000/s/meeting/{meetingId}`:
1. 로그인 redirect 없이 초대장 렌더 (클럽명, 모임명, KST 일시, 장소, 길찾기 링크)
2. [참석해요] → 이름 "이순자" 입력 → [응답 보내기] → 완료 카드 표시 + "참석하는 분들"에 이순자 추가
3. 새로고침 → "이순자님, 참석으로 응답하셨어요" 유지 (localStorage)
4. `http://localhost:3000/s/meeting/{meetingId}/opengraph-image` → 초대장 OG 이미지 (한글 정상)
5. `http://localhost:3000/s/meeting/no-such-id` → 404
6. 로그인 상태로 미팅 상세(`/club/.../meeting/...`) → 참석자 목록에 "이순자 · 초대 손님" 확인, owner에게만 전화번호 표시 확인

- [ ] **Step 6: Commit**

```powershell
git add "src/app/s/meeting/"
git commit -m "feat(share): public meeting invite page with guest rsvp"
```

---

### Task 11: 최종 검증 스위프

**Files:** 없음 (검증만; 발견된 결함은 해당 태스크 파일로 돌아가 수정)

- [ ] **Step 1: 전체 정적 검증**

```powershell
npx tsc --noEmit && bun run lint && bun run build
```

Expected: 모두 성공. build에서 `/s/*` 라우트가 dynamic으로 잡히는지 출력 확인.

- [ ] **Step 2: E2E 시나리오 (두 채널 모두)**

**채널 A — 총무 흐름:** 로그인 → 클럽 생성 → 모임 생성 → 미팅 상세에서 [링크 복사] → 시크릿 창에서 초대장 열기 → 게스트 응답 → 로그인 창에서 참석자 반영 확인.

**채널 B — 운세 흐름:** 로그인 → `/fortune` → [링크 복사] → 시크릿 창에서 열기 → 운세 카드 + CTA 렌더 → CTA 클릭 시 `/register` 이동.

**보안 회귀:** 시크릿 창에서 `/search`, `/subscribe`, `/mypage` → 전부 로그인 redirect. `/s/fortune/.../opengraph-image`, `/s/meeting/.../opengraph-image` → 렌더 OK.

- [ ] **Step 3: 운영 셋업 체크리스트 상태 보고**

코드 밖 항목이라 구현으로 해결 불가 — 사용자에게 현재 상태를 보고:
- `NEXT_PUBLIC_KAKAO_JS_KEY` / `NEXT_PUBLIC_SITE_URL` Vercel 설정 여부 (`npx vercel env ls`)
- Kakao Developers 콘솔 도메인 등록 여부 (사용자 확인 필요)

- [ ] **Step 4: 최종 커밋 (잔여 변경분이 있으면)**

```powershell
git status --short
```

잔여 변경분이 있으면 해당 태스크 커밋 컨벤션으로 커밋.

---

## Self-Review 결과 (작성 시 수행)

- **스펙 커버리지:** 스펙 4→Task 1, 5→Task 1/2/3, 6-1→Task 4/6/7(클럽 스텁 발견으로 클럽 생성 wire-up 추가 — 스펙 12절 수정 기록), 6-2→Task 5, 6-3/6-4→Task 9/10, 6-5→Task 8, 7→Task 1/2/3, 8→각 페이지 에러 상태, 9→각 태스크 검증 스텝, 10→Task 11 Step 3. 갭 없음.
- **플레이스홀더:** 없음 (모든 코드 스텝에 전체 코드 포함).
- **타입 일관성:** `joinedCount` 라이브 계산 SQL은 Task 6/7/8/9 동일 패턴. `ShareBar` props(title/description/path/imagePath)는 Task 3 정의와 8/10 사용처 일치. `formatMeetingDate(date: Date): string`은 6/7/8/10 일치. `h_rsvp_status` enum 값("joined"/"declined")은 마이그레이션/Drizzle/Zod 일치.
