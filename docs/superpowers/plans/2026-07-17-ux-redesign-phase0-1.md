# UX 리디자인 Phase 0-1 (공통 기반 + 클럽 목록/필터) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** captures 시안(club-all.png/club-list.png)대로 클럽 목록·필터를 재구성하고, 이후 Phase가 쓸 DB/스토리지/공통 컴포넌트 기반을 깐다.

**Architecture:** 필터 상태는 URL searchParams가 단일 소스 — 클라이언트는 `router.push`로 URL만 바꾸고 서버 컴포넌트가 Drizzle로 재조회한다. 필터 파싱/직렬화는 `src/lib/club-filters.ts` 순수 함수로 분리해 bun test로 검증하고, 쿼리는 `src/lib/queries/clubs.ts`의 `queryClubs()` 하나를 페이지와 `GET /api/clubs`가 공유한다.

**Tech Stack:** Next.js 16 App Router (React 19), Drizzle ORM + postgres-js, Supabase (Auth/Storage), Tailwind v4 + CVA, Zod v4, bun test, Biome.

**Spec:** `docs/superpowers/specs/2026-07-17-ux-redesign-captures-design.md`

## Global Constraints

- 모든 DB 객체는 `si_mvp` 스키마 + `h_` 접두사. DDL은 스키마 한정(`si_mvp.h_clubs`)으로 작성 (search_path 의존 금지).
- 마이그레이션은 `supabase/migrations/*.sql`이 source of truth. **drizzle-kit generate/migrate 절대 금지.** Drizzle 스키마 파일은 SQL에 맞춰 수동 동기화만.
- 마이그레이션 적용은 `bun run db:setup` (= `bunx supabase db push`). CLI가 프로젝트에 링크 안 되어 있으면 중단하고 사용자에게 확인.
- 사용자 노출 문자열은 전부 한국어. 색상은 브랜드 토큰(coral/cream/mocha/sage)만 사용, `orange-*` 금지.
- Biome: 2-space, double quotes, trailing commas ES5, 100자. **`bun run format`(전체 포맷) 금지** — autocrlf 유령 churn 발생. 변경 파일만 `bunx biome check --write <파일>`.
- `bun run lint`는 기존 실패 1건(s/meeting 관련)이 있음 — 새로 만진 파일에 새 오류가 없는지만 확인.
- TS 변경 후 매 태스크 `npx tsc --noEmit` (출력 없음 = 통과).
- API 응답은 `@/lib/api-response` 헬퍼(`successResponse`/`unauthorizedError`/`validationError`/`serverError`)만 사용. `@/lib/api-utils`의 `jsonResponse`는 쓰지 않는다.
- Next 16: 서버 컴포넌트의 `searchParams`는 `Promise` — 반드시 `await`.
- 커밋 메시지는 repo 관례(`feat(club): ...`, `fix: ...`) + 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 작업 브랜치: `feature/ux-redesign` (이미 존재, 스펙 커밋됨). 태스크마다 커밋.

---

### Task 1: Foundation 마이그레이션 + Drizzle 스키마 동기화

**Files:**
- Create: `supabase/migrations/20260717090000_ux_redesign_foundation.sql`
- Modify: `src/db/schema/clubs.ts` (clubs 테이블에 컬럼/enum 추가)
- Modify: `src/db/schema/users.ts` (profiles 컬럼 + 신규 테이블 2개)

**Interfaces:**
- Consumes: 기존 `si_mvp.h_clubs`, `si_mvp.h_profiles` 테이블
- Produces: Drizzle 스키마 변수 `clubs.sido/sigungu/lat/lng/activityDays/meetingType/ageRange`, `profiles.name/phone`, `userConsents`, `authAttempts` (barrel `@/db/schema` 경유로 자동 export — `index.ts`는 `export *`라 수정 불필요), 스토리지 버킷 `h-avatars`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/20260717090000_ux_redesign_foundation.sql` 생성:

```sql
-- UX redesign foundation (Phase 0).
-- Adds club filter columns (sido/sigungu, coords, activity days, meeting type, age range),
-- profile identity columns (name, phone) for find-id, consent + auth-attempt tables,
-- and the h-avatars storage bucket with owner-scoped write policies.
--
-- Schema-qualified DDL (si_mvp.*) — no search_path dependency.
-- Re-running ALTER TABLE ADD COLUMN without IF NOT EXISTS will error on second apply;
-- this is intentional to surface unexpected re-apply (repo convention).

-- 1) club filter enums
CREATE TYPE si_mvp.h_meeting_type AS ENUM ('regular', 'flash', 'social', 'study');
CREATE TYPE si_mvp.h_age_range AS ENUM ('all', '50s', '60s', '70plus');

-- 2) h_clubs filter columns (lat/lng는 반경 필터 후속 대비 선반영 — v1 미사용)
ALTER TABLE si_mvp.h_clubs ADD COLUMN sido text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN sigungu text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN lat text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN lng text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN activity_days text[] NOT NULL DEFAULT '{}';
ALTER TABLE si_mvp.h_clubs ADD COLUMN meeting_type si_mvp.h_meeting_type;
ALTER TABLE si_mvp.h_clubs ADD COLUMN age_range si_mvp.h_age_range NOT NULL DEFAULT 'all';
CREATE INDEX h_idx_clubs_sido_sigungu ON si_mvp.h_clubs (sido, sigungu);
-- (category 인덱스는 20260523084811 원본 스키마에 이미 존재 — h_idx_clubs_category)

-- 3) 기존 region 값이 시/도 단독 표기인 클럽은 sido 백필
UPDATE si_mvp.h_clubs
SET sido = region
WHERE region IN ('서울','경기','인천','부산','대구','대전','광주','울산','세종',
                 '강원','충북','충남','전북','전남','경북','경남','제주');

-- 4) h_profiles identity columns (아이디 찾기용 — Phase 3에서 수집 시작)
ALTER TABLE si_mvp.h_profiles ADD COLUMN name text;
ALTER TABLE si_mvp.h_profiles ADD COLUMN phone text;
CREATE INDEX h_idx_profiles_phone ON si_mvp.h_profiles (phone);

-- 5) 약관 동의 이력 (Phase 3 회원가입에서 기록)
CREATE TABLE si_mvp.h_user_consents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES si_mvp.h_profiles(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  version text NOT NULL,
  agreed_at timestamptz DEFAULT now()
);
CREATE INDEX h_idx_user_consents_user ON si_mvp.h_user_consents (user_id);
ALTER TABLE si_mvp.h_user_consents ENABLE ROW LEVEL SECURITY;

-- 6) 인증 시도 로그 (find-id rate limit용, Phase 3에서 사용)
CREATE TABLE si_mvp.h_auth_attempts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX h_idx_auth_attempts_ip_action ON si_mvp.h_auth_attempts (ip, action, created_at);
ALTER TABLE si_mvp.h_auth_attempts ENABLE ROW LEVEL SECURITY;

