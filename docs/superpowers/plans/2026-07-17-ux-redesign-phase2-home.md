# UX 리디자인 Phase 2 (홈 재구성) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** home.png 시안대로 홈을 재구성한다 — "내 다음 모임" 히어로, 인라인 검색 진입점, 운세·건강 2열 카드, 모임 단위 "인기 모임", mock이던 추천 콘텐츠·커뮤니티 인기글의 실 DB 전환.

**Architecture:** 홈 데이터는 `src/lib/queries/home.ts`의 서버 전용 함수 5개로 분리하고, 페이지는 `Promise.all`로 병렬 조회 후 조립만 한다. KST 날짜 표기(short 포맷/D-day/상대시간)는 `src/lib/format-date.ts`에 순수 함수로 추가해 bun test로 고정한다. Phase 0-1의 `AvatarStack`·`categoryEmoji`·window-function 아바타 패턴을 재사용한다.

**Tech Stack:** Next.js 16 App Router (서버 컴포넌트 + 캐러셀만 client), Drizzle ORM, bun test, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-07-17-ux-redesign-captures-design.md` §6 (Phase 2)

## Global Constraints

- 사용자 노출 문자열 전부 한국어. 색상은 브랜드 토큰(coral/cream/mocha/sage)만, `orange-*` 금지.
- 타입 체크는 `bunx tsc --noEmit` (이 리포에서 `npx tsc`는 해석 안 됨). **`bun run format` 금지** — 변경 파일만 `bunx biome check <파일>`.
- drizzle raw sql에서 배열 바인딩은 `sql.join(arr.map((v) => sql`${v}`), sql`, `)` 필수 (`= any(${arr})`는 42809로 깨짐 — Phase 0-1 검증됨).
- raw SQL 테이블 참조는 `si_mvp.` 스키마 한정.
- DB 마이그레이션 없음 (Phase 2는 기존 테이블만 읽음). drizzle-kit 금지는 여전히 유효.
- 서버→클라이언트 컴포넌트 props로 `Date` 전달 가능 (RSC 직렬화 지원) — 문자열 변환 불필요.
- 홈(`/`)은 proxy 인증 게이트 뒤에 있음 — 비로그인 검증은 307 리다이렉트 확인까지. 로그인 UI 플로우는 사용자 수동 패스 항목으로 리포트에 명시.
- API 응답 헬퍼/라우트 변경 없음 (이 Phase는 페이지·컴포넌트·lib만).
- 커밋 메시지: repo 관례 + 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 작업 브랜치: `feature/ux-redesign-phase2` (main에서 분기, 플랜 커밋 포함). 태스크마다 커밋.

---

### Task 1: KST 날짜 표기 유틸 (TDD)

**Files:**
- Modify: `src/lib/format-date.ts` (기존 `formatMeetingDate`는 그대로 두고 추가만)
- Test: `src/lib/format-date.test.ts`

**Interfaces:**
- Consumes: 없음 (Intl만 사용)
- Produces (Tasks 3-4가 사용):
  - `kstDateString(date?: Date): string` — KST 기준 `YYYY-MM-DD`
  - `formatMeetingDateShort(date: Date): string` — 시안 표기 `5/25(월) 09:30`
  - `dDayLabel(target: Date, now?: Date): string` — KST 자정 기준 `D-DAY`/`D-n`/`D+n`
  - `relativeTimeLabel(date: Date, now?: Date): string` — `방금 전`/`n분 전`/`n시간 전`/`n일 전`/7일 이상 `M/D`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/format-date.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  dDayLabel,
  formatMeetingDateShort,
  kstDateString,
  relativeTimeLabel,
} from "./format-date";

// KST = UTC+9. 2026-05-25T09:30 KST = 2026-05-25T00:30:00Z (2026-05-25는 월요일)
const meeting = new Date("2026-05-25T00:30:00Z");

describe("kstDateString", () => {
  test("UTC 저녁은 KST 다음 날", () => {
    expect(kstDateString(new Date("2026-05-24T15:00:00Z"))).toBe("2026-05-25");
  });
});

describe("formatMeetingDateShort", () => {
  test("시안 표기 M/D(요일) HH:mm", () => {
    expect(formatMeetingDateShort(meeting)).toBe("5/25(월) 09:30");
  });
});

describe("dDayLabel", () => {
  const now = new Date("2026-05-23T03:00:00Z"); // KST 5/23 12:00
  test("이틀 뒤", () => {
    expect(dDayLabel(meeting, now)).toBe("D-2");
  });
  test("당일 (KST 기준)", () => {
    expect(dDayLabel(new Date("2026-05-23T14:00:00Z"), now)).toBe("D-DAY"); // KST 5/23 23:00
  });
  test("UTC로는 같은 날이지만 KST로는 다음 날", () => {
    expect(dDayLabel(new Date("2026-05-23T16:00:00Z"), now)).toBe("D-1"); // KST 5/24 01:00
  });
  test("지난 날짜", () => {
    expect(dDayLabel(new Date("2026-05-20T03:00:00Z"), now)).toBe("D+3");
  });
});

describe("relativeTimeLabel", () => {
  const now = new Date("2026-05-25T12:00:00Z");
  test("1분 미만", () => {
    expect(relativeTimeLabel(new Date("2026-05-25T11:59:40Z"), now)).toBe("방금 전");
  });
  test("분 단위", () => {
    expect(relativeTimeLabel(new Date("2026-05-25T11:30:00Z"), now)).toBe("30분 전");
  });
  test("시간 단위", () => {
    expect(relativeTimeLabel(new Date("2026-05-25T09:00:00Z"), now)).toBe("3시간 전");
  });
  test("일 단위", () => {
    expect(relativeTimeLabel(new Date("2026-05-23T12:00:00Z"), now)).toBe("2일 전");
  });
  test("7일 이상은 M/D", () => {
    expect(relativeTimeLabel(new Date("2026-05-01T12:00:00Z"), now)).toBe("5/1");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun test src/lib/format-date.test.ts`
