# Info 콘텐츠 도메인 Wire-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** harmony-app의 정보 콘텐츠 도메인 (`/info`, `/info/[id]`, 댓글)을 mock 하드코딩 배열에서 실제 Supabase Postgres + Drizzle로 wire-up.

**Architecture:** 시드 SQL로 `h_info_contents`를 10건 채운 뒤, 6개 API 라우트를 standardized `api-response` 패턴 + Drizzle 쿼리로 재작성하고, 페이지 2개를 server component(데이터 페치) + client subtree(댓글 입력) 패턴으로 전환한다. 패턴은 Phase 1+2에서 확립된 `/api/profiles/[id]` 및 mypage 구조를 그대로 따른다.

**Tech Stack:** Next.js 16 App Router (server components), Drizzle ORM `0.45.1`, Supabase Postgres (`si_mvp.h_*`), Zod v4, `@/lib/api-response`, `@/lib/supabase/server`, Phosphor Icons, Tailwind.

**테스트 정책:** 이 프로젝트는 단위 테스트 인프라가 설정되지 않음 (Vitest/Jest/Playwright 없음). TDD step 대신 각 task는 `bunx tsc --noEmit` + `bun run lint` 정적 검증, 그리고 dev server에서 PowerShell `Invoke-RestMethod` 또는 브라우저로 manual smoke test로 회귀 확인. (현재 환경은 Windows PowerShell — `curl` alias는 `Invoke-WebRequest`라 Unix flag 안 먹음. 명시적 `curl.exe` 또는 `Invoke-RestMethod` 사용.) 새 테스트 인프라 도입은 별도 plan 사항이다.

**제외 (out of scope):**
- 운세(`/api/fortune/*`) 및 커뮤니티(`/api/community/*`) wire-up — 별도 plan.
- Admin UI에서 Gemini draft → INSERT 검수 워크플로우 (UI 자체 미존재) — 별도 plan.
- `like_count` mutation (좋아요 토글) — 표시만, mutation은 후속.
- 추천 콘텐츠 / 관련 모임 매칭 — 현재 mock의 `relatedClubs`는 일단 제거하고 후속에서 처리.
- Admin이 타인 댓글 삭제 (모더레이션 권한) — 본 plan은 본인 삭제만. 신고/모더레이션은 후속.
- 댓글 입력 UX (`confirm()` dialog → Card-style modal 교체) — MVP는 confirm(), 후속에서 시니어 UX에 맞게 교체.
- 정보 콘텐츠 페이지의 무한스크롤/페이지네이션 — API는 페이지네이션 지원하지만 페이지는 `limit 100` 일시적 fetch.

**전반적 규칙:**
- `@/lib/api-utils.ts` (legacy)는 새 코드에서 import 금지. `@/lib/api-response.ts`만 사용.
- DB connection의 `search_path: "si_mvp,public,extensions"` 덕분에 Drizzle 쿼리는 schema prefix 없이 동작.
- author 컬럼은 nullable이지만, 시드/admin POST 둘 다 비어두지 않는다 (UI 디자인이 author 없으면 어색).
- **인증 정책:** read-only API (`GET /api/info`, `GET /api/info/[id]`, `GET /api/info/[id]/comments`)는 **public** (비로그인 접근 허용). write/mutation은 인증 필수 — POST(콘텐츠)는 admin, POST(댓글)은 로그인, DELETE(댓글)은 본인. 페이지도 동일: `/info`, `/info/[id]`는 비로그인 열람 가능, 댓글 작성 영역만 로그인 안내.
- **viewCount 증가는 항상 SQL atomic increment** (`sql\`${infoContents.viewCount} + 1\``) 사용. JS read-modify-write는 race condition 발생.

---

## File Structure

**Create:**
- `supabase/migrations/20260527120000_seed_info_contents.sql` — 시드 10건
- `src/app/api/info/[id]/comments/[commentId]/route.ts` — DELETE 댓글
- `src/app/(main)/info/[id]/InfoComments.tsx` — 댓글 client subtree

**Modify (rewrite):**
- `src/app/api/info/route.ts` — GET 목록 + POST admin INSERT
- `src/app/api/info/[id]/route.ts` — GET 상세 + viewCount
- `src/app/api/info/[id]/comments/route.ts` — GET/POST 댓글
- `src/app/(main)/info/page.tsx` — server component, DB 직접 query
- `src/app/(main)/info/[id]/page.tsx` — server component, 댓글은 subtree

---

### Task 1: 정보 콘텐츠 시드 마이그레이션

**Files:**
- Create: `supabase/migrations/20260527120000_seed_info_contents.sql`

- [ ] **Step 1: 시드 마이그레이션 작성**