-- 7) 프로필 사진용 스토리지 버킷 (Phase 4에서 사용, 공유 Supabase라 h- 접두사)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('h-avatars', 'h-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY h_avatars_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'h-avatars');
CREATE POLICY h_avatars_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'h-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY h_avatars_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'h-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY h_avatars_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'h-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Drizzle 스키마 동기화 — clubs.ts**

`src/db/schema/clubs.ts`에서 enum 2개를 추가하고 `clubs` 테이블 정의를 교체한다.

기존 enum 선언부(`joinTypeEnum` 위 또는 아래)에 추가:

```ts
export const meetingTypeEnum = pgEnum("h_meeting_type", ["regular", "flash", "social", "study"]);
export const ageRangeEnum = pgEnum("h_age_range", ["all", "50s", "60s", "70plus"]);
```

기존 `export const clubs = pgTable("h_clubs", {...});` 블록을 다음으로 교체:

```ts
export const clubs = pgTable("h_clubs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // hobby category
  region: text("region").notNull(), // legacy 표기 ("{sido} {sigungu}"로 동기 기록)
  sido: text("sido"),
  sigungu: text("sigungu"),
  lat: text("lat"), // 반경 필터 후속 대비 — v1 미사용
  lng: text("lng"),
  activityDays: text("activity_days").array().notNull().default(sql`'{}'::text[]`),
  meetingType: meetingTypeEnum("meeting_type"),
  ageRange: ageRangeEnum("age_range").notNull().default("all"),
  description: text("description").notNull(),
  ownerId: text("owner_id").references(() => profiles.id),
  coverImage: text("cover_image"),
  joinType: joinTypeEnum("join_type").default("open"),
  memberCount: integer("member_count").default(0),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

파일 상단 import에 `sql` 추가: `import { sql } from "drizzle-orm";`

- [ ] **Step 3: Drizzle 스키마 동기화 — users.ts**

`src/db/schema/users.ts`의 `profiles` 테이블 컬럼 정의에 (nickname 아래) 2줄 추가:

```ts
    name: text("name"),
    phone: text("phone"),
```

그리고 파일 끝(`pushSubscriptions` 아래)에 신규 테이블 2개 추가:

```ts
export const userConsents = pgTable(
  "h_user_consents",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    consentType: text("consent_type").notNull(),
    version: text("version").notNull(),
    agreedAt: timestamp("agreed_at").defaultNow(),
  },
  (t) => [index("h_idx_user_consents_user").on(t.userId)]
);

export const authAttempts = pgTable(
  "h_auth_attempts",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    ip: text("ip").notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("h_idx_auth_attempts_ip_action").on(t.ip, t.action, t.createdAt)]
);
```

(`sql`, `index`는 이 파일에 이미 import되어 있음 — 확인 후 없으면 추가.)

- [ ] **Step 4: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 출력 없음 (통과)

- [ ] **Step 5: 마이그레이션 적용**

Run: `bun run db:setup`
Expected: `20260717090000_ux_redesign_foundation.sql` 적용 로그. 실패(CLI 미링크, 권한 등) 시 **중단하고 사용자에게 보고**.

적용 후 확인 (Supabase SQL editor 또는 psql):

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'si_mvp' AND table_name = 'h_clubs'
  AND column_name IN ('sido','sigungu','activity_days','meeting_type','age_range');
-- 5행 반환 기대
SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'si_mvp' AND c.relname = 'h_profiles';
-- h_profiles의 RLS 상태 확인: phone 컬럼이 anon에 노출되지 않는지 점검.
-- relrowsecurity = false이고 anon SELECT가 열려 있으면 중단하고 사용자에게 보고.
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260717090000_ux_redesign_foundation.sql src/db/schema/clubs.ts src/db/schema/users.ts
git commit -m "feat(db): ux redesign foundation migration (club filters, identity, consents, avatars bucket)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 행정구역 정적 데이터

**Files:**
- Create: `src/lib/regions.ts`
- Test: `src/lib/regions.test.ts`

**Interfaces:**
- Produces: `REGIONS: Record<string, readonly string[]>` (시/도 → 시/군/구 배열, 세종은 빈 배열), `SIDO_LIST: readonly string[]` (17개, REGIONS 키 순서)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/regions.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun test src/lib/regions.test.ts`
Expected: FAIL — `Cannot find module './regions'`

- [ ] **Step 3: 구현**

`src/lib/regions.ts` (2026년 기준 행정구역 — 군위군은 대구):

```ts
// 대한민국 행정구역 (시/도 → 시/군/구). 클럽 필터·클럽 생성 폼·온보딩 지역 선택 공용.
// 시/도는 기존 h_clubs.region 데이터와 동일한 축약 표기를 쓴다 (예: "서울", "전북").
export const REGIONS: Record<string, readonly string[]> = {
  서울: [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
    "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
    "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
  ],
  경기: [
    "가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시",
    "남양주시", "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시",
    "안양시", "양주시", "양평군", "여주시", "연천군", "오산시", "용인시", "의왕시",
    "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시", "화성시",
  ],
  인천: [
    "강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구",
    "옹진군", "중구",
  ],
  부산: [
    "강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구",
    "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구",
  ],
  대구: ["군위군", "남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  대전: ["대덕구", "동구", "서구", "유성구", "중구"],
  광주: ["광산구", "남구", "동구", "북구", "서구"],
  울산: ["남구", "동구", "북구", "울주군", "중구"],
  세종: [],
  강원: [
    "강릉시", "고성군", "동해시", "삼척시", "속초시", "양구군", "양양군", "영월군",
    "원주시", "인제군", "정선군", "철원군", "춘천시", "태백시", "평창군", "홍천군",
    "화천군", "횡성군",
  ],
  충북: [
    "괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군",
    "진천군", "청주시", "충주시",
  ],
  충남: [
    "계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시",
    "서천군", "아산시", "예산군", "천안시", "청양군", "태안군", "홍성군",
  ],
  전북: [
    "고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군",
    "익산시", "임실군", "장수군", "전주시", "정읍시", "진안군",
  ],
  전남: [
    "강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시",
    "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군",
    "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군",
  ],
  경북: [
    "경산시", "경주시", "고령군", "구미시", "김천시", "문경시", "봉화군", "상주시",
    "성주군", "안동시", "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군",
    "울진군", "의성군", "청도군", "청송군", "칠곡군", "포항시",
  ],
  경남: [
    "거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청군",
    "양산시", "의령군", "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군",
    "함양군", "합천군",
  ],
  제주: ["서귀포시", "제주시"],
};

export const SIDO_LIST: readonly string[] = Object.keys(REGIONS);
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/regions.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/regions.ts src/lib/regions.test.ts
git commit -m "feat(club): add korea administrative regions dataset

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 필터 정의·파싱·직렬화 라이브러리 (TDD)

**Files:**
- Create: `src/lib/club-filters.ts`
- Test: `src/lib/club-filters.test.ts`

**Interfaces:**
- Produces (이후 모든 태스크가 사용):
  - `CLUB_CATEGORIES: readonly string[]` (12종), `ETC_CATEGORY = "기타"`
  - `DAY_OPTIONS / MEETING_TYPE_OPTIONS / AGE_RANGE_OPTIONS / MEMBER_RANGE_OPTIONS: readonly { value; label }[]`
  - `CLUB_TABS = ["all","nearby","hobby","popular","mine"] as const`, `type ClubTab`
  - `type ClubFilters` — `{ q?, sido?, sigungu?, categories?, days?, meetingType?, ageRange?, members?, sort, scope }`
  - `parseClubFilters(params: URLSearchParams | Record<string, string | string[] | undefined>): ClubFilters`
  - `serializeClubFilters(filters: ClubFilters, extra?: Record<string, string>): string`
  - `countActiveFilters(filters: ClubFilters): number` (q/sort/scope 제외 그룹 수)
  - `filterChips(filters: ClubFilters): { key: string; label: string; removed: ClubFilters }[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/club-filters.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  countActiveFilters,
  filterChips,
  parseClubFilters,
  serializeClubFilters,
} from "./club-filters";