Expected: FAIL — `kstDateString` 등 export 없음 (SyntaxError/undefined)

- [ ] **Step 3: 구현**

`src/lib/format-date.ts` 끝에 추가 (기존 `MEETING_DATE_FMT`/`formatMeetingDate`는 유지):

```ts
const KST_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// KST 기준 YYYY-MM-DD (운세 시드, 일자 로테이션용)
export function kstDateString(date: Date = new Date()): string {
  return KST_DATE_FMT.format(date);
}

const SHORT_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function shortParts(date: Date): (type: Intl.DateTimeFormatPartTypes) => string {
  const parts = SHORT_FMT.formatToParts(date);
  return (type) => parts.find((p) => p.type === type)?.value ?? "";
}

// 시안 표기: "5/25(월) 09:30"
export function formatMeetingDateShort(date: Date): string {
  const get = shortParts(date);
  return `${get("month")}/${get("day")}(${get("weekday")}) ${get("hour")}:${get("minute")}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function kstMidnightUtc(date: Date): number {
  const [y, m, d] = kstDateString(date).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// KST 자정 기준 D-day: 오늘 "D-DAY", 미래 "D-n", 과거 "D+n"
export function dDayLabel(target: Date, now: Date = new Date()): string {
  const diff = Math.round((kstMidnightUtc(target) - kstMidnightUtc(now)) / DAY_MS);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

// 커뮤니티 상대시간: 방금 전 / n분 전 / n시간 전 / n일 전, 7일 이상은 "M/D"
export function relativeTimeLabel(date: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const get = shortParts(date);
  return `${get("month")}/${get("day")}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/format-date.test.ts`
Expected: PASS (10 tests). `hour12: false`인데 `09:30`이 `9:30`으로 나오면 `SHORT_FMT`에 `hourCycle: "h23"`을 추가하고 `hour12` 제거 후 재실행 — 결과를 리포트에 기록.

- [ ] **Step 5: 타입/린트 확인 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/lib/format-date.ts src/lib/format-date.test.ts` → 오류 없음.

```bash
git add src/lib/format-date.ts src/lib/format-date.test.ts
git commit -m "feat(home): kst short date, d-day, relative-time helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 홈 데이터 쿼리 레이어

**Files:**
- Create: `src/lib/queries/home.ts`

**Interfaces:**
- Consumes: Drizzle 스키마 `clubMeetings`/`meetingParticipants`/`clubs`/`infoContents`/`communityPosts`/`profiles` (`@/db/schema` barrel)
- Produces (Tasks 3-4가 사용):
  - `type HomeMeeting = { id: string; clubId: string; title: string; date: Date; location: string; clubName: string; category: string; coverImage: string | null }`
  - `type PopularMeeting = HomeMeeting & { joinedCount: number; maxParticipants: number; participantAvatars: (string | null)[] }`
  - `type HomeInfo = { id: string; title: string; category: "health" | "finance" | "travel" | "hobby" | "gov"; viewCount: number; likeCount: number }`
  - `type HomePost = { id: string; title: string; nickname: string; createdAt: Date; likeCount: number; commentCount: number }`
  - `type HealthOneLiner = { text: string; href: string }`
  - `INFO_CATEGORY_LABELS: Record<HomeInfo["category"], string>`
  - `getMyNextMeetings(userId: string, limit?: number): Promise<HomeMeeting[]>`
  - `getPopularUpcomingMeetings(limit?: number): Promise<PopularMeeting[]>`
  - `getRecommendedInfos(limit?: number): Promise<HomeInfo[]>`
  - `getPopularCommunityPosts(limit?: number): Promise<HomePost[]>`
  - `getHealthOneLiner(todayKst: string): Promise<HealthOneLiner>`

- [ ] **Step 1: 구현**

`src/lib/queries/home.ts`:

```ts
import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clubMeetings,
  clubs,
  communityPosts,
  infoContents,
  meetingParticipants,
  profiles,
} from "@/db/schema";

export type HomeMeeting = {
  id: string;
  clubId: string;
  title: string;
  date: Date;
  location: string;
  clubName: string;
  category: string;
  coverImage: string | null;
};

export type PopularMeeting = HomeMeeting & {
  joinedCount: number;
  maxParticipants: number;
  participantAvatars: (string | null)[];
};

export type HomeInfo = {
  id: string;
  title: string;
  category: "health" | "finance" | "travel" | "hobby" | "gov";
  viewCount: number;
  likeCount: number;
};

export type HomePost = {
  id: string;
  title: string;
  nickname: string;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
};

export type HealthOneLiner = { text: string; href: string };

export const INFO_CATEGORY_LABELS: Record<HomeInfo["category"], string> = {
  health: "건강",
  finance: "금융",
  travel: "여행",
  hobby: "취미",
  gov: "정부지원",
};

// h_info_contents에 건강 글이 없을 때 일자 로테이션 폴백 (시안 "건강 한 줄")
const HEALTH_TIPS = [
  "물을 자주 마시는 습관이 피로 회복에 큰 도움이 됩니다.",
  "가벼운 스트레칭으로 하루를 시작해보세요.",
  "하루 30분 걷기가 심혈관 건강을 지켜줍니다.",
  "제철 채소를 식단에 더하면 면역력에 좋습니다.",
  "취침 1시간 전에는 휴대폰을 내려놓아 보세요.",
  "따뜻한 차 한 잔이 소화와 숙면을 돕습니다.",
  "손 씻기만 잘해도 감염병 대부분을 예방할 수 있습니다.",
];

const HERO_LIMIT = 3;
const POPULAR_LIMIT = 5;
const LIST_LIMIT = 3;
const AVATAR_LIMIT = 3;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getMyNextMeetings(userId: string, limit = HERO_LIMIT): Promise<HomeMeeting[]> {
  const rows = await db
    .select({
      id: clubMeetings.id,
      clubId: clubMeetings.clubId,
      title: clubMeetings.title,
      date: clubMeetings.date,
      location: clubMeetings.location,
      clubName: clubs.name,
      category: clubs.category,
      coverImage: clubs.coverImage,
    })
    .from(meetingParticipants)
    .innerJoin(clubMeetings, eq(meetingParticipants.meetingId, clubMeetings.id))
    .innerJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(
      and(
        eq(meetingParticipants.userId, userId),
        eq(meetingParticipants.status, "joined"),
        gte(clubMeetings.date, new Date())
      )
    )
    .orderBy(clubMeetings.date)
    .limit(limit);
  return rows.map((r) => ({ ...r, clubId: r.clubId ?? "" }));
}

const joinedCountSql = sql<number>`(
  select count(*)::int
  from si_mvp.h_meeting_participants mp
  where mp.meeting_id = ${clubMeetings.id} and mp.status = 'joined'
)`;

export async function getPopularUpcomingMeetings(limit = POPULAR_LIMIT): Promise<PopularMeeting[]> {
  const rows = await db
    .select({
      id: clubMeetings.id,
      clubId: clubMeetings.clubId,
      title: clubMeetings.title,
      date: clubMeetings.date,
      location: clubMeetings.location,
      maxParticipants: clubMeetings.maxParticipants,
      clubName: clubs.name,
      category: clubs.category,
      coverImage: clubs.coverImage,
      joinedCount: joinedCountSql,
    })
    .from(clubMeetings)
    .innerJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(gte(clubMeetings.date, new Date()))
    .orderBy(desc(joinedCountSql), clubMeetings.date)
    .limit(limit);

  const ids = rows.map((r) => r.id);
  const avatarsByMeeting = new Map<string, (string | null)[]>();
  if (ids.length > 0) {
    const result = await db.execute(sql`
      select meeting_id, avatar_url
      from (
        select mp.meeting_id, p.avatar_url,
               row_number() over (partition by mp.meeting_id order by mp.joined_at desc) as rn
        from si_mvp.h_meeting_participants mp
        join si_mvp.h_profiles p on p.id = mp.user_id
        where mp.status = 'joined'
          and mp.meeting_id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
      ) ranked
      where rn <= ${AVATAR_LIMIT}
    `);
    for (const row of result as unknown as { meeting_id: string; avatar_url: string | null }[]) {
      const list = avatarsByMeeting.get(row.meeting_id) ?? [];
      list.push(row.avatar_url);
      avatarsByMeeting.set(row.meeting_id, list);
    }
  }

  return rows.map((r) => ({
    ...r,
    clubId: r.clubId ?? "",
    maxParticipants: r.maxParticipants ?? 20,
    participantAvatars: avatarsByMeeting.get(r.id) ?? [],
  }));
}

export async function getRecommendedInfos(limit = LIST_LIMIT): Promise<HomeInfo[]> {
  const rows = await db
    .select({
      id: infoContents.id,
      title: infoContents.title,
      category: infoContents.category,
      viewCount: infoContents.viewCount,
      likeCount: infoContents.likeCount,
    })
    .from(infoContents)
    .orderBy(desc(infoContents.viewCount), desc(infoContents.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, viewCount: r.viewCount ?? 0, likeCount: r.likeCount ?? 0 }));
}

const popularitySql = sql<number>`${communityPosts.likeCount} + ${communityPosts.commentCount} * 2`;

export async function getPopularCommunityPosts(limit = LIST_LIMIT): Promise<HomePost[]> {
  const selection = {
    id: communityPosts.id,
    title: communityPosts.title,
    nickname: profiles.nickname,
    createdAt: communityPosts.createdAt,
    likeCount: communityPosts.likeCount,
    commentCount: communityPosts.commentCount,
  };
  const recent = await db
    .select(selection)
    .from(communityPosts)
    .leftJoin(profiles, eq(communityPosts.userId, profiles.id))
    .where(gte(communityPosts.createdAt, new Date(Date.now() - SEVEN_DAYS_MS)))
    .orderBy(desc(popularitySql), desc(communityPosts.createdAt))
    .limit(limit);
  // 최근 7일 글이 없으면 전체 최신 글로 폴백 (홈 섹션이 통째로 비어 보이지 않게)
  const rows =
    recent.length > 0
      ? recent
      : await db
          .select(selection)
          .from(communityPosts)
          .leftJoin(profiles, eq(communityPosts.userId, profiles.id))
          .orderBy(desc(communityPosts.createdAt))
          .limit(limit);
  return rows.map((r) => ({
    ...r,
    nickname: r.nickname ?? "하모니 회원",
    createdAt: r.createdAt ?? new Date(),
    likeCount: r.likeCount ?? 0,
    commentCount: r.commentCount ?? 0,
  }));
}

export async function getHealthOneLiner(todayKst: string): Promise<HealthOneLiner> {
  const [row] = await db
    .select({
      id: infoContents.id,
      title: infoContents.title,
      summaryBox: infoContents.summaryBox,
    })
    .from(infoContents)
    .where(eq(infoContents.category, "health"))
    .orderBy(desc(infoContents.createdAt))
    .limit(1);
  if (row) return { text: row.summaryBox ?? row.title, href: `/info/${row.id}` };
  const dayIndex = Number(todayKst.slice(8, 10)) % HEALTH_TIPS.length;
  return { text: HEALTH_TIPS[dayIndex], href: "/info" };
}
```

- [ ] **Step 2: 타입/린트 확인**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/lib/queries/home.ts` → 오류 없음.
(DB 결합 함수라 단위 테스트는 없음 — 런타임 검증은 Task 4 dev 서버에서.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/home.ts
git commit -m "feat(home): home data query layer (next/popular meetings, infos, posts, health)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 홈 컴포넌트 3종

**Files:**
- Create: `src/components/home/search-entry.tsx`
- Create: `src/components/home/meeting-card.tsx`
- Create: `src/components/home/meeting-hero.tsx`

**Interfaces:**
- Consumes: Task 1 `dDayLabel`/`formatMeetingDateShort`, Task 2 `HomeMeeting`/`PopularMeeting`, Phase 0-1의 `AvatarStack`(`@/components/club/avatar-stack`), `categoryEmoji`(`@/lib/club-emoji`), ui `Badge`/`Button`/`Card`
- Produces (Task 4가 사용): `SearchEntry()` (서버), `MeetingCard({ meeting: PopularMeeting })` (서버), `MeetingHero({ meetings: HomeMeeting[] })` (client — 빈 배열이면 null 반환, CTA는 페이지 책임)

- [ ] **Step 1: SearchEntry 구현**

`src/components/home/search-entry.tsx`:

```tsx
import { Faders, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

// 홈 검색바 — 실제 입력이 아니라 /search 진입점 (시안: 탭 시 검색 화면 이동)
export function SearchEntry() {
  return (
    <Link
      href="/search"
      aria-label="클럽, 모임, 정보 검색"
      className="flex items-center gap-2 rounded-2xl border border-mocha-200 bg-white p-2 pl-4 shadow-soft transition-all hover:border-coral-300"
    >
      <MagnifyingGlass size={24} weight="bold" className="shrink-0 text-mocha-500" />
      <span className="min-w-0 flex-1 truncate text-lg text-mocha-500">
        클럽, 모임, 정보를 검색해보세요
      </span>
      <span className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-cream-100 px-3 text-base font-bold text-mocha-700">
        <Faders size={18} weight="bold" />
        필터
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: MeetingCard 구현**

`src/components/home/meeting-card.tsx`:

```tsx
import { CalendarBlank, MapPin } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AvatarStack } from "@/components/club/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { categoryEmoji } from "@/lib/club-emoji";
import { dDayLabel, formatMeetingDateShort } from "@/lib/format-date";
import type { PopularMeeting } from "@/lib/queries/home";

// 홈 "인기 모임" 가로 스크롤 카드 (시안: D-day 뱃지 + 이미지 + 일시/장소 + 참여 아바타 + 정원)
export function MeetingCard({ meeting }: { meeting: PopularMeeting }) {
  return (
    <Link href={`/club/${meeting.clubId}/meeting/${meeting.id}`} className="block w-[220px] shrink-0">
      <Card className="h-full overflow-hidden transition-all hover:shadow-warm">
        {meeting.coverImage ? (
          // biome-ignore lint/performance/noImgElement: coverImage가 remotePatterns에 보장되지 않는 임의 URL일 수 있음
          <img src={meeting.coverImage} alt="" className="h-24 w-full object-cover" />
        ) : (
          <div className="flex h-24 w-full items-center justify-center bg-cream-100 text-4xl">
            {categoryEmoji(meeting.category)}
          </div>
        )}
        <CardContent className="space-y-1.5 p-4">
          <Badge variant="default">{dDayLabel(meeting.date)}</Badge>
          <h3 className="truncate text-lg font-extrabold text-mocha-900">{meeting.title}</h3>
          <p className="flex items-center gap-1 text-sm font-semibold text-mocha-700">
            <CalendarBlank size={14} weight="duotone" className="shrink-0" />
            {formatMeetingDateShort(meeting.date)}
          </p>
          <p className="flex items-center gap-1 text-sm font-semibold text-mocha-700">
            <MapPin size={14} weight="duotone" className="shrink-0" />
            <span className="truncate">{meeting.location}</span>
          </p>
          <div className="flex items-center justify-between pt-1">
            <AvatarStack
              avatarUrls={meeting.participantAvatars}
              extraCount={Math.max(0, meeting.joinedCount - meeting.participantAvatars.length)}
            />
            <span className="shrink-0 text-sm font-bold text-mocha-700">
              {meeting.joinedCount}/{meeting.maxParticipants}명
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: MeetingHero 구현 (client 캐러셀)**

`src/components/home/meeting-hero.tsx`:

```tsx
"use client";

import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryEmoji } from "@/lib/club-emoji";
import { dDayLabel, formatMeetingDateShort } from "@/lib/format-date";
import type { HomeMeeting } from "@/lib/queries/home";
import { cn } from "@/lib/utils";

// "내 다음 모임" 히어로 캐러셀 (시안: D-day + 일시/장소 + 자세히 보기 + 페이지 인디케이터)
export function MeetingHero({ meetings }: { meetings: HomeMeeting[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (meetings.length === 0) return null;

  function onScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(meetings.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }

  return (
    <section aria-label="내 다음 모임">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl"
      >
        {meetings.map((m) => (
          <article
            key={m.id}
            className="w-full shrink-0 snap-center overflow-hidden rounded-3xl border border-coral-100 bg-gradient-to-br from-cream-50 to-coral-50"
          >
            <div className="flex items-stretch">
              <div className="min-w-0 flex-1 space-y-2 p-5">
                <p className="text-sm font-extrabold text-coral-700">내 다음 모임</p>
                <h2 className="truncate text-xl font-extrabold leading-snug text-mocha-900">
                  {m.title}
                </h2>
                <p className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-mocha-800">
                  <Badge variant="default">{dDayLabel(m.date)}</Badge>
                  <CalendarBlank size={16} weight="duotone" />
                  {formatMeetingDateShort(m.date)}
                </p>
                <p className="flex items-center gap-1 text-base font-semibold text-mocha-700">
                  <MapPin size={16} weight="duotone" className="shrink-0" />
                  <span className="truncate">{m.location}</span>
                </p>
                <div className="pt-1">
                  <Link href={`/club/${m.clubId}/meeting/${m.id}`}>
                    <Button size="sm">모임 자세히 보기</Button>
                  </Link>
                </div>
              </div>
              {m.coverImage ? (
                // biome-ignore lint/performance/noImgElement: coverImage가 remotePatterns에 보장되지 않는 임의 URL일 수 있음
                <img src={m.coverImage} alt="" className="w-2/5 object-cover" />
              ) : (
                <div className="flex w-2/5 items-center justify-center bg-cream-100 text-6xl">
                  {categoryEmoji(m.category)}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {meetings.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {meetings.map((m, i) => (
            <span
              key={m.id}
              className={cn("h-2 w-2 rounded-full", i === index ? "bg-coral-500" : "bg-mocha-200")}
            />
          ))}
          <span className="ml-1 text-xs font-bold text-mocha-500">
            {index + 1}/{meetings.length}
          </span>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: 타입/린트 확인 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/components/home/` → 오류 없음 (biome-ignore 주석이 이미 포함됨).

```bash
git add src/components/home/search-entry.tsx src/components/home/meeting-card.tsx src/components/home/meeting-hero.tsx
git commit -m "feat(home): search entry, meeting hero carousel, popular meeting card

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 홈 페이지 재조립

**Files:**
- Modify: `src/app/(main)/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Tasks 1-3의 모든 export, `BrandMark`(`@/components/brand/BrandMark`), `Avatar`/`AvatarImage`/`AvatarFallback`(ui), 기존 `generateFortune`/`getZodiacEmoji`/`getZodiacFromBirthYear`/`ZODIAC_ANIMALS`(`@/lib/fortune`), `scoreClubs`(`@/lib/recommendation`), 온보딩 위젯 3종
- Produces: 없음 (말단 페이지)

섹션 순서 (스펙 §6): 헤더(로고+아바타, 알림 종은 §10 편차로 미노출) → 검색 진입점 → 프로필 완성 배너 → 내 다음 모임 히어로(없으면 클럽 둘러보기 CTA) → 신규 유저 위젯 → 운세·건강 2열 → 추천 콘텐츠(실데이터) → 인기 모임(모임 단위) → 나를 위한 추천(기존 유지) → 커뮤니티 인기글(실데이터).

- [ ] **Step 1: page.tsx 전체 교체**

`src/app/(main)/page.tsx`:

```tsx
import {
  ArrowRight,
  CaretRight,
  ChatCircleDots,
  Eye,
  Fire,
  Heart,
  Newspaper,
  Sparkle,
  UserCirclePlus,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { MeetingCard } from "@/components/home/meeting-card";
import { MeetingHero } from "@/components/home/meeting-hero";
import { SearchEntry } from "@/components/home/search-entry";
import { KakaoShareButton } from "@/components/onboarding/KakaoShareButton";
import { NotificationOptInCard } from "@/components/onboarding/NotificationOptInCard";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { clubs, hobbies, profiles, userHobbies } from "@/db/schema";
import { categoryEmoji } from "@/lib/club-emoji";
import { kstDateString, relativeTimeLabel } from "@/lib/format-date";
import {
  generateFortune,
  getZodiacEmoji,
  getZodiacFromBirthYear,
  ZODIAC_ANIMALS,
} from "@/lib/fortune";
import {
  getHealthOneLiner,
  getMyNextMeetings,
  getPopularCommunityPosts,
  getPopularUpcomingMeetings,
  getRecommendedInfos,
  INFO_CATEGORY_LABELS,
} from "@/lib/queries/home";
import { scoreClubs } from "@/lib/recommendation";
import { createClient } from "@/lib/supabase/server";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showCarousel = false;
  let showShareButton = false;
  let myRegion: string | null = null;
  let myBirthYear: number | null = null;
  let myNickname: string | null = null;
  let myAvatarUrl: string | null = null;
  let myHobbies: string[] = [];
  if (user) {
    const [me] = await db
      .select({
        createdAt: profiles.createdAt,
        region: profiles.region,
        birthYear: profiles.birthYear,
        nickname: profiles.nickname,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (me?.createdAt) {
      const age = Date.now() - me.createdAt.getTime();
      showCarousel = age < SEVEN_DAYS_MS;
      showShareButton = age < ONE_DAY_MS;
    }
    myRegion = me?.region ?? null;
    myBirthYear = me?.birthYear ?? null;
    myNickname = me?.nickname ?? null;
    myAvatarUrl = me?.avatarUrl ?? null;

    const hobbyRows = await db
      .select({ category: hobbies.category })
      .from(userHobbies)
      .innerJoin(hobbies, eq(userHobbies.hobbyId, hobbies.id))
      .where(eq(userHobbies.userId, user.id));
    myHobbies = hobbyRows.map((h) => h.category);
  }

  const [nextMeetings, popularMeetings, infos, posts, health] = await Promise.all([
    user ? getMyNextMeetings(user.id) : Promise.resolve([]),
    getPopularUpcomingMeetings(),
    getRecommendedInfos(),
    getPopularCommunityPosts(),
    getHealthOneLiner(kstDateString()),
  ]);

  // 개인화 추천 클럽 (기존 로직 유지 — 콘텐츠 기반, 협업 필터는 members 비워 스킵)
  const candidateClubs = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      category: clubs.category,
      region: clubs.region,
      memberCount: clubs.memberCount,
    })
    .from(clubs)
    .orderBy(desc(clubs.memberCount))
    .limit(20);

  let recommendedClubs: {
    id: string;
    name: string;
    category: string;
    reason: string;
    memberCount: number;
  }[] = [];
  if (user) {
    const scored = scoreClubs(
      { id: user.id, region: myRegion ?? "", birthYear: myBirthYear, hobbies: myHobbies },
      candidateClubs.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        region: c.region,
        memberCount: c.memberCount ?? 0,
        members: [],
      }))
    );
    const byId = new Map(candidateClubs.map((c) => [c.id, c]));
    recommendedClubs = scored.slice(0, 3).flatMap((s) => {
      const c = byId.get(s.id);
      if (!c) return [];
      return [
        {
          id: c.id,
          name: c.name,
          category: c.category,
          reason: s.reasons[0] ?? "추천 모임",
          memberCount: c.memberCount ?? 0,
        },
      ];
    });
  }
  if (recommendedClubs.length === 0) {
    recommendedClubs = candidateClubs.slice(0, 3).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      reason: "지금 인기 있는 모임",
      memberCount: c.memberCount ?? 0,
    }));
  }

  const today = kstDateString();
  const zodiac = myBirthYear
    ? getZodiacFromBirthYear(myBirthYear)
    : ZODIAC_ANIMALS[new Date().getDay() % ZODIAC_ANIMALS.length];
  const fortune = generateFortune(today, zodiac);

  return (
    <div className="space-y-7 p-5 pb-6">
      {/* 헤더: 로고 + 프로필 아바타 (시안의 알림 종은 알림 페이지 부재로 미노출 — 스펙 §10) */}
      <header className="flex items-center justify-between pt-3">
        <BrandMark size="sm" />
        <Link href="/mypage" aria-label="내 정보">
          <Avatar className="h-11 w-11 ring-2 ring-coral-100">
            {myAvatarUrl ? <AvatarImage src={myAvatarUrl} alt="" /> : null}
            <AvatarFallback className="text-base">
              {myNickname ? myNickname.slice(0, 1) : "🙂"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </header>

      <SearchEntry />

      {/* 프로필 완성 배너 (기존 유지 — 검색바 아래·히어로 위) */}
      <Link href="/mypage/edit" className="block">
        <Card className="border-coral-200 bg-gradient-to-br from-coral-50 to-cream-100 transition-all hover:shadow-warm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-soft">
              <Sparkle size={28} weight="fill" className="text-coral-500" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-extrabold text-mocha-900 leading-snug">
                프로필을 완성해보세요
              </p>
              <p className="mt-0.5 text-base text-mocha-700">
                나에게 맞는 모임을 더 잘 추천받을 수 있어요
              </p>
            </div>
            <CaretRight size={24} weight="bold" className="text-coral-600 shrink-0" />
          </CardContent>
        </Card>
      </Link>

      {/* 내 다음 모임 히어로 / 없으면 클럽 둘러보기 CTA */}
      {nextMeetings.length > 0 ? (
        <MeetingHero meetings={nextMeetings} />
      ) : (
        <Link href="/club" className="block">
          <Card className="border-coral-100 bg-gradient-to-br from-cream-50 to-coral-50 transition-all hover:shadow-warm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-soft">
                🤝
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-coral-700">내 다음 모임</p>
                <p className="mt-0.5 text-lg font-extrabold text-mocha-900 leading-snug">
                  아직 예정된 모임이 없어요
                </p>
                <p className="mt-0.5 text-base text-mocha-700">
                  관심사에 맞는 클럽에서 첫 모임을 찾아보세요
                </p>
              </div>
              <CaretRight size={24} weight="bold" className="text-coral-600 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* 신규 유저 위젯 (기존 W1 장치 — 히어로 아래 유지) */}
      {showCarousel && <OnboardingCarousel />}
      {showShareButton && <KakaoShareButton />}
      {showCarousel && <NotificationOptInCard />}

      {/* 오늘의 운세 · 건강 한 줄 (2열) */}
      <section aria-label="오늘의 운세와 건강 한 줄" className="grid grid-cols-2 gap-3">
        <Link href="/fortune" className="block">
          <Card className="h-full border-sage-200 bg-gradient-to-br from-sage-50 to-cream-100 transition-all hover:shadow-soft">
            <CardContent className="space-y-1.5 p-4">
              <p className="flex items-center gap-1 text-sm font-extrabold text-coral-700">
                <span aria-hidden="true" className="text-base">
                  {getZodiacEmoji(fortune.zodiac)}
                </span>
                오늘의 운세
              </p>
              <p className="line-clamp-2 text-base font-semibold text-mocha-800">
                {fortune.general}
              </p>
              <p className="text-sm font-bold text-coral-700">자세히 보기 ›</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={health.href} className="block">
          <Card className="h-full border-sage-200 bg-gradient-to-br from-cream-50 to-sage-50 transition-all hover:shadow-soft">
            <CardContent className="space-y-1.5 p-4">
              <p className="flex items-center gap-1 text-sm font-extrabold text-sage-700">
                <span aria-hidden="true" className="text-base">
                  💧
                </span>
                건강 한 줄
              </p>
              <p className="line-clamp-2 text-base font-semibold text-mocha-800">{health.text}</p>
              <p className="text-sm font-bold text-sage-700">자세히 보기 ›</p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* 추천 콘텐츠 (실데이터) */}
      {infos.length > 0 && (
        <Section
          icon={<Newspaper size={26} weight="duotone" className="text-sage-700" />}
          title="추천 콘텐츠"
          href="/info"
        >
          <div className="space-y-3">
            {infos.map((info) => (
              <Link key={info.id} href={`/info/${info.id}`} className="block">
                <Card className="transition-all hover:border-sage-200 hover:shadow-soft">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <Badge variant="secondary" className="mb-1.5">
                        {INFO_CATEGORY_LABELS[info.category]}
                      </Badge>
                      <h3 className="text-lg font-bold text-mocha-900 leading-snug">
                        {info.title}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-base font-semibold text-mocha-700">
                      <span className="inline-flex items-center gap-1">
                        <Eye size={18} weight="duotone" />
                        {info.viewCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart size={18} weight="duotone" className="text-coral-500" />
                        {info.likeCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 인기 모임 (모임 단위, 가로 스크롤) */}
      {popularMeetings.length > 0 && (
        <Section
          icon={<Fire size={26} weight="duotone" className="text-[var(--color-danger)]" />}
          title="인기 모임"
          href="/club"
          hint="옆으로 넘겨보세요"
        >
          <div className="-mx-5 overflow-x-auto pb-2">
            <div className="flex gap-3 px-5">
              {popularMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* 나를 위한 추천 (기존 유지 — 인기 모임 아래) */}
      {recommendedClubs.length > 0 && (
        <Section
          icon={<UserCirclePlus size={26} weight="duotone" className="text-coral-600" />}
          title="나를 위한 추천"
          href="/club"
        >
          <div className="space-y-3">
            {recommendedClubs.map((rec) => (
              <Link key={rec.id} href={`/club/${rec.id}`} className="block">
                <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-50 text-3xl">
                      {categoryEmoji(rec.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-extrabold text-mocha-900">{rec.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="default">{rec.category}</Badge>
                        <span className="text-sm font-semibold text-coral-700">{rec.reason}</span>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-base font-semibold text-mocha-700">
                      <UsersThree size={18} weight="duotone" />
                      {rec.memberCount}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 커뮤니티 인기글 (실데이터) */}
      {posts.length > 0 && (
        <Section
          icon={<ChatCircleDots size={26} weight="duotone" className="text-coral-600" />}
          title="커뮤니티 인기글"
          href="/community"
        >
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/community/${post.id}`} className="block">
                <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-bold text-mocha-900 leading-snug">{post.title}</h3>
                    <div className="mt-3 flex items-center justify-between text-base">
                      <span className="font-semibold text-mocha-700">
                        {post.nickname} · {relativeTimeLabel(post.createdAt)}
                      </span>
                      <div className="flex items-center gap-4 text-mocha-700">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Heart size={18} weight="duotone" className="text-coral-500" />
                          {post.likeCount}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <ChatCircleDots size={18} weight="duotone" className="text-sage-600" />
                          {post.commentCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  href,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-mocha-900 tracking-tight">
          <span className="self-center">{icon}</span>
          {title}
        </h2>
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-base font-bold text-coral-700 hover:text-coral-800"
        >
          더보기
          <ArrowRight size={18} weight="bold" />
        </Link>
      </div>
      {hint && <p className="text-sm text-mocha-500">{hint}</p>}
      {children}
    </section>
  );
}
```

주의: 기존 mock 상수(`recommendedInfos`, `popularPosts`)와 `getToday()`, `Hand`/`MagnifyingGlass` import, `fortuneScoreStars`, `popularClubs`는 이 교체로 전부 제거된다. 운세는 KST 날짜 + (birthYear 있으면) 사용자 띠로 개인화 — birthYear 없으면 기존 요일 로테이션 유지.

- [ ] **Step 2: 타입/린트/잔존 참조 확인**

Run: `bunx tsc --noEmit` → 출력 없음.
Run: `grep -n "recommendedInfos\|popularPosts\|getToday" "src/app/(main)/page.tsx"` → 결과 없음.
Run: `bunx biome check "src/app/(main)/page.tsx"` → 오류 없음.

- [ ] **Step 3: 런타임 검증 (dev 서버, 비로그인 한계 내)**

`bun run dev` 실행 후:
1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `307` (인증 리다이렉트 = 라우팅 정상)
2. 서버 로그에 컴파일 오류 없는지 확인
3. 로그인 세션이 없으므로 실제 렌더는 검증 불가 — 리포트에 "사용자 수동 패스 필요 항목"으로 명시: 히어로 캐러셀 스와이프/인디케이터, 모임 없는 계정의 CTA 카드, 운세·건강 2열, 인기 모임 가로 스크롤, 커뮤니티 상대시간 표기
4. dev 서버 종료

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/page.tsx"
git commit -m "feat(home): rebuild home per mockup (hero, search entry, real data sections)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 최종 통합 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 정적 검증**

```bash
bunx tsc --noEmit
bun test src/lib
bunx biome check src/lib/format-date.ts src/lib/format-date.test.ts src/lib/queries/home.ts src/components/home/ "src/app/(main)/page.tsx"
```

Expected: tsc 출력 없음, bun test 26 pass (기존 16 + 신규 10), biome 오류 없음.

- [ ] **Step 2: 회귀 확인**

1. `bun run dev` 후 `curl -s "http://localhost:3000/api/clubs?sort=popular" | head -c 200` → `{"success":true,...}` (Phase 1 API 무손상)
2. `/club`, `/info`, `/community` 각각 curl로 307 또는 200 응답 확인 (라우팅 회귀 없음)
3. dev 서버 종료

- [ ] **Step 3: 결과 보고**

검증 결과와 "사용자 수동 패스 필요 항목" 목록을 컨트롤러에 보고. 발견된 문제는 수정 후 재검증.

---

## 셀프 리뷰 노트 (플랜 작성 시 확인 완료)

- 스펙 §6 커버: 헤더(로고+아바타)=Task 4, 검색바=Task 3/4(SearchEntry), 히어로+CTA=Task 3/4, 운세·건강 2열=Task 4(운세 기존 로직 재사용+KST 보정, 건강=Task 2 getHealthOneLiner), 신규유저 위젯 유지=Task 4, 추천 콘텐츠 실데이터=Task 2/4, 인기 모임(모임 단위)=Task 2/3/4, 커뮤니티 실데이터=Task 2/4, 배너·나를위한추천 배치=Task 4. 알림 종 미노출=스펙 §10 편차 준수.
- 타입 일관성: `HomeMeeting`/`PopularMeeting`(Task 2) → `MeetingHero`/`MeetingCard`(Task 3) → page(Task 4); `dDayLabel`/`formatMeetingDateShort`/`relativeTimeLabel`/`kstDateString`(Task 1) 시그니처가 Task 3/4 사용부와 일치.
- Phase 0-1 교훈 반영: `sql.join` 배열 바인딩, `bunx tsc`, biome-ignore(noImgElement) 사유 주석을 컴포넌트 코드에 선포함, 홈 인증 게이트 검증 한계 명시.
- 2026-05-25가 월요일임을 검증하고 테스트 기대값에 반영 (`5/25(월) 09:30`).