```sql
-- Phase 3-A: seed initial info contents so /info page is not empty.
-- Stable IDs (info-seed-NN) with ON CONFLICT DO NOTHING — safe to re-run.
-- Schema-qualified INSERT (si_mvp.*) — search_path 의존성 제거.

insert into si_mvp.h_info_contents (id, category, title, content, summary_box, tags, author, view_count, like_count) values
  ('info-seed-01', 'health',
    '60대 이후 꼭 알아야 할 건강검진 항목',
    E'나이가 들수록 정기적인 건강검진이 중요합니다.\n\n## 필수 검진 항목\n\n### 1. 암 검진\n- 위암: 2년마다 위내시경\n- 대장암: 5년마다 대장내시경\n- 폐암: 고위험군 매년 저선량 CT\n\n### 2. 심혈관 검사\n- 혈압·혈당·콜레스테롤 정기 체크\n- 심전도 및 심장초음파\n\n### 3. 골밀도 검사\n- 65세 이상 여성, 70세 이상 남성 필수\n- 골다공증 조기 발견이 중요\n\n### 4. 인지기능 검사\n- 치매 조기 선별 검사\n- 66·70·74세에 무료 검진 가능\n\n## 정부 지원 무료 검진\n\n국가 건강검진은 2년마다 무료로 받을 수 있습니다. 가까운 건강검진기관에서 예약하세요.',
    '60대 이후 권장 검진 항목과 국가 무료 검진 안내를 정리했습니다.',
    '["건강검진","시니어건강","예방의학"]'::jsonb,
    '건강지킴이', 0, 0),

  ('info-seed-02', 'health',
    '관절 건강을 위한 올바른 운동법',
    E'무릎과 허리 관절에 부담 없는 운동법을 소개합니다.\n\n## 추천 운동\n- 평지 걷기: 하루 30분, 주 5회\n- 수영·아쿠아로빅: 관절 부담 최소\n- 스트레칭 위주 요가\n\n## 피해야 할 동작\n- 급격한 점프와 착지\n- 깊은 스쿼트·런지\n- 무거운 중량 운동\n\n## 통증이 있을 때\n2주 이상 지속되는 통증은 정형외과 진료를 받으세요.',
    '관절에 부담 없이 꾸준히 할 수 있는 운동과 피해야 할 동작을 안내합니다.',
    '["관절","운동","건강"]'::jsonb,
    '운동전문가', 0, 0),

  ('info-seed-03', 'health',
    '시니어를 위한 혈압 관리 식단 가이드',
    E'고혈압은 시니어 건강의 가장 큰 위험 요소 중 하나입니다.\n\n## 권장 식단\n- 저염식 (하루 소금 5g 이하)\n- 신선한 채소·과일 매일 5접시\n- 통곡물·등푸른 생선 주 2회\n\n## 피해야 할 음식\n- 가공 육류·라면·젓갈\n- 카페인 과다 섭취\n- 과음\n\n## 생활 습관\n매일 같은 시간 혈압 측정과 기록을 권장합니다.',
    '고혈압 예방·관리에 도움되는 식단과 생활 습관을 정리했습니다.',
    '["혈압","식단","고혈압"]'::jsonb,
    '건강지킴이', 0, 0),

  ('info-seed-04', 'finance',
    '퇴직 후 안정적인 재테크 전략 5가지',
    E'퇴직 후 안정적인 수입 흐름을 만드는 핵심 전략입니다.\n\n## 1. 연금 3층 구조 활용\n- 국민연금 + 퇴직연금 + 개인연금\n\n## 2. 안전 자산 비중 확대\n- 채권·예금 비중을 자산의 60% 이상으로\n\n## 3. 배당주 ETF\n- 월 배당이 나오는 ETF를 적립식으로\n\n## 4. 부동산 임대수익\n- 소형 상가나 오피스텔 검토\n\n## 5. 절세 상품 활용\n- ISA, 비과세 종합저축 한도 확인',
    '안정적인 노후 자산을 위한 5가지 실전 전략을 소개합니다.',
    '["재테크","퇴직연금","노후준비"]'::jsonb,
    '현명한투자', 0, 0),

  ('info-seed-05', 'finance',
    '기초연금 효율적으로 관리하는 방법',
    E'기초연금 수급자가 알아두면 좋은 관리 팁입니다.\n\n## 자동이체 활용\n- 통신비·관리비 자동이체로 누락 방지\n\n## 비상금 분리\n- 월 수령액의 10%는 별도 적금\n\n## 의료비 통장\n- 병원·약국 지출은 별도 통장으로 추적',
    '기초연금을 안정적으로 관리하기 위한 실용 팁을 안내합니다.',
    '["기초연금","노후","재테크"]'::jsonb,
    '현명한투자', 0, 0),

  ('info-seed-06', 'travel',
    '시니어를 위한 국내 힐링 여행지 TOP 10',
    E'편안하고 접근성 좋은 국내 여행지를 소개합니다.\n\n## 추천 여행지\n1. 제주 올레길 (저강도 코스)\n2. 강원 양양 낙산사\n3. 충남 태안 안면도\n4. 전남 담양 죽녹원\n5. 경북 안동 하회마을\n6. 강원 정선 레일바이크\n7. 경남 통영 동피랑마을\n8. 충북 단양 도담삼봉\n9. 전북 전주 한옥마을\n10. 강원 평창 대관령',
    '시니어가 편하게 즐길 수 있는 국내 명소 10곳을 추천합니다.',
    '["국내여행","힐링","여행지"]'::jsonb,
    '여행에디터', 0, 0),

  ('info-seed-07', 'travel',
    '편안한 시니어 단체여행 준비 체크리스트',
    E'단체여행을 떠나기 전 꼭 챙겨야 할 항목입니다.\n\n## 필수 준비물\n- 상비약 (혈압약·당뇨약·진통제)\n- 편한 신발 2켤레\n- 모자·선글라스\n- 보험증·신분증 사본\n\n## 출발 전 확인\n- 일정표 인쇄본\n- 비상 연락처\n- 여행자 보험 가입 여부',
    '단체여행을 안전하고 편안하게 다녀오기 위한 체크리스트입니다.',
    '["여행준비","단체여행","체크리스트"]'::jsonb,
    '여행에디터', 0, 0),

  ('info-seed-08', 'hobby',
    '초보자를 위한 파크골프 시작 가이드',
    E'파크골프는 시니어에게 인기 있는 저강도 스포츠입니다.\n\n## 시작하기\n- 가까운 파크골프장 위치 확인\n- 입문 클럽 (드라이버·퍼터 2종) 구매\n- 기본 룰 영상 학습\n\n## 장비 선택\n- 클럽: 입문용 10~15만원대\n- 골프공·티: 전용 제품 권장\n\n## 매너\n- 앞 팀과 충분한 간격\n- 그린에서는 정숙',
    '파크골프 입문에 필요한 장비·룰·매너를 정리했습니다.',
    '["파크골프","취미","초보"]'::jsonb,
    '골프마스터', 0, 0),

  ('info-seed-09', 'gov',
    '2026년 시니어 지원 정책 총정리',
    E'2026년 주요 시니어 지원 정책을 정리했습니다.\n\n## 일자리\n- 노인일자리사업 신청 (만 60세 이상)\n- 시니어인턴십 프로그램\n\n## 돌봄\n- 노인맞춤돌봄서비스 확대\n- 장기요양보험 등급 신청\n\n## 주거\n- 고령자복지주택 입주 신청\n- 주택연금 가입 조건 완화\n\n## 의료\n- 노인외래정액제 확대\n- 치매 국가책임제',
    '2026년 노인일자리·돌봄·주거·의료 주요 정책을 한눈에 정리했습니다.',
    '["정부지원","복지","2026정책"]'::jsonb,
    '정책알리미', 0, 0),

  ('info-seed-10', 'gov',
    '기초연금 수급 자격과 신청 방법',
    E'기초연금은 만 65세 이상 소득 하위 70%에 지급됩니다.\n\n## 신청 자격\n- 만 65세 이상\n- 대한민국 국적·국내 거주\n- 소득인정액 기준 충족\n\n## 신청 방법\n- 주소지 읍·면·동 행정복지센터 방문\n- 국민연금공단 지사 방문\n- 복지로 (bokjiro.go.kr) 온라인 신청\n\n## 필요 서류\n- 신분증\n- 통장 사본\n- 임대차계약서 (해당 시)',
    '기초연금 수급 대상 여부와 신청 방법·서류를 안내합니다.',
    '["기초연금","복지","신청방법"]'::jsonb,
    '정책알리미', 0, 0)
on conflict (id) do nothing;
```