describe("parseClubFilters", () => {
  test("빈 파라미터는 기본값", () => {
    expect(parseClubFilters(new URLSearchParams())).toEqual({ sort: "recent", scope: "all" });
  });

  test("csv 파라미터 분해", () => {
    const f = parseClubFilters(new URLSearchParams("categories=등산,골프&days=fri,sat"));
    expect(f.categories).toEqual(["등산", "골프"]);
    expect(f.days).toEqual(["fri", "sat"]);
  });

  test("Next searchParams 객체 입력 지원", () => {
    const f = parseClubFilters({ sido: "서울", sigungu: "강남구", sort: "popular" });
    expect(f.sido).toBe("서울");
    expect(f.sigungu).toBe("강남구");
    expect(f.sort).toBe("popular");
  });

  test("잘못된 enum 값은 전체 기본값으로 폴백", () => {
    expect(parseClubFilters(new URLSearchParams("days=xyz"))).toEqual({
      sort: "recent",
      scope: "all",
    });
  });
});

describe("serializeClubFilters", () => {
  test("기본값은 생략", () => {
    expect(serializeClubFilters({ sort: "recent", scope: "all" })).toBe("");
  });

  test("파싱-직렬화 roundtrip", () => {
    const f = parseClubFilters(
      new URLSearchParams("sido=서울&categories=등산&members=6to15&sort=popular")
    );
    expect(parseClubFilters(new URLSearchParams(serializeClubFilters(f)))).toEqual(f);
  });

  test("extra 파라미터 병합", () => {
    expect(serializeClubFilters({ sort: "recent", scope: "all" }, { tab: "nearby" })).toBe(
      "tab=nearby"
    );
  });
});