- [ ] **Step 2: SQL을 Supabase에 적용**

Run: `bunx supabase db push`

(또는 Supabase Studio SQL Editor에 위 SQL 복사 붙여넣기 후 RUN)

Expected: "Migration applied" 메시지, 에러 없음. 재실행 시 ON CONFLICT로 인해 변화 없음.

- [ ] **Step 3: row 적재 확인**

Run: `bun run db:studio` → si_mvp.h_info_contents 테이블 열기

Expected: 10 rows (info-seed-01 ~ info-seed-10). 카테고리 분포: health 3, finance 2, travel 2, hobby 1, gov 2.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260527120000_seed_info_contents.sql
git commit -m "feat(info): seed 10 info contents across categories"
```

---

### Task 2: GET /api/info — 목록 wire-up (페이지네이션·필터·검색)

**Files:**
- Modify: `src/app/api/info/route.ts` (GET only this task; POST는 Task 4)

- [ ] **Step 1: GET을 DB 쿼리로 재작성** (POST는 잠시 그대로 둠 — Task 4에서 교체)

`src/app/api/info/route.ts`의 GET 핸들러를 아래로 교체. POST는 손대지 말고 그대로 둔다. 파일 상단의 import는 두 핸들러 모두에 필요한 것으로 합본.

```typescript
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { infoContents } from "@/db/schema";
import { errorResponse as legacyErrorResponse, jsonResponse } from "@/lib/api-utils";
import { serverError, successResponse, validationError } from "@/lib/api-response";

const CATEGORIES = ["health", "finance", "travel", "hobby", "gov"] as const;
const QuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().min(1).max(100).optional(),
});

// GET /api/info - 정보 콘텐츠 목록 (페이지네이션·카테고리·검색)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    category: sp.get("category") ?? undefined,
    page: sp.get("page") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "잘못된 쿼리 파라미터입니다");
  }
  const { category, page, limit, q } = parsed.data;

  const whereParts = [
    category ? eq(infoContents.category, category) : undefined,
    q ? or(ilike(infoContents.title, `%${q}%`), ilike(infoContents.content, `%${q}%`)) : undefined,
  ].filter(Boolean);
  const whereClause = whereParts.length ? and(...whereParts) : undefined;

  try {
    const [contents, totalRow] = await Promise.all([
      db
        .select()
        .from(infoContents)
        .where(whereClause)
        .orderBy(desc(infoContents.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(infoContents).where(whereClause),
    ]);

    return successResponse({
      contents,
      pagination: { page, limit, total: totalRow[0]?.value ?? 0 },
      filters: { category: category ?? null, q: q ?? null },
    });
  } catch (err) {
    console.error("[info GET]", err);
    return serverError();
  }
}

// POST /api/info - 콘텐츠 작성 (관리자)
// Task 4에서 admin-only + DB INSERT로 교체 예정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, content, tags, summaryBox } = body as {
      category?: string;
      title?: string;
      content?: string;
      tags?: string[];
      summaryBox?: string;
    };
    if (!category || !title || !content) {
      return legacyErrorResponse("필수 항목을 입력해주세요");
    }
    const article = {
      id: crypto.randomUUID(),
      category,
      title,
      content,
      summaryBox: summaryBox ?? "",
      tags: tags ?? [],
      viewCount: 0,
      likeCount: 0,
      createdAt: new Date().toISOString(),
    };
    return jsonResponse(article, 201);
  } catch {
    return legacyErrorResponse("잘못된 요청입니다");
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `bunx tsc --noEmit`

Expected: PASS (에러 0건).

- [ ] **Step 3: dev server에서 PowerShell 검증**

Terminal A: `bun run dev` (background — PowerShell에서 `Start-Process bun -ArgumentList "run","dev"` 또는 별도 터미널)

Terminal B (PowerShell):
```powershell
Invoke-RestMethod "http://localhost:3000/api/info?category=health&limit=5" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/info?q=연금" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/info" | ConvertTo-Json -Depth 4
```

Expected:
- 첫 번째: `success: true`, `data.contents`에 health 카테고리 시드 3건 (info-seed-01/02/03), `pagination.total: 3`.
- 두 번째: 연금 검색 결과 — info-seed-04 ("퇴직 후 재테크 전략 5가지" 본문), info-seed-05 ("기초연금 효율적 관리"), info-seed-10 ("기초연금 수급 자격") 등.
- 세 번째: `pagination.total: 10`, 페이지 1, 전체 시드 10건.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/info/route.ts
git commit -m "feat(info): wire GET /api/info to real DB with filters"
```

---

### Task 3: GET /api/info/[id] — 상세 wire-up + viewCount 증가

**Files:**
- Modify: `src/app/api/info/[id]/route.ts`

- [ ] **Step 1: 전체 파일 교체**

```typescript
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { infoContents } from "@/db/schema";
import { notFoundError, serverError, successResponse } from "@/lib/api-response";

// GET /api/info/[id] - 콘텐츠 상세 + viewCount 증가
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [row] = await db.select().from(infoContents).where(eq(infoContents.id, id)).limit(1);
    if (!row) return notFoundError("콘텐츠를 찾을 수 없습니다");

    // viewCount +1 (best effort, 실패해도 응답은 정상)
    db.update(infoContents)
      .set({ viewCount: sql`${infoContents.viewCount} + 1` })
      .where(eq(infoContents.id, id))
      .catch((err) => console.error("[info GET viewCount]", err));

    return successResponse(row);
  } catch (err) {
    console.error("[info GET id]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `bunx tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: PowerShell 검증**

```powershell
Invoke-RestMethod "http://localhost:3000/api/info/info-seed-01" | ConvertTo-Json -Depth 4
try { Invoke-RestMethod "http://localhost:3000/api/info/does-not-exist" } catch { $_.ErrorDetails.Message }
```

Expected:
- 첫 번째: `success: true`, `data` = info-seed-01 row (category=health, title=...).
- 두 번째: catch 블록에서 `{"success":false,"error":{"code":"NOT_FOUND","message":"콘텐츠를 찾을 수 없습니다"}}` 출력 (Invoke-RestMethod는 4xx/5xx에서 throw).
- 두 번 호출 후 Drizzle Studio에서 `info-seed-01`의 `view_count`가 0 → 2로 증가 확인.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/info/[id]/route.ts
git commit -m "feat(info): wire GET /api/info/[id] with viewCount increment"
```

---

### Task 4: POST /api/info — admin-only + 실제 INSERT

**Files:**
- Modify: `src/app/api/info/route.ts` (POST 핸들러만 교체, GET·imports는 Task 2 결과 유지)

- [ ] **Step 1: 파일 상단 import 정리 + POST 교체**

`src/app/api/info/route.ts`의 POST 핸들러와 함께 legacy `api-utils` import는 더 이상 필요 없으므로 제거. 최종 파일은 다음과 같다:

```typescript
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { infoContents, profiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/is-admin";
import {
  forbiddenError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";

const CATEGORIES = ["health", "finance", "travel", "hobby", "gov"] as const;

const QuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().min(1).max(100).optional(),
});

const CreateSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  summaryBox: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  author: z.string().trim().min(1).max(40).optional(),
});