describe("countActiveFilters / filterChips", () => {
  const f = parseClubFilters(
    new URLSearchParams("sido=서울&sigungu=강남구&categories=등산,골프,독서&days=fri,sat&ageRange=60s")
  );

  test("그룹 단위 카운트 (지역은 1개 그룹)", () => {
    expect(countActiveFilters(f)).toBe(4);
  });

  test("칩 라벨", () => {
    expect(filterChips(f).map((c) => c.label)).toEqual(["서울 강남구", "등산 외 2", "금·토", "60대"]);
  });

  test("칩 제거는 해당 그룹만 지운다", () => {
    const region = filterChips(f).find((c) => c.key === "region");
    expect(region?.removed.sido).toBeUndefined();
    expect(region?.removed.sigungu).toBeUndefined();
    expect(region?.removed.categories).toEqual(["등산", "골프", "독서"]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun test src/lib/club-filters.test.ts`
Expected: FAIL — `Cannot find module './club-filters'`

- [ ] **Step 3: 구현**

`src/lib/club-filters.ts`:

```ts
import { z } from "zod";

// 클럽 카테고리 프리셋 — club/create 폼과 필터 칩 공용 (h_clubs.category 값과 일치)
export const CLUB_CATEGORIES = [
  "등산", "골프", "독서", "요리", "사진", "여행", "음악", "댄스", "낚시", "바둑", "원예", "수영",
] as const;
export const ETC_CATEGORY = "기타";

export const CLUB_TABS = ["all", "nearby", "hobby", "popular", "mine"] as const;
export type ClubTab = (typeof CLUB_TABS)[number];

export const DAY_OPTIONS = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
] as const;

export const MEETING_TYPE_OPTIONS = [
  { value: "regular", label: "정기 모임" },
  { value: "flash", label: "번개 모임" },
  { value: "social", label: "친목 위주" },
  { value: "study", label: "스터디/학습" },
] as const;

export const AGE_RANGE_OPTIONS = [
  { value: "50s", label: "50대" },
  { value: "60s", label: "60대" },
  { value: "70plus", label: "70대 이상" },
] as const;

export const MEMBER_RANGE_OPTIONS = [
  { value: "lte5", label: "5명 이하" },
  { value: "6to15", label: "6~15명" },
  { value: "16to30", label: "16~30명" },
  { value: "gte30", label: "30명+" },
] as const;

const dayValues = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const clubFilterSchema = z.object({
  q: z.string().trim().min(1).max(50).optional(),
  sido: z.string().trim().min(1).max(10).optional(),
  sigungu: z.string().trim().min(1).max(20).optional(),
  categories: z.array(z.string().trim().min(1).max(20)).min(1).max(13).optional(),
  days: z.array(z.enum(dayValues)).min(1).max(7).optional(),
  meetingType: z.enum(["regular", "flash", "social", "study"]).optional(),
  ageRange: z.enum(["50s", "60s", "70plus"]).optional(),
  members: z.enum(["lte5", "6to15", "16to30", "gte30"]).optional(),
  sort: z.enum(["recent", "popular"]).default("recent"),
  scope: z.enum(["all", "mine"]).default("all"),
});

export type ClubFilters = z.infer<typeof clubFilterSchema>;

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function firstValue(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function csv(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

const DEFAULT_FILTERS: ClubFilters = { sort: "recent", scope: "all" };

export function parseClubFilters(params: RawParams): ClubFilters {
  const parsed = clubFilterSchema.safeParse({
    q: firstValue(params, "q") || undefined,
    sido: firstValue(params, "sido") || undefined,
    sigungu: firstValue(params, "sigungu") || undefined,
    categories: csv(firstValue(params, "categories")),
    days: csv(firstValue(params, "days")),
    meetingType: firstValue(params, "meetingType") || undefined,
    ageRange: firstValue(params, "ageRange") || undefined,
    members: firstValue(params, "members") || undefined,
    sort: firstValue(params, "sort") || undefined,
    scope: firstValue(params, "scope") || undefined,
  });
  return parsed.success ? parsed.data : { ...DEFAULT_FILTERS };
}

export function serializeClubFilters(
  filters: ClubFilters,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.sido) params.set("sido", filters.sido);
  if (filters.sigungu) params.set("sigungu", filters.sigungu);
  if (filters.categories?.length) params.set("categories", filters.categories.join(","));
  if (filters.days?.length) params.set("days", filters.days.join(","));
  if (filters.meetingType) params.set("meetingType", filters.meetingType);
  if (filters.ageRange) params.set("ageRange", filters.ageRange);
  if (filters.members) params.set("members", filters.members);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
  return params.toString();
}

export function countActiveFilters(filters: ClubFilters): number {
  let count = 0;
  if (filters.sido || filters.sigungu) count++;
  if (filters.categories?.length) count++;
  if (filters.days?.length) count++;
  if (filters.meetingType) count++;
  if (filters.ageRange) count++;
  if (filters.members) count++;
  return count;
}

export type FilterChip = { key: string; label: string; removed: ClubFilters };

function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function filterChips(filters: ClubFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.sido || filters.sigungu) {
    chips.push({
      key: "region",
      label: [filters.sido, filters.sigungu].filter(Boolean).join(" "),
      removed: { ...filters, sido: undefined, sigungu: undefined },
    });
  }
  if (filters.categories?.length) {
    const [first, ...rest] = filters.categories;
    chips.push({
      key: "categories",
      label: rest.length > 0 ? `${first} 외 ${rest.length}` : first,
      removed: { ...filters, categories: undefined },
    });
  }
  if (filters.days?.length) {
    chips.push({
      key: "days",
      label: filters.days.map((d) => labelFor(DAY_OPTIONS, d)).join("·"),
      removed: { ...filters, days: undefined },
    });
  }
  if (filters.meetingType) {
    chips.push({
      key: "meetingType",
      label: labelFor(MEETING_TYPE_OPTIONS, filters.meetingType),
      removed: { ...filters, meetingType: undefined },
    });
  }
  if (filters.ageRange) {
    chips.push({
      key: "ageRange",
      label: labelFor(AGE_RANGE_OPTIONS, filters.ageRange),
      removed: { ...filters, ageRange: undefined },
    });
  }
  if (filters.members) {
    chips.push({
      key: "members",
      label: labelFor(MEMBER_RANGE_OPTIONS, filters.members),
      removed: { ...filters, members: undefined },
    });
  }
  return chips;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/club-filters.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: 타입/린트 확인 후 Commit**

Run: `npx tsc --noEmit` → 출력 없음. `bunx biome check src/lib/club-filters.ts src/lib/club-filters.test.ts` → 오류 없음.

```bash
git add src/lib/club-filters.ts src/lib/club-filters.test.ts
git commit -m "feat(club): filter schema, url parse/serialize, chip helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: queryClubs 공용 쿼리 + GET /api/clubs 실구현

**Files:**
- Create: `src/lib/queries/clubs.ts`
- Modify: `src/app/api/clubs/route.ts` (GET 전체 교체 — 기존 TODO 스텁 제거)

**Interfaces:**
- Consumes: Task 1의 `clubs` 신규 컬럼, Task 3의 `ClubFilters`/`parseClubFilters`, `CLUB_CATEGORIES`/`ETC_CATEGORY`
- Produces:
  - `type ClubListEntry = { id: string; name: string; category: string; region: string; sido: string | null; sigungu: string | null; description: string; memberCount: number; coverImage: string | null; memberAvatars: (string | null)[]; extraMemberCount: number }`
  - `queryClubs(filters: ClubFilters, userId?: string): Promise<ClubListEntry[]>`
  - `GET /api/clubs` → `{ success: true, data: { clubs: ClubListEntry[] } }`

- [ ] **Step 1: queryClubs 구현**

`src/lib/queries/clubs.ts`:

```ts
import "server-only";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import { CLUB_CATEGORIES, type ClubFilters, ETC_CATEGORY } from "@/lib/club-filters";

export type ClubListEntry = {
  id: string;
  name: string;
  category: string;
  region: string;
  sido: string | null;
  sigungu: string | null;
  description: string;
  memberCount: number;
  coverImage: string | null;
  memberAvatars: (string | null)[];
  extraMemberCount: number;
};

const LIST_LIMIT = 100;
const AVATAR_LIMIT = 3;

export async function queryClubs(filters: ClubFilters, userId?: string): Promise<ClubListEntry[]> {
  if (filters.scope === "mine" && !userId) return [];

  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const cond = or(
      ilike(clubs.name, like),
      ilike(clubs.description, like),
      ilike(clubs.category, like)
    );
    if (cond) conditions.push(cond);
  }
  if (filters.sido) conditions.push(eq(clubs.sido, filters.sido));
  if (filters.sigungu) conditions.push(eq(clubs.sigungu, filters.sigungu));

  if (filters.categories?.length) {
    const named = filters.categories.filter((c) => c !== ETC_CATEGORY);
    const parts: SQL[] = [];
    if (named.length > 0) parts.push(inArray(clubs.category, named));
    if (filters.categories.includes(ETC_CATEGORY)) {
      parts.push(notInArray(clubs.category, [...CLUB_CATEGORIES]));
    }
    const cond = parts.length === 1 ? parts[0] : or(...parts);
    if (cond) conditions.push(cond);
  }

  if (filters.days?.length) conditions.push(arrayOverlaps(clubs.activityDays, [...filters.days]));
  if (filters.meetingType) conditions.push(eq(clubs.meetingType, filters.meetingType));
  if (filters.ageRange) conditions.push(inArray(clubs.ageRange, [filters.ageRange, "all"]));

  if (filters.members === "lte5") conditions.push(lte(clubs.memberCount, 5));
  if (filters.members === "6to15") {
    conditions.push(gte(clubs.memberCount, 6), lte(clubs.memberCount, 15));
  }
  if (filters.members === "16to30") {
    conditions.push(gte(clubs.memberCount, 16), lte(clubs.memberCount, 30));
  }
  if (filters.members === "gte30") conditions.push(gte(clubs.memberCount, 30));

  let query = db
    .select({
      id: clubs.id,
      name: clubs.name,
      category: clubs.category,
      region: clubs.region,
      sido: clubs.sido,
      sigungu: clubs.sigungu,
      description: clubs.description,
      memberCount: clubs.memberCount,
      coverImage: clubs.coverImage,
    })
    .from(clubs)
    .$dynamic();

  if (filters.scope === "mine" && userId) {
    query = query.innerJoin(
      clubMembers,
      and(
        eq(clubMembers.clubId, clubs.id),
        eq(clubMembers.userId, userId),
        eq(clubMembers.status, "active")
      )
    );
  }

  const rows = await query
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(filters.sort === "popular" ? desc(clubs.memberCount) : desc(clubs.createdAt))
    .limit(LIST_LIMIT);

  // 클럽별 최근 활성 멤버 아바타 3명 (윈도우 함수로 한 번에)
  const avatarsByClub = new Map<string, (string | null)[]>();
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    const result = await db.execute(sql`
      select club_id, avatar_url
      from (
        select cm.club_id, p.avatar_url,
               row_number() over (partition by cm.club_id order by cm.joined_at desc) as rn
        from si_mvp.h_club_members cm
        join si_mvp.h_profiles p on p.id = cm.user_id
        where cm.status = 'active'
          and cm.club_id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
      ) ranked
      where rn <= ${AVATAR_LIMIT}
    `);
    for (const row of result as unknown as { club_id: string; avatar_url: string | null }[]) {
      const list = avatarsByClub.get(row.club_id) ?? [];
      list.push(row.avatar_url);
      avatarsByClub.set(row.club_id, list);
    }
  }

  return rows.map((row) => {
    const memberAvatars = avatarsByClub.get(row.id) ?? [];
    const memberCount = row.memberCount ?? 0;
    return {
      ...row,
      memberCount,
      memberAvatars,
      extraMemberCount: Math.max(0, memberCount - memberAvatars.length),
    };
  });
}
```

- [ ] **Step 2: GET /api/clubs 교체**

`src/app/api/clubs/route.ts`에서 상단 import 블록과 `GET` 함수를 교체한다. `jsonResponse` import를 제거하고 다음으로:

```ts
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
import { parseClubFilters } from "@/lib/club-filters";
import { queryClubs } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";

// GET /api/clubs - 클럽 목록 (검색/필터/정렬, /club 페이지와 동일한 queryClubs 사용)
export async function GET(request: NextRequest) {
  const filters = parseClubFilters(request.nextUrl.searchParams);
  try {
    let userId: string | undefined;
    if (filters.scope === "mine") {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return unauthorizedError();
      userId = user.id;
    }
    const result = await queryClubs(filters, userId);
    return successResponse({ clubs: result });
  } catch (err) {
    console.error("[clubs GET]", err);
    return serverError();
  }
}
```

(POST와 `CreateClubSchema`는 이 태스크에서 건드리지 않는다 — Task 8에서 확장.)

- [ ] **Step 3: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 출력 없음

- [ ] **Step 4: 동작 확인 (dev 서버)**

Run: `bun run dev` 실행 후 별도 셸에서:

```bash
curl -s "http://localhost:3000/api/clubs?sort=popular" | head -c 400
```

Expected: `{"success":true,"data":{"clubs":[{"id":...,"memberAvatars":[...],"extraMemberCount":...}]}}` 형태. 필터 파라미터(`?categories=등산`, `?members=lte5`)로도 재확인 — 결과가 조건에 맞게 줄어드는지.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/clubs.ts src/app/api/clubs/route.ts
git commit -m "feat(club): shared queryClubs with server-side filters, wire GET /api/clubs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: AvatarStack / ClubCard / SearchBar 공통 컴포넌트

**Files:**
- Create: `src/components/club/avatar-stack.tsx`
- Create: `src/components/club/club-card.tsx`
- Create: `src/components/club/search-bar.tsx`

**Interfaces:**
- Consumes: `@/components/ui/{avatar,badge,card,button,input}`, `categoryEmoji`(`@/lib/club-emoji`)
- Produces:
  - `AvatarStack({ avatarUrls: (string | null)[]; extraCount?: number; className?: string })`
  - `ClubCard({ club: ClubCardData })`, `type ClubCardData` (아래 정의 — `ClubListEntry`가 그대로 대입 가능)
  - `SearchBar({ initialValue?, placeholder, filterCount?, onSearch, onFilterOpen? })` (client)

- [ ] **Step 1: AvatarStack 구현**

`src/components/club/avatar-stack.tsx`:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AvatarStack({
  avatarUrls,
  extraCount = 0,
  className,
}: {
  avatarUrls: (string | null)[];
  extraCount?: number;
  className?: string;
}) {
  if (avatarUrls.length === 0 && extraCount === 0) return null;
  return (
    <div className={cn("flex items-center", className)}>
      {avatarUrls.slice(0, 3).map((url, i) => (
        <Avatar
          key={`${i}-${url ?? "none"}`}
          className={cn("h-9 w-9 ring-2 ring-white", i > 0 && "-ml-2.5")}
        >
          {url ? <AvatarImage src={url} alt="" /> : null}
          <AvatarFallback className="text-sm">👤</AvatarFallback>
        </Avatar>
      ))}
      {extraCount > 0 && (
        <span className="-ml-2.5 z-10 flex h-9 min-w-9 items-center justify-center rounded-full bg-cream-100 px-1.5 text-xs font-bold text-mocha-700 ring-2 ring-white">
          +{extraCount}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ClubCard 구현**

`src/components/club/club-card.tsx` (시안: 좌측 썸네일, 인기 배지, 제목/설명, 지역·멤버수·카테고리 메타, 우측 아바타 스택):

```tsx
import { MapPin, UsersThree } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AvatarStack } from "@/components/club/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { categoryEmoji } from "@/lib/club-emoji";

export type ClubCardData = {
  id: string;
  name: string;
  category: string;
  region: string;
  sido?: string | null;
  sigungu?: string | null;
  description: string;
  memberCount: number;
  coverImage?: string | null;
  memberAvatars?: (string | null)[];
  extraMemberCount?: number;
};

// 시안의 "인기" 배지 기준 (스펙 §4.3)
const POPULAR_THRESHOLD = 20;

export function ClubCard({ club }: { club: ClubCardData }) {
  const regionLabel = club.sido
    ? [club.sido, club.sigungu].filter(Boolean).join(" ")
    : club.region;
  return (
    <Link href={`/club/${club.id}`} className="block">
      <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="flex items-center gap-4 p-4">
          {club.coverImage ? (
            // Supabase Storage 등 원격 이미지 — next/image 도메인 설정 없이 표시하기 위해 img 사용
            <img
              src={club.coverImage}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-3xl">
              {categoryEmoji(club.category)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {club.memberCount >= POPULAR_THRESHOLD && (
              <Badge variant="default" className="mb-1">
                인기
              </Badge>
            )}
            <h3 className="truncate text-lg font-extrabold tracking-tight text-mocha-900">
              {club.name}
            </h3>
            <p className="mt-0.5 truncate text-base text-mocha-700">{club.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-mocha-700">
                <MapPin size={14} weight="duotone" />
                {regionLabel}
              </span>
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-mocha-700">
                <UsersThree size={14} weight="duotone" />
                {club.memberCount}명
              </span>
              <Badge variant="secondary">{club.category}</Badge>
            </div>
          </div>
          <AvatarStack
            avatarUrls={club.memberAvatars ?? []}
            extraCount={club.extraMemberCount ?? 0}
            className="shrink-0"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: SearchBar 구현**

`src/components/club/search-bar.tsx`:

```tsx
"use client";

import { Faders, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar({
  initialValue = "",
  placeholder,
  filterCount = 0,
  onSearch,
  onFilterOpen,
}: {
  initialValue?: string;
  placeholder: string;
  filterCount?: number;
  onSearch: (q: string) => void;
  onFilterOpen?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <div className="min-w-0 flex-1">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          leadingIcon={<MagnifyingGlass size={26} weight="bold" />}
          enterKeyHint="search"
        />
      </div>
      {onFilterOpen && (
        <Button
          type="button"
          variant="outline"
          className="relative h-14 shrink-0 px-4"
          onClick={onFilterOpen}
        >
          <Faders size={22} weight="bold" />
          필터
          {filterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-coral-500 px-1 text-xs font-bold text-white">
              {filterCount}
            </span>
          )}
        </Button>
      )}
    </form>
  );
}
```

- [ ] **Step 4: 타입/린트 확인 후 Commit**

Run: `npx tsc --noEmit` → 출력 없음. `bunx biome check src/components/club/` → 오류 없음.

```bash
git add src/components/club/avatar-stack.tsx src/components/club/club-card.tsx src/components/club/search-bar.tsx
git commit -m "feat(club): shared ClubCard, AvatarStack, SearchBar components

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: FilterSheet + AppliedFilterChips

**Files:**
- Create: `src/components/club/filter-sheet.tsx`
- Create: `src/components/club/applied-filter-chips.tsx`

**Interfaces:**
- Consumes: Task 3의 옵션 상수·`ClubFilters`·`countActiveFilters`·`filterChips`, Task 2의 `REGIONS`/`SIDO_LIST`, `@/components/ui/{sheet,select,button}`
- Produces:
  - `FilterSheet({ open: boolean; onOpenChange: (open: boolean) => void; applied: ClubFilters; onApply: (next: ClubFilters) => void })` (client)
  - `AppliedFilterChips({ filters: ClubFilters; onRemove: (next: ClubFilters) => void; onReset: () => void })` (client)

- [ ] **Step 1: FilterSheet 구현**

`src/components/club/filter-sheet.tsx` (시안 필터 모달: 지역 → 카테고리 → 활동 요일 → 모임 유형 → 연령대 → 멤버 수 → 적용하기(n) / 초기화. 반경 섹션은 v1 제외 — 스펙 §10):

```tsx
"use client";

import { CalendarDots, MapPin, SquaresFour, Users, UsersThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  AGE_RANGE_OPTIONS,
  CLUB_CATEGORIES,
  type ClubFilters,
  countActiveFilters,
  DAY_OPTIONS,
  ETC_CATEGORY,
  MEETING_TYPE_OPTIONS,
  MEMBER_RANGE_OPTIONS,
} from "@/lib/club-filters";
import { REGIONS, SIDO_LIST } from "@/lib/regions";
import { cn } from "@/lib/utils";

const ALL_VALUE = "_all"; // Radix Select는 빈 문자열 value를 허용하지 않음

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2.5 text-base font-semibold transition-colors",
        selected
          ? "border-coral-500 bg-coral-50 text-coral-700"
          : "border-mocha-200 bg-white text-mocha-700"
      )}
    >
      {children}
    </button>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-lg font-extrabold text-mocha-900">
      {icon}
      {children}
    </h3>
  );
}

export function FilterSheet({
  open,
  onOpenChange,
  applied,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applied: ClubFilters;
  onApply: (next: ClubFilters) => void;
}) {
  const [draft, setDraft] = useState<ClubFilters>(applied);

  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  const sigunguList = draft.sido ? REGIONS[draft.sido] ?? [] : [];
  const categoryOptions = [...CLUB_CATEGORIES, ETC_CATEGORY];

  function toggleCategory(category: string) {
    const current = draft.categories ?? [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    setDraft({ ...draft, categories: next.length > 0 ? next : undefined });
  }

  function toggleDay(day: NonNullable<ClubFilters["days"]>[number]) {
    const current = draft.days ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setDraft({ ...draft, days: next.length > 0 ? next : undefined });
  }

  function reset() {
    setDraft({ q: draft.q, sort: draft.sort, scope: draft.scope });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto pb-28">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-2xl font-extrabold text-mocha-900">필터</SheetTitle>
          <button
            type="button"
            onClick={reset}
            className="mr-10 text-base font-bold text-coral-600 underline underline-offset-2"
          >
            초기화
          </button>
        </div>

        <div className="mt-5 space-y-7">
          <section className="space-y-3">
            <SectionTitle icon={<MapPin size={20} weight="duotone" className="text-coral-600" />}>
              지역
            </SectionTitle>
            <div className="flex gap-2">
              <Select
                value={draft.sido ?? ALL_VALUE}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    sido: v === ALL_VALUE ? undefined : v,
                    sigungu: undefined,
                  })
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="시/도 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>전체</SelectItem>
                  {SIDO_LIST.map((sido) => (
                    <SelectItem key={sido} value={sido}>
                      {sido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={draft.sigungu ?? ALL_VALUE}
                onValueChange={(v) =>
                  setDraft({ ...draft, sigungu: v === ALL_VALUE ? undefined : v })
                }
                disabled={sigunguList.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="시/군/구 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>전체</SelectItem>
                  {sigunguList.map((sigungu) => (
                    <SelectItem key={sigungu} value={sigungu}>
                      {sigungu}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={<SquaresFour size={20} weight="duotone" className="text-coral-600" />}
            >
              카테고리 <span className="text-sm font-semibold text-mocha-500">(복수 선택 가능)</span>
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.categories?.length}
                onClick={() => setDraft({ ...draft, categories: undefined })}
              >
                전체
              </Chip>
              {categoryOptions.map((category) => (
                <Chip
                  key={category}
                  selected={draft.categories?.includes(category) ?? false}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={<CalendarDots size={20} weight="duotone" className="text-coral-600" />}
            >
              활동 요일
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => (
                <Chip
                  key={day.value}
                  selected={draft.days?.includes(day.value) ?? false}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<UsersThree size={20} weight="duotone" className="text-coral-600" />}>
              모임 유형
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.meetingType}
                onClick={() => setDraft({ ...draft, meetingType: undefined })}
              >
                전체
              </Chip>
              {MEETING_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={draft.meetingType === option.value}
                  onClick={() => setDraft({ ...draft, meetingType: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<Users size={20} weight="duotone" className="text-coral-600" />}>
              연령대
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.ageRange}
                onClick={() => setDraft({ ...draft, ageRange: undefined })}
              >
                전체
              </Chip>
              {AGE_RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={draft.ageRange === option.value}
                  onClick={() => setDraft({ ...draft, ageRange: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<UsersThree size={20} weight="duotone" className="text-coral-600" />}>
              멤버 수
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.members}
                onClick={() => setDraft({ ...draft, members: undefined })}
              >
                전체
              </Chip>
              {MEMBER_RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={draft.members === option.value}
                  onClick={() => setDraft({ ...draft, members: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-mocha-100 bg-white p-4">
          <Button className="w-full" size="lg" onClick={() => onApply(draft)}>
            적용하기{countActiveFilters(draft) > 0 ? ` (${countActiveFilters(draft)})` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: AppliedFilterChips 구현**

`src/components/club/applied-filter-chips.tsx` (시안 TIP: 최대 3개 칩 + 초기화):

```tsx
"use client";

import { X } from "@phosphor-icons/react";
import { type ClubFilters, filterChips } from "@/lib/club-filters";

const MAX_VISIBLE = 3;

export function AppliedFilterChips({
  filters,
  onRemove,
  onReset,
}: {
  filters: ClubFilters;
  onRemove: (next: ClubFilters) => void;
  onReset: () => void;
}) {
  const chips = filterChips(filters);
  if (chips.length === 0) return null;
  const visible = chips.slice(0, MAX_VISIBLE);
  const hiddenCount = chips.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.removed)}
          aria-label={`${chip.label} 필터 제거`}
          className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-3 py-1.5 text-sm font-bold text-coral-700"
        >
          {chip.label}
          <X size={14} weight="bold" />
        </button>
      ))}
      {hiddenCount > 0 && (
        <span className="text-sm font-semibold text-mocha-500">외 {hiddenCount}개</span>
      )}
      <button
        type="button"
        onClick={onReset}
        className="ml-1 text-sm font-bold text-mocha-500 underline underline-offset-2"
      >
        초기화
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 타입/린트 확인 후 Commit**

Run: `npx tsc --noEmit` → 출력 없음. `bunx biome check src/components/club/` → 오류 없음.

```bash
git add src/components/club/filter-sheet.tsx src/components/club/applied-filter-chips.tsx
git commit -m "feat(club): filter bottom sheet and applied filter chips

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 클럽 목록 페이지 재구성 (URL 기반 필터링)

**Files:**
- Modify: `src/app/(main)/club/page.tsx` (전체 교체)
- Modify: `src/app/(main)/club/ClubListClient.tsx` (전체 교체 — 로컬 ClubCard/Tabs 제거)

**Interfaces:**
- Consumes: Task 3~6의 모든 export
- Produces: `/club?tab=&q=&sido=&...` URL 계약 — 탭 프리셋은 서버에서 필터로 해석(nearby→프로필 지역, popular→sort, mine→scope). 칩/시트는 URL의 명시적 파라미터만 반영.

- [ ] **Step 1: page.tsx 교체**

`src/app/(main)/club/page.tsx` 전체를 다음으로 교체:

```tsx
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  CLUB_TABS,
  type ClubFilters,
  type ClubTab,
  parseClubFilters,
} from "@/lib/club-filters";
import { queryClubs } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";
import { ClubListClient } from "./ClubListClient";

export default async function ClubListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: ClubTab = (CLUB_TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as ClubTab)
    : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myRegion: { sido: string | null; sigungu: string | null } = { sido: null, sigungu: null };
  if (user) {
    const [me] = await db
      .select({ sido: profiles.sido, sigungu: profiles.sigungu })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (me) myRegion = me;
  }

  // 칩/시트에 보여줄 필터는 URL의 명시적 파라미터만. 탭 프리셋은 쿼리에만 합성한다.
  const urlFilters = parseClubFilters(params);
  let effective: ClubFilters = urlFilters;
  if (tab === "popular") effective = { ...effective, sort: "popular" };
  if (tab === "mine") effective = { ...effective, scope: "mine" };
  if (tab === "nearby" && myRegion.sido) {
    effective = { ...effective, sido: myRegion.sido, sigungu: myRegion.sigungu ?? undefined };
  }

  const nearbyUnavailable = tab === "nearby" && !myRegion.sido;
  const clubList = nearbyUnavailable ? [] : await queryClubs(effective, user?.id);

  return (
    <ClubListClient
      clubs={clubList}
      filters={urlFilters}
      tab={tab}
      nearbyUnavailable={nearbyUnavailable}
      isLoggedIn={!!user}
    />
  );
}
```

- [ ] **Step 2: ClubListClient.tsx 교체**

`src/app/(main)/club/ClubListClient.tsx` 전체를 다음으로 교체 (기존 로컬 `ClubCard`/`ClubListItem`/Radix Tabs 제거):

```tsx
"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppliedFilterChips } from "@/components/club/applied-filter-chips";
import { ClubCard } from "@/components/club/club-card";
import { FilterSheet } from "@/components/club/filter-sheet";
import { SearchBar } from "@/components/club/search-bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  type ClubFilters,
  type ClubTab,
  countActiveFilters,
  serializeClubFilters,
} from "@/lib/club-filters";
import type { ClubListEntry } from "@/lib/queries/clubs";
import { cn } from "@/lib/utils";

const TAB_ITEMS: { value: ClubTab; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "nearby", label: "근처" },
  { value: "hobby", label: "취미별" },
  { value: "popular", label: "인기" },
  { value: "mine", label: "내 클럽" },
];

export function ClubListClient({
  clubs,
  filters,
  tab,
  nearbyUnavailable,
  isLoggedIn,
}: {
  clubs: ClubListEntry[];
  filters: ClubFilters;
  tab: ClubTab;
  nearbyUnavailable: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  function navigate(next: ClubFilters, nextTab: ClubTab = tab) {
    const qs = serializeClubFilters(next, nextTab !== "all" ? { tab: nextTab } : undefined);
    router.push(qs ? `/club?${qs}` : "/club");
  }

  function onTabClick(value: ClubTab) {
    if (value === "hobby") {
      // "취미별"은 카테고리 필터 시트를 여는 프리셋 (시안 동작)
      setSheetOpen(true);
      return;
    }
    navigate(filters, value);
  }

  let empty: { title: string; description: string; icon: "search" | "users" } | null = null;
  if (nearbyUnavailable) {
    empty = {
      icon: "search",
      title: "활동 지역을 설정해주세요",
      description: "내 정보에서 지역을 설정하면 근처 클럽을 보여드려요",
    };
  } else if (tab === "mine" && !isLoggedIn) {
    empty = {
      icon: "users",
      title: "로그인이 필요해요",
      description: "로그인하면 가입한 클럽을 볼 수 있어요",
    };
  } else if (clubs.length === 0) {
    const hasCondition = Boolean(filters.q) || countActiveFilters(filters) > 0;
    empty =
      tab === "mine"
        ? {
            icon: "users",
            title: "아직 가입한 클럽이 없어요",
            description: "관심있는 클럽을 찾아 가입해보세요",
          }
        : hasCondition
          ? {
              icon: "search",
              title: "조건에 맞는 클럽이 없어요",
              description: "필터를 줄이거나 다른 단어로 검색해보세요",
            }
          : {
              icon: "search",
              title: "아직 클럽이 없어요",
              description: "첫 클럽을 만들어보세요",
            };
  }

  return (
    <div className="space-y-5 p-5">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-mocha-900">클럽</h1>
          <p className="mt-1 text-base text-mocha-700">같은 취미를 가진 사람들과 함께해보세요</p>
        </div>
        <Link href="/club/create">
          <Button size="sm">
            <Plus size={22} weight="bold" />
            클럽 만들기
          </Button>
        </Link>
      </header>

      <SearchBar
        initialValue={filters.q ?? ""}
        placeholder="클럽 이름이나 취미로 검색해보세요"
        filterCount={countActiveFilters(filters)}
        onSearch={(q) => navigate({ ...filters, q: q || undefined })}
        onFilterOpen={() => setSheetOpen(true)}
      />

      <AppliedFilterChips
        filters={filters}
        onRemove={(next) => navigate(next)}
        onReset={() => navigate({ q: filters.q, sort: "recent", scope: "all" })}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onTabClick(item.value)}
            aria-pressed={tab === item.value}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-base font-bold transition-colors",
              tab === item.value
                ? "bg-coral-500 text-white"
                : "border border-mocha-200 bg-white text-mocha-700"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {empty ? (
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
      ) : (
        <div className="stagger-children space-y-3">
          {clubs.map((club) => (
            <div key={club.id} className="animate-fade-up">
              <ClubCard club={club} />
            </div>
          ))}
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        applied={filters}
        onApply={(next) => {
          setSheetOpen(false);
          navigate(next);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: 타입 검증 + grep으로 잔존 참조 확인**

Run: `npx tsc --noEmit` → 출력 없음.
Run: `grep -rn "ClubListItem" src/` → 결과 없음 (기존 타입 참조가 남아있으면 해당 파일 수정).

- [ ] **Step 4: 수동 검증 (dev 서버)**

`bun run dev` 후 브라우저(또는 curl로 HTML 확인)에서:

1. `/club` — 카드에 지역·멤버수·카테고리·(멤버 있으면) 아바타 스택 표시
2. 필터 버튼 → 시트 열림 → 카테고리 "등산" + 요일 "토" 선택 → "적용하기 (2)" → URL이 `/club?categories=등산&days=sat`로 바뀌고 목록 갱신, 칩 2개 노출
3. 칩 X 클릭 → 해당 조건만 제거. "초기화" → `/club`
4. 탭: "인기" → `?tab=popular` 정렬 변경, "내 클럽" → 가입 클럽만, "취미별" → 시트 열림
5. "근처" — 프로필에 지역 있으면 해당 지역 목록, 없으면 안내 EmptyState

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main)/club/page.tsx" "src/app/(main)/club/ClubListClient.tsx"
git commit -m "feat(club): url-driven club list with filter sheet, chips, redesigned cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 클럽 생성 폼 확장 + POST /api/clubs 스키마 확장

**Files:**
- Modify: `src/app/api/clubs/route.ts` (`CreateClubSchema` + POST insert)
- Modify: `src/app/(main)/club/create/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2 `REGIONS`/`SIDO_LIST`, Task 3 `CLUB_CATEGORIES`/`DAY_OPTIONS`/`MEETING_TYPE_OPTIONS`/`AGE_RANGE_OPTIONS`
- Produces: `POST /api/clubs` 요청 본문에 `sido`(필수), `sigungu`(시군구 있는 시도에서 필수), `activityDays: string[]`, `meetingType?`, `ageRange` 추가. `region`은 서버에서 `"{sido} {sigungu}"`로 합성 (클라이언트는 더 이상 `region`을 보내지 않음).

- [ ] **Step 1: CreateClubSchema + POST 교체**

`src/app/api/clubs/route.ts`에서 기존 `CreateClubSchema`와 `POST`를 다음으로 교체하고, import에 `REGIONS` 추가 (`import { REGIONS } from "@/lib/regions";`):

```ts
const CreateClubSchema = z
  .object({
    name: z.string().trim().min(2, "클럽 이름은 2자 이상이어야 해요").max(30),
    category: z.string().trim().min(1, "카테고리를 선택해주세요").max(20),
    description: z.string().trim().min(1, "클럽 소개를 입력해주세요").max(500),
    sido: z
      .string()
      .trim()
      .min(1, "시/도를 선택해주세요")
      .max(10)
      .refine((v) => v in REGIONS, "올바른 시/도가 아니에요"),
    sigungu: z.string().trim().min(1).max(20).optional(),
    activityDays: z
      .array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]))
      .max(7)
      .default([]),
    meetingType: z.enum(["regular", "flash", "social", "study"]).optional(),
    ageRange: z.enum(["all", "50s", "60s", "70plus"]).default("all"),
    joinType: z.enum(["open", "approval"]).default("open"),
  })
  .superRefine((data, ctx) => {
    const sigunguList = REGIONS[data.sido] ?? [];
    if (sigunguList.length > 0 && !data.sigungu) {
      ctx.addIssue({ code: "custom", message: "시/군/구를 선택해주세요" });
    }
    if (data.sigungu && sigunguList.length > 0 && !sigunguList.includes(data.sigungu)) {
      ctx.addIssue({ code: "custom", message: "올바른 시/군/구가 아니에요" });
    }
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

  const { sido, sigungu, activityDays, meetingType, ageRange, ...rest } = parsed.data;
  const region = sigungu ? `${sido} ${sigungu}` : sido;

  try {
    const clubId = crypto.randomUUID();
    const created = await db.transaction(async (tx) => {
      const [club] = await tx
        .insert(clubs)
        .values({
          id: clubId,
          ...rest,
          region,
          sido,
          sigungu: sigungu ?? null,
          activityDays,
          meetingType: meetingType ?? null,
          ageRange,
          ownerId: user.id,
          memberCount: 1,
        })
        .returning();
      await tx.insert(clubMembers).values({ clubId, userId: user.id, role: "owner" });
      return club;
    });

    return successResponse(created, 201);
  } catch (err) {
    console.error("[clubs POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: create/page.tsx 교체**

`src/app/(main)/club/create/page.tsx` 전체를 다음으로 교체 (로컬 `categories`/`regions` 상수 제거, 공용 상수 사용):

```tsx
"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AGE_RANGE_OPTIONS,
  CLUB_CATEGORIES,
  DAY_OPTIONS,
  MEETING_TYPE_OPTIONS,
} from "@/lib/club-filters";
import { REGIONS, SIDO_LIST } from "@/lib/regions";
import { cn } from "@/lib/utils";

const joinTypes = [
  { value: "open", label: "자유 가입" },
  { value: "approval", label: "승인 후 가입" },
];

const NONE_VALUE = "_none";

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [activityDays, setActivityDays] = useState<string[]>([]);
  const [meetingType, setMeetingType] = useState(NONE_VALUE);
  const [ageRange, setAgeRange] = useState("all");
  const [description, setDescription] = useState("");
  const [joinType, setJoinType] = useState("open");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sigunguList = sido ? REGIONS[sido] ?? [] : [];

  function toggleDay(day: string) {
    setActivityDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !sido) {
      setError("카테고리와 지역을 선택해주세요");
      return;
    }
    if (sigunguList.length > 0 && !sigungu) {
      setError("시/군/구를 선택해주세요");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          description,
          joinType,
          sido,
          sigungu: sigungu || undefined,
          activityDays,
          meetingType: meetingType === NONE_VALUE ? undefined : meetingType,
          ageRange,
        }),
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

  return (
    <div className="space-y-4 p-4">
      <Link
        href="/club"
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">클럽 만들기</CardTitle>
          <p className="text-base text-gray-500">실명인증 완료 후 클럽을 만들 수 있습니다</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="club-name">클럽 이름</Label>
              <Input
                id="club-name"
                placeholder="클럽 이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CLUB_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>활동 지역</Label>
              <div className="flex gap-2">
                <Select
                  value={sido}
                  onValueChange={(v) => {
                    setSido(v);
                    setSigungu("");
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="시/도 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIDO_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sigungu} onValueChange={setSigungu} disabled={sigunguList.length === 0}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="시/군/구 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sigunguList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>활동 요일 (선택)</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    aria-pressed={activityDays.includes(day.value)}
                    className={cn(
                      "h-11 w-11 rounded-full border text-base font-semibold transition-colors",
                      activityDays.includes(day.value)
                        ? "border-coral-500 bg-coral-50 text-coral-700"
                        : "border-mocha-200 bg-white text-mocha-700"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>모임 유형 (선택)</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
                  {MEETING_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>연령대</Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 연령</SelectItem>
                  {AGE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">클럽 소개</Label>
              <Textarea
                id="description"
                placeholder="클럽을 소개해주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>가입 방식</Label>
              <Select value={joinType} onValueChange={setJoinType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {joinTypes.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-base font-semibold text-red-600">{error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? "만드는 중..." : "클럽 만들기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

주의: 기존 카테고리 목록(12종)과 `CLUB_CATEGORIES`는 동일하므로 기존 클럽과의 호환성 문제 없음. `음악` 등 기존 값 유지.

- [ ] **Step 3: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 출력 없음

- [ ] **Step 4: 동작 확인 (dev 서버)**

`/club/create`에서 클럽 생성: 이름/카테고리/서울·강남구/요일 토·일/정기 모임/60대 입력 → 생성 성공 → 상세로 이동. 이후 `/club?sido=서울&sigungu=강남구&days=sat` 로 접근해 방금 만든 클럽이 필터에 걸리는지 확인. `세종` 선택 시 시/군/구 Select가 비활성인지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/clubs/route.ts "src/app/(main)/club/create/page.tsx"
git commit -m "feat(club): collect filter attributes (region, days, type, age) on club creation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 최종 통합 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 정적 검증**

```bash
npx tsc --noEmit
bun test src/lib
bunx biome check src/lib/regions.ts src/lib/regions.test.ts src/lib/club-filters.ts src/lib/club-filters.test.ts src/lib/queries/clubs.ts src/components/club/ "src/app/(main)/club/" src/app/api/clubs/route.ts src/db/schema/clubs.ts src/db/schema/users.ts
```

Expected: tsc 출력 없음, bun test 전부 PASS, biome 오류 없음.

- [ ] **Step 2: 수동 플로우 체크리스트 (dev 서버)**

1. `/club` 초기 로드 — 카드 리디자인 확인 (썸네일 fallback 이모지, 20명+ 클럽에 "인기" 배지, 아바타 스택)
2. 검색 → URL `?q=` 반영, 결과 필터링
3. 필터 시트 전체 섹션 조작 → 적용 → 칩/뱃지 카운트/URL 일치, 새로고침해도 상태 유지 (URL이 소스)
4. 탭 5종 동작 (전체/근처/취미별=시트/인기/내 클럽)
5. 클럽 생성 (신규 필드 포함) → 필터로 검색 가능
6. `GET /api/clubs?categories=등산&sort=popular` curl — `{ success: true, data: { clubs: [...] } }`
7. 기존 화면 회귀: 홈(`/`) 인기 모임 섹션, 클럽 상세(`/club/[id]`) 정상 (이번 변경이 건드리지 않은 영역)

- [ ] **Step 3: 결과 보고**

검증 결과(통과/실패 각 항목)를 사용자에게 보고하고, 발견된 문제는 수정 후 재검증. Phase 2(홈) 진행 여부 확인.

---

## 셀프 리뷰 노트 (플랜 작성 시 확인 완료)

- 스펙 §4(Phase 0) 커버: 마이그레이션=Task 1, 스토리지=Task 1(§7절), 공통 컴포넌트=Task 5, 아바타 lateral 조회=Task 4 (윈도우 함수로 구현). h_hobbies 재편은 스펙 개정에 따라 Phase 4로 이월.
- 스펙 §5(Phase 1) 커버: 필터 시트=Task 6, 칩=Task 6, 서버 필터링 API=Task 4, 탭 재정의=Task 7, 카드=Task 5, 생성 폼=Task 8. 반경 필터는 스펙 §10 편차로 제외 (lat/lng 컬럼만 선반영).
- 타입 일관성: `ClubFilters`(Task 3) → `queryClubs`(Task 4) → `ClubListClient`(Task 7), `ClubListEntry`(Task 4)는 `ClubCardData`(Task 5)에 구조적으로 대입 가능 (좁은 타입 → 넓은 타입).
- Radix Select는 빈 문자열 value 금지 → `_all`/`_none` 센티널 사용 (Task 6, 8).
- `page.tsx`에서 `ClubTab` 타입은 `club-filters.ts`에서 export (route 파일의 임의 export 제약 회피).