// GET /api/info — Task 2 구현
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    category: sp.get("category") ?? undefined,
    page: sp.get("page") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "잘못된 쿼리 파라미터입니다");
  }
  const { category, page, limit, q } = parsed.data;

  const whereParts = [
    category ? eq(infoContents.category, category) : undefined,
    q ? or(ilike(infoContents.title, `%${q}%`), ilike(infoContents.content, `%${q}%`)) : undefined,
  ].filter(Boolean);
  const whereClause = whereParts.length ? and(...whereParts) : undefined;

  try {
    const [contents, totalRow] = await Promise.all([
      db
        .select()
        .from(infoContents)
        .where(whereClause)
        .orderBy(desc(infoContents.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(infoContents).where(whereClause),
    ]);

    return successResponse({
      contents,
      pagination: { page, limit, total: totalRow[0]?.value ?? 0 },
      filters: { category: category ?? null, q: q ?? null },
    });
  } catch (err) {
    console.error("[info GET]", err);
    return serverError();
  }
}

// POST /api/info - 콘텐츠 작성 (관리자 전용)
export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await requireAdmin();
  if (!userId) return unauthorizedError();
  if (!isAdmin) return forbiddenError("관리자만 콘텐츠를 작성할 수 있습니다");

  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    // author 기본값: 작성자(admin) nickname → fallback "관리자"
    let resolvedAuthor = parsed.data.author;
    if (!resolvedAuthor) {
      const [adminProfile] = await db
        .select({ nickname: profiles.nickname })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      resolvedAuthor = adminProfile?.nickname ?? "관리자";
    }

    const [inserted] = await db
      .insert(infoContents)
      .values({
        id: crypto.randomUUID(),
        category: parsed.data.category,
        title: parsed.data.title,
        content: parsed.data.content,
        summaryBox: parsed.data.summaryBox ?? null,
        tags: parsed.data.tags ?? [],
        author: resolvedAuthor,
        viewCount: 0,
        likeCount: 0,
      })
      .returning();

    return successResponse(inserted, 201);
  } catch (err) {
    console.error("[info POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 타입체크 + lint**

Run:
```bash
bunx tsc --noEmit
bun run lint
```

Expected: 둘 다 PASS.

- [ ] **Step 3: PowerShell로 admin 보호 검증**

비로그인 상태 (PowerShell에 쿠키 없음 → unauthorized 기대):
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/info" -Method POST `
    -ContentType "application/json" `
    -Body (@{ category = "health"; title = "테스트"; content = "테스트 본문" } | ConvertTo-Json)
} catch { $_.ErrorDetails.Message }
```
Expected: catch 블록에서 `{"success":false,"error":{"code":"UNAUTHORIZED",...}}` 출력 (401 throw).

> 정상적인 admin POST 검증은 admin UI 구축 후 별도 plan에서. 본 plan에서는 게이트가 작동하는지만 확인.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/info/route.ts
git commit -m "feat(info): POST /api/info admin-only with DB insert"
```

---

### Task 5: GET /api/info/[id]/comments — 댓글 목록 (profiles JOIN)

**Files:**
- Modify: `src/app/api/info/[id]/comments/route.ts` (GET만 이 task; POST는 Task 6)

- [ ] **Step 1: 파일 상단 import + GET 교체. POST는 임시로 그대로 둠**

```typescript
import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { infoComments, profiles } from "@/db/schema";
import { errorResponse as legacyErrorResponse, jsonResponse } from "@/lib/api-utils";
import { serverError, successResponse } from "@/lib/api-response";

// GET /api/info/[id]/comments - 댓글 목록 (작성자 nickname/avatar JOIN)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rows = await db
      .select({
        id: infoComments.id,
        contentId: infoComments.contentId,
        userId: infoComments.userId,
        content: infoComments.content,
        createdAt: infoComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(infoComments)
      .leftJoin(profiles, eq(infoComments.userId, profiles.id))
      .where(eq(infoComments.contentId, id))
      .orderBy(asc(infoComments.createdAt));

    return successResponse({ contentId: id, comments: rows });
  } catch (err) {
    console.error("[info comments GET]", err);
    return serverError();
  }
}

// POST /api/info/[id]/comments - 댓글 작성 (Task 6에서 교체 예정)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { content } = body as { content?: string };
    if (!content) return legacyErrorResponse("댓글 내용을 입력해주세요");
    const comment = { id: crypto.randomUUID(), contentId: id, content, createdAt: new Date().toISOString() };
    return jsonResponse(comment, 201);
  } catch {
    return legacyErrorResponse("잘못된 요청입니다");
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `bunx tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: PowerShell 검증** (초기엔 빈 배열)

```powershell
Invoke-RestMethod "http://localhost:3000/api/info/info-seed-01/comments" | ConvertTo-Json -Depth 4
```

Expected: `success: true`, `data.contentId: "info-seed-01"`, `data.comments: []` (빈 배열).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/info/[id]/comments/route.ts
git commit -m "feat(info): wire GET comments to DB with profile join"
```

---

### Task 6: POST /api/info/[id]/comments — 인증 + INSERT + 응답 join

**Files:**
- Modify: `src/app/api/info/[id]/comments/route.ts` (POST 핸들러 교체 + legacy import 제거)

- [ ] **Step 1: POST 교체. 최종 파일은 다음과 같다**

```typescript
import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { infoComments, infoContents, profiles } from "@/db/schema";
import {
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const CreateCommentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

// GET /api/info/[id]/comments — Task 5 구현
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rows = await db
      .select({
        id: infoComments.id,
        contentId: infoComments.contentId,
        userId: infoComments.userId,
        content: infoComments.content,
        createdAt: infoComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(infoComments)
      .leftJoin(profiles, eq(infoComments.userId, profiles.id))
      .where(eq(infoComments.contentId, id))
      .orderBy(asc(infoComments.createdAt));

    return successResponse({ contentId: id, comments: rows });
  } catch (err) {
    console.error("[info comments GET]", err);
    return serverError();
  }
}

// POST /api/info/[id]/comments - 댓글 작성 (로그인 필수)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = CreateCommentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "댓글 내용이 올바르지 않습니다");
  }

  try {
    // 콘텐츠 존재 확인 (FK 위반 방지 — 친절한 에러 메시지)
    const [content] = await db
      .select({ id: infoContents.id })
      .from(infoContents)
      .where(eq(infoContents.id, id))
      .limit(1);
    if (!content) return notFoundError("콘텐츠를 찾을 수 없습니다");

    const commentId = crypto.randomUUID();
    await db.insert(infoComments).values({
      id: commentId,
      contentId: id,
      userId: user.id,
      content: parsed.data.content,
    });

    // 작성자 정보까지 조인해서 반환 (GET과 동일 shape)
    const [created] = await db
      .select({
        id: infoComments.id,
        contentId: infoComments.contentId,
        userId: infoComments.userId,
        content: infoComments.content,
        createdAt: infoComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(infoComments)
      .leftJoin(profiles, eq(infoComments.userId, profiles.id))
      .where(eq(infoComments.id, commentId))
      .limit(1);

    return successResponse(created, 201);
  } catch (err) {
    console.error("[info comments POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 타입체크 + lint**

Run:
```bash
bunx tsc --noEmit
bun run lint
```

Expected: PASS.

- [ ] **Step 3: 로그인 상태에서 브라우저 fetch로 검증**

브라우저에서 로그인 후 DevTools Console:
```js
const r = await fetch("/api/info/info-seed-01/comments", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: "테스트 댓글" }),
});
console.log(r.status, await r.json());
```

Expected: `201 {success:true, data:{ id:..., authorNickname:"...", ... }}`

이어서 GET으로 1건 조회되는지 확인:
```js
const g = await fetch("/api/info/info-seed-01/comments").then((r) => r.json());
console.log(g);
```

Expected: `comments.length === 1`, 방금 댓글이 nickname 포함되어 있음.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/info/[id]/comments/route.ts
git commit -m "feat(info): POST comment with auth, FK check, profile join"
```

---

### Task 7: DELETE /api/info/[id]/comments/[commentId] — 본인 댓글 삭제

**Files:**
- Create: `src/app/api/info/[id]/comments/[commentId]/route.ts`

- [ ] **Step 1: 새 라우트 파일 작성**

```typescript
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { infoComments } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/info/[id]/comments/[commentId] - 본인 댓글만 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [existing] = await db
      .select({ userId: infoComments.userId })
      .from(infoComments)
      .where(and(eq(infoComments.id, commentId), eq(infoComments.contentId, id)))
      .limit(1);
    if (!existing) return notFoundError("댓글을 찾을 수 없습니다");
    if (existing.userId !== user.id) {
      return forbiddenError("본인이 작성한 댓글만 삭제할 수 있습니다");
    }

    await db.delete(infoComments).where(eq(infoComments.id, commentId));
    return successResponse({ deleted: true, id: commentId });
  } catch (err) {
    console.error("[info comment DELETE]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `bunx tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: 브라우저에서 검증**

본인 댓글 삭제:
```js
// 직전 task에서 만든 댓글 id 사용
const id = "<방금 만든 댓글 id>";
const r = await fetch(`/api/info/info-seed-01/comments/${id}`, { method: "DELETE" });
console.log(r.status, await r.json());
```
Expected: `200 {success:true, data:{deleted:true, id:"..."}}`

존재하지 않는 댓글:
```js
const r2 = await fetch("/api/info/info-seed-01/comments/nope", { method: "DELETE" });
console.log(r2.status, await r2.json());
```
Expected: `404 {success:false, error:{code:"NOT_FOUND"}}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/info/[id]/comments/[commentId]/route.ts
git commit -m "feat(info): DELETE comment endpoint (owner only)"
```

---

### Task 8: `/info` 페이지 — server component, DB 직접 query

**Files:**
- Modify: `src/app/(main)/info/page.tsx` (전체 rewrite)

- [ ] **Step 1: server component로 교체** (mock 배열 제거, db 직접 query, Tabs는 클라이언트 filter 그대로)

```tsx
import {
  Airplane,
  Buildings,
  CurrencyCircleDollar,
  Eye,
  GameController,
  Heart,
  ThumbsUp,
} from "@phosphor-icons/react/dist/ssr";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { infoContents } from "@/db/schema";

interface InfoCategory {
  key: "health" | "finance" | "travel" | "hobby" | "gov";
  label: string;
  icon: React.ReactNode;
}

const categories: InfoCategory[] = [
  { key: "health", label: "건강", icon: <Heart size={20} weight="duotone" /> },
  { key: "finance", label: "재테크", icon: <CurrencyCircleDollar size={20} weight="duotone" /> },
  { key: "travel", label: "여행", icon: <Airplane size={20} weight="duotone" /> },
  { key: "hobby", label: "취미", icon: <GameController size={20} weight="duotone" /> },
  { key: "gov", label: "정부지원", icon: <Buildings size={20} weight="duotone" /> },
];

type InfoRow = typeof infoContents.$inferSelect;

function ArticleCard({ article }: { article: InfoRow }) {
  const summary = article.summaryBox ?? article.content.slice(0, 80);
  const tags = article.tags ?? [];
  return (
    <Link href={`/info/${article.id}`} className="block">
      <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="p-5">
          <h3 className="text-lg font-extrabold text-mocha-900 leading-snug tracking-tight line-clamp-2">
            {article.title}
          </h3>
          <p className="mt-2 text-base text-mocha-700 leading-relaxed line-clamp-2">{summary}</p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-mocha-100 pt-3">
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-base font-semibold text-mocha-700">
              <span className="inline-flex items-center gap-1">
                <Eye size={18} weight="duotone" />
                {article.viewCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp size={18} weight="duotone" className="text-coral-500" />
                {article.likeCount ?? 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function InfoPage() {
  // P2: 페이지네이션/무한스크롤로 교체 예정. 현재는 limit 100으로 단순 fetch.
  const articles = await db
    .select()
    .from(infoContents)
    .orderBy(desc(infoContents.createdAt))
    .limit(100);

  return (
    <div className="space-y-5 p-5">
      <div className="pt-2">
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">정보</h1>
        <p className="mt-2 text-lg text-mocha-700">시니어를 위한 유용한 정보를 모았어요</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">전체</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key}>
              {cat.icon}
              <span className="ml-1.5">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="stagger-children space-y-3">
          {articles.length === 0 ? (
            <p className="text-center text-mocha-500 py-12">아직 등록된 콘텐츠가 없어요</p>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="animate-fade-up">
                <ArticleCard article={article} />
              </div>
            ))
          )}
        </TabsContent>

        {categories.map((cat) => {
          const filtered = articles.filter((a) => a.category === cat.key);
          return (
            <TabsContent key={cat.key} value={cat.key} className="stagger-children space-y-3">
              {filtered.length === 0 ? (
                <p className="text-center text-mocha-500 py-12">{cat.label} 카테고리에 콘텐츠가 없어요</p>
              ) : (
                filtered.map((article) => (
                  <div key={article.id} className="animate-fade-up">
                    <ArticleCard article={article} />
                  </div>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크 + lint**

Run:
```bash
bunx tsc --noEmit
bun run lint
```

Expected: PASS.

- [ ] **Step 3: 브라우저에서 페이지 확인**

dev server 떠있는 상태에서 `http://localhost:3000/info` 방문.

Expected:
- 10건 카드 표시 (생성일 desc 순)
- 전체/건강/재테크/여행/취미/정부지원 탭 클릭 시 해당 카테고리로 필터
- 각 카드: title, summary_box 또는 content 앞 80자, tags 최대 2개, viewCount, likeCount
- 빈 카테고리 (예: 시드에 없는 미래 카테고리)는 empty state 메시지

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/info/page.tsx
git commit -m "feat(info): render /info page from real DB"
```

---

### Task 9: `/info/[id]` 페이지 — server article + client comments subtree

**Files:**
- Modify: `src/app/(main)/info/[id]/page.tsx` (전체 rewrite, server component로)
- Create: `src/app/(main)/info/[id]/InfoComments.tsx` (client subtree)

- [ ] **Step 1: 댓글 client subtree 작성**

```tsx
// src/app/(main)/info/[id]/InfoComments.tsx
"use client";

import { ChatCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface CommentRow {
  id: string;
  content: string;
  userId: string | null;
  createdAt: string | null;
  authorNickname: string | null;
  authorAvatarUrl: string | null;
}

interface Props {
  contentId: string;
  currentUserId: string | null;
}

export function InfoComments({ contentId, currentUserId }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/info/${contentId}/comments`);
        const json = (await res.json()) as
          | { success: true; data: { comments: CommentRow[] } }
          | { success: false; error: { message: string } };
        if (cancelled) return;
        if (json.success) setComments(json.data.comments);
        else setError(json.error.message);
      } catch {
        if (!cancelled) setError("댓글을 불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const handleSubmit = async () => {
    const content = newComment.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/info/${contentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as
        | { success: true; data: CommentRow }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setComments((prev) => [...prev, json.data]);
      setNewComment("");
    } catch {
      setError("댓글을 등록하지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/info/${contentId}/comments/${id}`, { method: "DELETE" });
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("삭제에 실패했습니다");
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <ChatCircle size={20} />
          댓글 ({comments.length})
        </h3>

        {currentUserId ? (
          <div className="flex gap-2">
            <Textarea
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1"
              maxLength={1000}
            />
            <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || submitting}>
              {submitting ? "등록 중..." : "등록"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-mocha-500">댓글을 작성하려면 로그인이 필요합니다.</p>
        )}

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-mocha-500">댓글을 불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-mocha-500">첫 댓글을 남겨보세요.</p>
          ) : (
            comments.map((comment) => {
              const author = comment.authorNickname ?? "익명";
              const initial = author.charAt(0);
              const date = comment.createdAt
                ? new Date(comment.createdAt).toLocaleDateString("ko-KR")
                : "";
              const isMine = currentUserId !== null && comment.userId === currentUserId;
              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    {comment.authorAvatarUrl && (
                      <AvatarImage src={comment.authorAvatarUrl} alt={author} />
                    )}
                    <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{author}</span>
                      <span className="text-xs text-gray-400">{date}</span>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="ml-auto text-xs text-mocha-400 hover:text-[var(--color-danger)]"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 상세 페이지를 server component로 교체** (mock article 제거, DB 직접 query, 댓글은 subtree에 위임)

```tsx
// src/app/(main)/info/[id]/page.tsx
import { ArrowLeft, Eye, Share, ThumbsUp } from "@phosphor-icons/react/dist/ssr";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { infoContents } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { InfoComments } from "./InfoComments";

const CATEGORY_LABEL: Record<string, string> = {
  health: "건강",
  finance: "재테크",
  travel: "여행",
  hobby: "취미",
  gov: "정부지원",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InfoDetailPage({ params }: Props) {
  const { id } = await params;

  const [article] = await db.select().from(infoContents).where(eq(infoContents.id, id)).limit(1);
  if (!article) notFound();

  // viewCount atomic +1 (race-safe). best-effort — 실패해도 응답은 정상.
  db
    .update(infoContents)
    .set({ viewCount: sql`${infoContents.viewCount} + 1` })
    .where(eq(infoContents.id, id))
    .catch((err) => console.error("[info/[id] viewCount]", err));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tags = article.tags ?? [];
  const date = article.createdAt ? new Date(article.createdAt).toLocaleDateString("ko-KR") : "";

  return (
    <div className="space-y-4 p-4">
      <Link
        href="/info"
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        목록으로
      </Link>

      <article>
        <Badge className="mb-2">{CATEGORY_LABEL[article.category] ?? article.category}</Badge>
        <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
          {article.author && <span>{article.author}</span>}
          <span>{date}</span>
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {article.viewCount ?? 0}
          </span>
        </div>

        <div className="mt-6 prose prose-gray max-w-none">
          {article.content.split("\n").map((line, i) => {
            const key = `line-${i}`;
            if (line.startsWith("### "))
              return (
                <h3 key={key} className="text-lg font-semibold text-gray-900 mt-4">
                  {line.replace("### ", "")}
                </h3>
              );
            if (line.startsWith("## "))
              return (
                <h2 key={key} className="text-xl font-bold text-gray-900 mt-6">
                  {line.replace("## ", "")}
                </h2>
              );
            if (line.startsWith("- "))
              return (
                <p key={key} className="text-base text-gray-700 ml-4">
                  • {line.replace("- ", "")}
                </p>
              );
            if (line.trim() === "") return <br key={key} />;
            return (
              <p key={key} className="text-base text-gray-700">
                {line}
              </p>
            );
          })}
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" size="sm" disabled aria-disabled="true">
            <ThumbsUp size={16} className="mr-1" />
            {article.likeCount ?? 0}
          </Button>
          <Button variant="outline" size="sm">
            <Share size={16} className="mr-1" />
            공유
          </Button>
        </div>
      </article>

      <InfoComments contentId={article.id} currentUserId={user?.id ?? null} />
    </div>
  );
}
```

> 주: 좋아요(`ThumbsUp`) 버튼은 표시만 (disabled). 좋아요 mutation 엔드포인트는 별도 plan. 기존의 "관련 모임" 카드는 매칭 로직이 없으므로 일단 제거.

- [ ] **Step 3: 타입체크 + lint**

Run:
```bash
bunx tsc --noEmit
bun run lint
```

Expected: PASS.

- [ ] **Step 4: 브라우저 smoke test**

dev server에서:
1. `http://localhost:3000/info` → 카드 클릭 → `/info/info-seed-01` 이동
2. article 본문, author, 날짜, viewCount 표시 확인
3. 새로고침 시 viewCount +1
4. 로그아웃 상태: "댓글을 작성하려면 로그인이 필요합니다" 표시
5. 로그인 상태: 댓글 입력 → 등록 → 목록에 본인 댓글 표시 → 본인 댓글에 "삭제" 버튼 → 삭제 시 사라짐
6. `/info/does-not-exist` 방문 시 Next.js 기본 404 페이지

- [ ] **Step 5: Commit**

```bash
git add src/app/(main)/info/[id]/page.tsx src/app/(main)/info/[id]/InfoComments.tsx
git commit -m "feat(info): render detail page + comments from DB"
```

---

## Self-Review 결과

**Spec coverage:**
- Phase 3-A의 P1-1 (시드): Task 1 ✓
- Phase 3-A의 P1-2 (`/api/info` GET 페이지네이션/카테고리/검색): Task 2 ✓
- Phase 3-A의 P1-3 (`/info/page.tsx`, `/info/[id]/page.tsx` server 전환): Task 8, 9 ✓
- Phase 3-B의 댓글 영속화 (info 댓글 한정): Task 5, 6, 7 ✓
- POST /api/info admin 보호 (메모리 P1-1의 "검수 워크플로우" 기반): Task 4 ✓

**제외 항목 명시:** 운세·커뮤니티 댓글, Gemini 검수 UI, 좋아요 토글, 관련 모임 — out of scope에 명시했고 후속 plan에서 진행.

**Type consistency 검토:**
- API 응답 shape의 `comments` 항목은 `CommentRow` (id, content, userId, createdAt, authorNickname, authorAvatarUrl) — Task 5/6/InfoComments 모두 동일.
- POST /api/info 입력 schema는 `CreateSchema` 하나로 일관 — Task 4에서만 정의.
- 카테고리 enum 값: `["health","finance","travel","hobby","gov"]` — Task 2, 4, 8에서 동일하게 사용.
- `successResponse(data, status?)` 시그니처: api-response.ts의 시그니처와 일치.

**Placeholder scan:** "TODO", "TBD", "implement later", "Add appropriate error handling" 등 — plan 본문에 없음. 모든 step에 실제 코드 포함.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-info-content-wireup.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, 빠른 iteration
2. **Inline Execution** — 현재 세션에서 executing-plans 스킬로 batched execution + checkpoints

**Which approach?**
