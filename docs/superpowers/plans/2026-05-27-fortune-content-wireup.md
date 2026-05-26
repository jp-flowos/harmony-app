# Fortune 도메인 Wire-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`).

**Goal:** harmony-app의 운세 도메인 (`/fortune`, `/api/fortune`, `/api/fortune/comments`, admin seed)을 deterministic algorithmic + DB hybrid로 wire-up.

**Architecture:** Algorithmic fortune(`src/lib/fortune.ts`)을 fallback으로 유지하면서, DB(`h_fortune_master`)에 Gemini로 생성된 풍부한 본문을 단계적으로 적재한다. GET은 DB 우선 + algorithmic fallback (DB write X). 댓글 POST는 `lazy upsert` — fortune row 없으면 algorithmic 본문으로 즉시 INSERT 후 댓글 추가. Admin endpoint로 일자별 12간지 Gemini batch seed 가능. 페이지는 server (user.birthYear → default zodiac) + client subtree (selector, today, comments).

**Tech Stack:** Next.js 16 App Router, Drizzle, Supabase Postgres, Zod v4, Gemini API, `@/lib/api-response`, `@/lib/fortune` algorithmic engine, `@/lib/gemini`.

**테스트 정책:** info plan과 동일. typecheck + lint + PowerShell `Invoke-RestMethod` 검증. 브라우저 manual smoke test.

**핵심 결정 (info와 다른 점):**
- **Score/luckyColor/luckyNumber은 DB에 저장 X.** date+zodiac seed로 deterministic하게 매번 derive. 응답에 추가.
- **DB의 4개 본문 카테고리**: general(=`content`), health, money, relation. Gemini가 4개 생성. algorithmic fallback도 4개 (relation 새로 추가).
- **Lazy upsert on POST comment**: fortune row 없어도 댓글 작성 가능. server가 algorithmic 본문으로 `h_fortune_master` row 즉시 INSERT 후 comment INSERT.
- **Stable IDs**: `fortune-{YYYY-MM-DD}-{zodiac}`. ON CONFLICT (id) DO NOTHING.
- **Admin seed**: 일자 단위 batch. 이미 있는 zodiac은 UPDATE (admin 덮어쓰기 의도). Gemini 호출 12회 ≈ 30~60초.

**제외 (out of scope):**
- Vercel Cron으로 매일 자동 seed (별도 plan).
- Zodiac selector를 URL search params로 (현 plan은 client local state).
- 좋아요 / Share 외 추가 인터랙션.
- 운세 점수에 따른 색상 테마 변경.
- 운세 푸시 알림.

**전반적 규칙:**
- `@/lib/api-utils.ts` import 금지. `@/lib/api-response.ts`만.
- DB write는 `try/catch` 안에서, atomic SQL fragments 우선.
- 인증 정책: GET fortune 공개 (proxy가 페이지 보호하지만 /api/*는 통과), POST/DELETE 댓글은 인증 필수, admin seed는 `requireAdmin()`.

---

## File Structure

**Create:**
- `supabase/migrations/20260527130000_seed_fortune_master.sql` — 2026-05-27 12간지 시드
- `src/app/api/admin/fortune/seed/route.ts` — admin batch Gemini seed
- `src/app/api/fortune/comments/[commentId]/route.ts` — DELETE owner-only
- `src/app/(main)/fortune/FortuneClient.tsx` — client subtree

**Modify:**
- `src/lib/fortune.ts` — RELATION_FORTUNES 추가, FortuneResult.relation 추가
- `src/app/api/fortune/route.ts` — DB lookup + algorithmic fallback
- `src/app/api/fortune/comments/route.ts` — in-memory 제거, DB + lazy upsert
- `src/app/(main)/fortune/page.tsx` — server component shell

---

### Task F1: `lib/fortune.ts` — relation 추가

**Files:**
- Modify: `src/lib/fortune.ts`

- [ ] **Step 1: RELATION_FORTUNES + relation in FortuneResult**

`RELATION_FORTUNES` 배열을 `MONEY_FORTUNES` 뒤에 추가 (12개), `FortuneResult` interface에 `relation: string` 추가, `generateFortune`에 `relation: pick(RELATION_FORTUNES)` 추가.

```typescript
const RELATION_FORTUNES = [
  "오랜 친구와의 연락이 마음을 따뜻하게 해줍니다.",
  "가족에게 먼저 안부 전화를 걸어보세요. 좋은 반응이 있을 거예요.",
  "이웃과의 작은 대화가 하루를 환하게 만듭니다.",
  "오늘은 다른 사람의 이야기를 차분히 들어주면 좋은 인연이 생깁니다.",
  "주변에 도움이 필요한 사람이 있는지 살펴보세요.",
  "감사의 마음을 표현하면 관계가 더 단단해집니다.",
  "오해가 있던 사람과 화해할 기회가 찾아옵니다.",
  "새로운 인연이 의외의 장소에서 시작될 수 있습니다.",
  "함께하는 식사 자리가 깊은 유대감을 가져다줍니다.",
  "작은 선물이나 손편지가 큰 감동을 줄 수 있는 날입니다.",
  "혼자만의 시간을 가지면서 마음을 정리해 보세요.",
  "배우자나 가까운 사람과 따뜻한 시간을 보내기 좋은 날입니다.",
];

export interface FortuneResult {
  date: string;
  zodiac: ZodiacAnimal;
  general: string;
  health: string;
  money: string;
  relation: string;
  score: number;
  luckyColor: string;
  luckyNumber: number;
}

export function generateFortune(date: string, zodiac: ZodiacAnimal): FortuneResult {
  const rand = seededRandom(dateSeed(date, zodiac));
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  return {
    date,
    zodiac,
    general: pick(GENERAL_FORTUNES),
    health: pick(HEALTH_FORTUNES),
    money: pick(MONEY_FORTUNES),
    relation: pick(RELATION_FORTUNES),
    score: Math.floor(rand() * 5) + 1,
    luckyColor: pick(COLORS),
    luckyNumber: Math.floor(rand() * 99) + 1,
  };
}
```

- [ ] **Step 2: typecheck**

Run: `bunx tsc --noEmit`. Expected: 일부 PASS (page.tsx에서 generateFortune 사용처는 relation 추가됐지만 type 호환). info와 다르게 page는 다음 task에서 rewrite하니 잠시 ignore.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fortune.ts
git commit -m "feat(fortune): add relation category to algorithmic engine"
```

---

### Task F2: `h_fortune_master` 시드 마이그레이션

**Files:**
- Create: `supabase/migrations/20260527130000_seed_fortune_master.sql`

- [ ] **Step 1: 12 zodiac seed for 2026-05-27** (algorithmic 본문, stable IDs)

Algorithmic generateFortune(2026-05-27, zodiac) 결과를 미리 산출해서 SQL로 적어도 되지만, deterministic이라 admin seed 후 Gemini로 덮어쓸 예정. 시드는 placeholder로 4 카테고리 텍스트 작성 — 그 후 admin이 Gemini로 update 가능.

```sql
-- Phase 3-A P1-4: seed today's fortune for 12 zodiacs.
-- Algorithmic-style placeholder content; admin can overwrite via /api/admin/fortune/seed.
-- Stable IDs: fortune-{YYYY-MM-DD}-{zodiac}

insert into si_mvp.h_fortune_master (id, date, zodiac, content, health_content, money_content, relation_content) values
  ('fortune-2026-05-27-쥐', '2026-05-27', '쥐',
    '새로운 만남이 당신을 기다리고 있습니다. 마음을 열고 다가가 보세요.',
    '가벼운 산책이 몸과 마음에 활력을 줄 것입니다.',
    '예상치 못한 소득이 생길 수 있는 날입니다.',
    '오랜 친구와의 연락이 마음을 따뜻하게 해줍니다.'),
  ('fortune-2026-05-27-소', '2026-05-27', '소',
    '오랜 친구와의 연락이 좋은 소식을 가져올 수 있습니다.',
    '충분한 수면이 필요한 날입니다. 일찍 쉬세요.',
    '계획적인 소비가 중요한 시기입니다.',
    '가족에게 먼저 안부 전화를 걸어보세요.'),
  ('fortune-2026-05-27-호랑이', '2026-05-27', '호랑이',
    '오늘은 자신을 돌아보는 시간을 가지면 좋겠습니다.',
    '스트레칭을 통해 뭉친 근육을 풀어주세요.',
    '투자보다는 저축에 집중하면 좋겠습니다.',
    '이웃과의 작은 대화가 하루를 환하게 만듭니다.'),
  ('fortune-2026-05-27-토끼', '2026-05-27', '토끼',
    '계획했던 일이 순조롭게 진행될 조짐이 보입니다.',
    '따뜻한 차 한 잔이 컨디션 회복에 도움이 됩니다.',
    '친구의 재테크 조언이 도움이 될 수 있습니다.',
    '오늘은 다른 사람의 이야기를 차분히 들어주세요.'),
  ('fortune-2026-05-27-용', '2026-05-27', '용',
    '작은 변화가 큰 행운을 가져올 수 있는 날입니다.',
    '오늘은 과식을 피하고 가벼운 식사를 권합니다.',
    '금전적인 결정은 신중하게 하세요.',
    '주변에 도움이 필요한 사람이 있는지 살펴보세요.'),
  ('fortune-2026-05-27-뱀', '2026-05-27', '뱀',
    '주변 사람들에게 감사를 표현하면 좋은 기운이 돌아옵니다.',
    '규칙적인 운동 습관을 시작하기 좋은 날입니다.',
    '작은 절약이 큰 보람으로 돌아올 것입니다.',
    '감사의 마음을 표현하면 관계가 더 단단해집니다.'),
  ('fortune-2026-05-27-말', '2026-05-27', '말',
    '새로운 취미 활동을 시작하기 좋은 시기입니다.',
    '심호흡과 명상으로 스트레스를 해소해 보세요.',
    '새로운 수입원을 모색해 보는 것도 좋겠습니다.',
    '오해가 있던 사람과 화해할 기회가 찾아옵니다.'),
  ('fortune-2026-05-27-양', '2026-05-27', '양',
    '가족과 함께하는 시간이 마음에 안정을 가져다줍니다.',
    '비타민이 풍부한 과일을 챙겨 드세요.',
    '오늘은 큰 지출을 피하는 것이 좋습니다.',
    '새로운 인연이 의외의 장소에서 시작될 수 있습니다.'),
  ('fortune-2026-05-27-원숭이', '2026-05-27', '원숭이',
    '오늘은 결단력이 필요한 순간이 올 수 있습니다. 자신을 믿으세요.',
    '무리하지 않는 선에서 가벼운 운동이 도움됩니다.',
    '재정 계획을 재점검하기 좋은 날입니다.',
    '함께하는 식사 자리가 깊은 유대감을 가져다줍니다.'),
  ('fortune-2026-05-27-닭', '2026-05-27', '닭',
    '예상치 못한 곳에서 좋은 기회가 찾아올 수 있습니다.',
    '하루 물 8잔 마시기를 실천해 보세요.',
    '주변의 좋은 정보가 재정에 도움이 됩니다.',
    '작은 선물이나 손편지가 큰 감동을 줄 수 있는 날입니다.'),
  ('fortune-2026-05-27-개', '2026-05-27', '개',
    '차분하게 하루를 시작하면 모든 일이 잘 풀릴 것입니다.',
    '좋은 컨디션이 유지되는 날입니다. 활동적으로 보내세요.',
    '안정적인 재테크가 길게 보면 유리합니다.',
    '혼자만의 시간을 가지면서 마음을 정리해 보세요.'),
  ('fortune-2026-05-27-돼지', '2026-05-27', '돼지',
    '긍정적인 에너지가 넘치는 하루가 될 것입니다.',
    '관절 건강에 신경 쓰시면 좋겠습니다.',
    '소소한 행운이 금전운에 미소를 가져다줍니다.',
    '배우자나 가까운 사람과 따뜻한 시간을 보내기 좋은 날입니다.')
on conflict (id) do nothing;
```

- [ ] **Step 2: 적용 + commit**

```bash
bun run db:setup  # 또는 Supabase Studio SQL Editor
git add supabase/migrations/20260527130000_seed_fortune_master.sql
git commit -m "feat(fortune): seed today's 12 zodiac fortunes (algorithmic baseline)"
```

---

### Task F3: GET `/api/fortune` — DB lookup + algorithmic fallback

**Files:**
- Modify: `src/app/api/fortune/route.ts`

- [ ] **Step 1: 전체 rewrite**

```typescript
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { fortuneMaster } from "@/db/schema";
import { serverError, successResponse, validationError } from "@/lib/api-response";
import { generateFortune, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";

const ZodiacEnum = z.enum(ZODIAC_ANIMALS);
const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date 형식은 YYYY-MM-DD여야 합니다");

const QuerySchema = z.object({
  date: DateSchema.optional(),
  zodiac: ZodiacEnum.optional(),
});

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// 응답 shape: DB row + algorithmic-derived 부가 정보
interface FortuneResponse {
  id: string | null; // DB row 있을 때만 (댓글 endpoint가 사용)
  date: string;
  zodiac: ZodiacAnimal;
  general: string;
  health: string;
  money: string;
  relation: string;
  score: number;
  luckyColor: string;
  luckyNumber: number;
  source: "db" | "algorithm";
}

async function fortuneFor(date: string, zodiac: ZodiacAnimal): Promise<FortuneResponse> {
  const [row] = await db
    .select()
    .from(fortuneMaster)
    .where(and(eq(fortuneMaster.date, date), eq(fortuneMaster.zodiac, zodiac)))
    .limit(1);

  const derived = generateFortune(date, zodiac);

  if (row) {
    return {
      id: row.id,
      date,
      zodiac,
      general: row.content,
      health: row.healthContent ?? derived.health,
      money: row.moneyContent ?? derived.money,
      relation: row.relationContent ?? derived.relation,
      score: derived.score,
      luckyColor: derived.luckyColor,
      luckyNumber: derived.luckyNumber,
      source: "db",
    };
  }

  return { id: null, ...derived, source: "algorithm" };
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    date: sp.get("date") ?? undefined,
    zodiac: sp.get("zodiac") ?? undefined,
  });
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "잘못된 쿼리 파라미터입니다");
  }
  const date = parsed.data.date ?? todayISO();

  try {
    if (parsed.data.zodiac) {
      const fortune = await fortuneFor(date, parsed.data.zodiac);
      return successResponse(fortune);
    }
    // 12 zodiac 전체
    const all = await Promise.all(ZODIAC_ANIMALS.map((z) => fortuneFor(date, z)));
    return successResponse({ date, fortunes: all });
  } catch (err) {
    console.error("[fortune GET]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: typecheck + curl**

```powershell
bunx tsc --noEmit
$base = "http://localhost:3010"
Invoke-RestMethod "$base/api/fortune?zodiac=$([uri]::EscapeDataString('용'))&date=2026-05-27" | ConvertTo-Json -Depth 5
Invoke-RestMethod "$base/api/fortune?zodiac=$([uri]::EscapeDataString('용'))&date=2099-12-31" | ConvertTo-Json -Depth 5
```

Expected:
- 첫 번째: `source: "db"`, `id: "fortune-2026-05-27-용"`, 본문은 시드의 "작은 변화가 큰 행운..."
- 두 번째: `source: "algorithm"`, `id: null`, 본문은 algorithmic deterministic 결과
- 둘 다 score/luckyColor/luckyNumber 존재

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fortune/route.ts
git commit -m "feat(fortune): GET reads DB with algorithmic fallback"
```

---

### Task F4: POST `/api/admin/fortune/seed` — admin batch Gemini seed

**Files:**
- Create: `src/app/api/admin/fortune/seed/route.ts`

- [ ] **Step 1: 새 파일 작성**

```typescript
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { fortuneMaster } from "@/db/schema";
import {
  errorResponse,
  forbiddenError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/is-admin";
import { ZODIAC_ANIMALS } from "@/lib/fortune";
import { generateFortuneContent, isGeminiAvailable } from "@/lib/gemini";

const BodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date 형식은 YYYY-MM-DD여야 합니다"),
});

// POST /api/admin/fortune/seed - 일자별 12간지 Gemini 일괄 시드 (admin)
export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await requireAdmin();
  if (!userId) return unauthorizedError();
  if (!isAdmin) return forbiddenError("관리자만 사용할 수 있습니다");

  if (!isGeminiAvailable()) {
    return errorResponse("GEMINI_UNAVAILABLE", "Gemini API가 설정되지 않았습니다", 503);
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  const { date } = parsed.data;

  const results: Array<{ zodiac: string; status: "inserted" | "updated" | "error"; error?: string }> = [];
  for (const zodiac of ZODIAC_ANIMALS) {
    try {
      const content = await generateFortuneContent(zodiac, date);
      const id = `fortune-${date}-${zodiac}`;
      const [existing] = await db
        .select({ id: fortuneMaster.id })
        .from(fortuneMaster)
        .where(eq(fortuneMaster.id, id))
        .limit(1);

      if (existing) {
        await db
          .update(fortuneMaster)
          .set({
            content: content.general,
            healthContent: content.health,
            moneyContent: content.money,
            relationContent: content.relation,
          })
          .where(eq(fortuneMaster.id, id));
        results.push({ zodiac, status: "updated" });
      } else {
        await db.insert(fortuneMaster).values({
          id,
          date,
          zodiac,
          content: content.general,
          healthContent: content.health,
          moneyContent: content.money,
          relationContent: content.relation,
        });
        results.push({ zodiac, status: "inserted" });
      }
    } catch (err) {
      console.error(`[admin/fortune/seed ${zodiac}]`, err);
      results.push({ zodiac, status: "error", error: err instanceof Error ? err.message : "unknown" });
    }
  }

  const hasError = results.some((r) => r.status === "error");
  return successResponse(
    { date, results, hasError },
    hasError ? 207 : 200
  );
}
```

> Note: 207 Multi-Status로 부분 실패 표시. Gemini 호출 12회 ≈ 30~60초. Vercel 함수 timeout 300s라 안전.

- [ ] **Step 2: typecheck + 401 검증**

```powershell
bunx tsc --noEmit
try { Invoke-RestMethod -Method POST "$base/api/admin/fortune/seed" -ContentType "application/json" -Body '{"date":"2026-05-28"}' } catch { $_.ErrorDetails.Message }
```
Expected: 401 UNAUTHORIZED.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/fortune/seed/route.ts
git commit -m "feat(fortune): admin batch Gemini seed endpoint"
```

---

### Task F5: GET `/api/fortune/comments` — DB + profile JOIN

**Files:**
- Modify: `src/app/api/fortune/comments/route.ts` (GET only this task)

- [ ] **Step 1: GET 교체 (POST는 임시로 legacy)**

```typescript
import { and, asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { fortuneComments, fortuneMaster, profiles } from "@/db/schema";
import { errorResponse as legacyErrorResponse, jsonResponse } from "@/lib/api-utils";
import { serverError, successResponse, validationError } from "@/lib/api-response";
import { ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/fortune/comments?date=YYYY-MM-DD&zodiac=쥐
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const date = sp.get("date");
  const zodiacRaw = sp.get("zodiac");

  if (!date || !DATE_RE.test(date)) {
    return validationError("date 형식은 YYYY-MM-DD여야 합니다");
  }
  if (!zodiacRaw || !(ZODIAC_ANIMALS as readonly string[]).includes(zodiacRaw)) {
    return validationError("유효하지 않은 띠입니다");
  }
  const zodiac = zodiacRaw as ZodiacAnimal;

  try {
    const [fortune] = await db
      .select({ id: fortuneMaster.id })
      .from(fortuneMaster)
      .where(and(eq(fortuneMaster.date, date), eq(fortuneMaster.zodiac, zodiac)))
      .limit(1);

    if (!fortune) {
      // 댓글 없을 가능성 100% (FK 때문에 fortune 없으면 comment 없음)
      return successResponse({ fortuneId: null, date, zodiac, comments: [] });
    }

    const rows = await db
      .select({
        id: fortuneComments.id,
        fortuneId: fortuneComments.fortuneId,
        userId: fortuneComments.userId,
        comment: fortuneComments.comment,
        region: fortuneComments.region,
        createdAt: fortuneComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(fortuneComments)
      .leftJoin(profiles, eq(fortuneComments.userId, profiles.id))
      .where(eq(fortuneComments.fortuneId, fortune.id))
      .orderBy(asc(fortuneComments.createdAt));

    return successResponse({ fortuneId: fortune.id, date, zodiac, comments: rows });
  } catch (err) {
    console.error("[fortune comments GET]", err);
    return serverError();
  }
}

// POST 임시 legacy — Task F6에서 교체
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fortuneKey = body.fortuneKey as string | undefined;
    const comment = body.comment as string | undefined;
    if (!fortuneKey || !comment) return legacyErrorResponse("fortuneKey and comment are required");
    return jsonResponse(
      { id: crypto.randomUUID(), fortuneKey, userId: "anonymous", nickname: "익명", comment, createdAt: new Date().toISOString() },
      201
    );
  } catch {
    return legacyErrorResponse("잘못된 요청입니다");
  }
}
```

- [ ] **Step 2: typecheck + curl**

```powershell
bunx tsc --noEmit
Invoke-RestMethod "$base/api/fortune/comments?date=2026-05-27&zodiac=$([uri]::EscapeDataString('용'))" | ConvertTo-Json -Depth 4
```
Expected: `success: true`, `fortuneId: "fortune-2026-05-27-용"`, `comments: []`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fortune/comments/route.ts
git commit -m "feat(fortune): wire GET comments to DB with profile join"
```

---

### Task F6: POST `/api/fortune/comments` — lazy upsert + auth

**Files:**
- Modify: `src/app/api/fortune/comments/route.ts` (POST 교체, legacy import 제거)

- [ ] **Step 1: POST 교체 — 최종 파일**

```typescript
import { and, asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { fortuneComments, fortuneMaster, profiles } from "@/db/schema";
import {
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { generateFortune, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PostBodySchema = z.object({
  date: z.string().regex(DATE_RE),
  zodiac: z.enum(ZODIAC_ANIMALS),
  comment: z.string().trim().min(1).max(500),
  region: z.string().trim().min(1).max(20).optional(),
});

// GET /api/fortune/comments?date=YYYY-MM-DD&zodiac=쥐 — F5와 동일
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const date = sp.get("date");
  const zodiacRaw = sp.get("zodiac");

  if (!date || !DATE_RE.test(date)) {
    return validationError("date 형식은 YYYY-MM-DD여야 합니다");
  }
  if (!zodiacRaw || !(ZODIAC_ANIMALS as readonly string[]).includes(zodiacRaw)) {
    return validationError("유효하지 않은 띠입니다");
  }
  const zodiac = zodiacRaw as ZodiacAnimal;

  try {
    const [fortune] = await db
      .select({ id: fortuneMaster.id })
      .from(fortuneMaster)
      .where(and(eq(fortuneMaster.date, date), eq(fortuneMaster.zodiac, zodiac)))
      .limit(1);

    if (!fortune) {
      return successResponse({ fortuneId: null, date, zodiac, comments: [] });
    }

    const rows = await db
      .select({
        id: fortuneComments.id,
        fortuneId: fortuneComments.fortuneId,
        userId: fortuneComments.userId,
        comment: fortuneComments.comment,
        region: fortuneComments.region,
        createdAt: fortuneComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(fortuneComments)
      .leftJoin(profiles, eq(fortuneComments.userId, profiles.id))
      .where(eq(fortuneComments.fortuneId, fortune.id))
      .orderBy(asc(fortuneComments.createdAt));

    return successResponse({ fortuneId: fortune.id, date, zodiac, comments: rows });
  } catch (err) {
    console.error("[fortune comments GET]", err);
    return serverError();
  }
}

// POST /api/fortune/comments - lazy upsert + auth
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = PostBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  const { date, zodiac, comment, region } = parsed.data;

  try {
    const fortuneId = `fortune-${date}-${zodiac}`;

    // Lazy upsert: fortune row 없으면 algorithmic 본문으로 즉시 INSERT
    const [existing] = await db
      .select({ id: fortuneMaster.id })
      .from(fortuneMaster)
      .where(eq(fortuneMaster.id, fortuneId))
      .limit(1);

    if (!existing) {
      const algo = generateFortune(date, zodiac);
      try {
        await db.insert(fortuneMaster).values({
          id: fortuneId,
          date,
          zodiac,
          content: algo.general,
          healthContent: algo.health,
          moneyContent: algo.money,
          relationContent: algo.relation,
        });
      } catch (err) {
        // 동시 race로 누가 먼저 INSERT한 경우 무시 (FK가 결국 OK)
        console.warn("[fortune lazy upsert]", err);
      }
    }

    const commentId = crypto.randomUUID();
    await db.insert(fortuneComments).values({
      id: commentId,
      fortuneId,
      userId: user.id,
      comment,
      region: region ?? null,
    });

    const [created] = await db
      .select({
        id: fortuneComments.id,
        fortuneId: fortuneComments.fortuneId,
        userId: fortuneComments.userId,
        comment: fortuneComments.comment,
        region: fortuneComments.region,
        createdAt: fortuneComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(fortuneComments)
      .leftJoin(profiles, eq(fortuneComments.userId, profiles.id))
      .where(eq(fortuneComments.id, commentId))
      .limit(1);

    if (!created) return notFoundError("댓글 작성 후 조회 실패");
    return successResponse(created, 201);
  } catch (err) {
    console.error("[fortune comments POST]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: typecheck + lint + 401 검증**

```powershell
bunx tsc --noEmit
bun run lint
try { Invoke-RestMethod -Method POST "$base/api/fortune/comments" -ContentType "application/json" -Body (@{date="2026-05-27";zodiac="용";comment="테스트"} | ConvertTo-Json) } catch { $_.ErrorDetails.Message }
```
Expected: PASS / 401.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fortune/comments/route.ts
git commit -m "feat(fortune): POST comment with lazy upsert + auth + join"
```

---

### Task F7: DELETE `/api/fortune/comments/[commentId]` — owner-only

**Files:**
- Create: `src/app/api/fortune/comments/[commentId]/route.ts`

- [ ] **Step 1: 새 파일 작성**

```typescript
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { fortuneComments } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/fortune/comments/[commentId] - 본인 댓글만 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [existing] = await db
      .select({ userId: fortuneComments.userId })
      .from(fortuneComments)
      .where(eq(fortuneComments.id, commentId))
      .limit(1);
    if (!existing) return notFoundError("댓글을 찾을 수 없습니다");
    if (existing.userId !== user.id) {
      return forbiddenError("본인이 작성한 댓글만 삭제할 수 있습니다");
    }

    await db.delete(fortuneComments).where(eq(fortuneComments.id, commentId));
    return successResponse({ deleted: true, id: commentId });
  } catch (err) {
    console.error("[fortune comment DELETE]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: typecheck + 401**

```powershell
bunx tsc --noEmit
try { Invoke-RestMethod -Method DELETE "$base/api/fortune/comments/fake" } catch { $_.ErrorDetails.Message }
```
Expected: 401.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fortune/comments/[commentId]/route.ts
git commit -m "feat(fortune): DELETE comment endpoint (owner only)"
```

---

### Task F8: `/fortune` page — server + `FortuneClient`

**Files:**
- Modify: `src/app/(main)/fortune/page.tsx`
- Create: `src/app/(main)/fortune/FortuneClient.tsx`

- [ ] **Step 1: FortuneClient.tsx — client subtree**

```tsx
// src/app/(main)/fortune/FortuneClient.tsx
"use client";

import {
  ChatCircle,
  ClockCounterClockwise,
  ShareNetwork,
  Sparkle,
  Star,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type FortuneResult,
  generateFortune,
  getZodiacEmoji,
  ZODIAC_ANIMALS,
  type ZodiacAnimal,
} from "@/lib/fortune";

interface FortuneApiResponse {
  id: string | null;
  date: string;
  zodiac: ZodiacAnimal;
  general: string;
  health: string;
  money: string;
  relation: string;
  score: number;
  luckyColor: string;
  luckyNumber: number;
  source: "db" | "algorithm";
}

interface CommentRow {
  id: string;
  comment: string;
  region: string | null;
  userId: string | null;
  createdAt: string | null;
  authorNickname: string | null;
  authorAvatarUrl: string | null;
}

interface Props {
  defaultZodiac: ZodiacAnimal;
  currentUserId: string | null;
}

const SCORE_STARS = [1, 2, 3, 4, 5] as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function last7Dates(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${score}점 만점에 5점`}>
      {SCORE_STARS.map((s) => (
        <Star
          key={s}
          size={22}
          weight={s <= score ? "fill" : "regular"}
          className={s <= score ? "text-[var(--color-warning)]" : "text-mocha-200"}
        />
      ))}
    </div>
  );
}

export function FortuneClient({ defaultZodiac, currentUserId }: Props) {
  const [zodiac, setZodiac] = useState<ZodiacAnimal>(defaultZodiac);
  const [tab, setTab] = useState("today");
  const [today, setToday] = useState<FortuneApiResponse | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = todayISO();

  // today fortune fetch
  useEffect(() => {
    let cancelled = false;
    setTodayLoading(true);
    setError(null);
    (async () => {
      try {
        const url = `/api/fortune?zodiac=${encodeURIComponent(zodiac)}&date=${date}`;
        const res = await fetch(url);
        const json = (await res.json()) as
          | { success: true; data: FortuneApiResponse }
          | { success: false; error: { message: string } };
        if (cancelled) return;
        if (json.success) setToday(json.data);
        else setError(json.error.message);
      } catch {
        if (!cancelled) setError("운세를 불러오지 못했습니다");
      } finally {
        if (!cancelled) setTodayLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zodiac, date]);

  // comments fetch (when tab active)
  useEffect(() => {
    if (tab !== "comments") return;
    let cancelled = false;
    setCommentsLoading(true);
    (async () => {
      try {
        const url = `/api/fortune/comments?zodiac=${encodeURIComponent(zodiac)}&date=${date}`;
        const res = await fetch(url);
        const json = (await res.json()) as
          | { success: true; data: { comments: CommentRow[] } }
          | { success: false; error: { message: string } };
        if (cancelled) return;
        if (json.success) setComments(json.data.comments);
      } catch {
        // 무시 (UI에 빈 배열 유지)
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, zodiac, date]);

  const handleShare = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.share || !today) return;
    navigator
      .share({
        title: `${zodiac}띠 오늘의 운세`,
        text: today.general,
        url: window.location.href,
      })
      .catch(() => {});
  }, [today, zodiac]);

  const handleSubmitComment = async () => {
    const text = commentInput.trim();
    if (!text || commentSubmitting) return;
    setCommentSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/fortune/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, zodiac, comment: text }),
      });
      const json = (await res.json()) as
        | { success: true; data: CommentRow }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setComments((prev) => [...prev, json.data]);
      setCommentInput("");
    } catch {
      setError("댓글 작성에 실패했습니다");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/fortune/comments/${id}`, { method: "DELETE" });
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
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-2 pt-2">
        <Sparkle size={32} weight="fill" className="text-coral-500" />
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">오늘의 운세</h1>
      </div>

      {/* zodiac selector */}
      <div className="-mx-5 overflow-x-auto pb-1">
        <div className="flex gap-2 px-5">
          {ZODIAC_ANIMALS.map((z) => {
            const active = zodiac === z;
            return (
              <button
                key={z}
                type="button"
                onClick={() => setZodiac(z)}
                aria-pressed={active}
                className={`shrink-0 min-h-[48px] rounded-full border-2 px-4 text-base font-bold transition-all active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                  active
                    ? "bg-coral-500 border-coral-500 text-white shadow-warm"
                    : "bg-white border-mocha-200 text-mocha-900 hover:border-coral-400"
                }`}
              >
                <span aria-hidden="true" className="mr-1">
                  {getZodiacEmoji(z)}
                </span>
                {z}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">
            <Star size={20} weight="duotone" className="mr-1" /> 오늘
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1">
            <ChatCircle size={20} weight="duotone" className="mr-1" /> 댓글
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <ClockCounterClockwise size={20} weight="duotone" className="mr-1" /> 지난주
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todayLoading || !today ? (
            <Card>
              <CardContent className="p-6 text-mocha-500">운세를 불러오는 중...</CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-coral-100">
              <div className="bg-gradient-to-br from-coral-50 via-cream-100 to-sage-50 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-4xl shadow-soft">
                    {getZodiacEmoji(zodiac)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-extrabold text-mocha-900 tracking-tight">
                      {zodiac}띠 운세
                    </h3>
                    <p className="mt-0.5 text-base font-semibold text-mocha-700">{today.date}</p>
                    <div className="mt-2">
                      <ScoreStars score={today.score} />
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="space-y-5 p-6">
                <div>
                  <Badge className="mb-2">종합운</Badge>
                  <p className="text-lg text-mocha-900 leading-relaxed">{today.general}</p>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-2">건강운</Badge>
                  <p className="text-lg text-mocha-900 leading-relaxed">{today.health}</p>
                </div>
                <div>
                  <Badge variant="cream" className="mb-2">금전운</Badge>
                  <p className="text-lg text-mocha-900 leading-relaxed">{today.money}</p>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">대인운</Badge>
                  <p className="text-lg text-mocha-900 leading-relaxed">{today.relation}</p>
                </div>
                <div className="flex flex-wrap gap-4 border-t border-mocha-100 pt-4 text-base">
                  <span className="text-mocha-700">
                    행운의 색:{" "}
                    <strong className="font-extrabold text-mocha-900">{today.luckyColor}</strong>
                  </span>
                  <span className="text-mocha-700">
                    행운의 숫자:{" "}
                    <strong className="font-extrabold text-mocha-900">{today.luckyNumber}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          <Button variant="outline" size="lg" className="w-full" onClick={handleShare}>
            <ShareNetwork size={24} weight="bold" />
            운세 공유하기
          </Button>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                <span aria-hidden="true" className="mr-1">{getZodiacEmoji(zodiac)}</span>
                {zodiac}띠 댓글방
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
              <div className="space-y-3">
                {commentsLoading ? (
                  <p className="text-sm text-mocha-500">댓글을 불러오는 중...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-mocha-500">첫 댓글을 남겨보세요.</p>
                ) : (
                  comments.map((c) => {
                    const author = c.authorNickname ?? "익명";
                    const initial = author.charAt(0);
                    const date2 = c.createdAt
                      ? new Date(c.createdAt).toLocaleDateString("ko-KR")
                      : "";
                    const isMine = currentUserId !== null && c.userId === currentUserId;
                    return (
                      <div key={c.id} className="flex gap-3 rounded-2xl bg-cream-100 p-4">
                        <Avatar className="h-9 w-9">
                          {c.authorAvatarUrl && (
                            <AvatarImage src={c.authorAvatarUrl} alt={author} />
                          )}
                          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-bold text-mocha-900">{author}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-mocha-500">{date2}</span>
                              {isMine && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-xs text-mocha-400 hover:text-[var(--color-danger)]"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="mt-1.5 text-base text-mocha-800 leading-relaxed whitespace-pre-wrap">
                            {c.comment}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {currentUserId ? (
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="댓글을 입력해주세요"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    maxLength={500}
                  />
                  <Button onClick={handleSubmitComment} disabled={!commentInput.trim() || commentSubmitting}>
                    {commentSubmitting ? "작성 중" : "작성"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-mocha-500">댓글을 작성하려면 로그인이 필요합니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {last7Dates().map((d) => {
            const f: FortuneResult = generateFortune(d, zodiac);
            return (
              <Card key={d} className="transition-all hover:border-coral-200 hover:shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-mocha-900">{d}</p>
                      <p className="mt-1 text-base text-mocha-700 leading-relaxed line-clamp-1">
                        {f.general}
                      </p>
                    </div>
                    <ScoreStars score={f.score} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

> 주: history 탭은 client-side algorithmic generation을 그대로 유지 (DB round-trip 7회 회피).

- [ ] **Step 2: page.tsx — server component shell**

```tsx
// src/app/(main)/fortune/page.tsx
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getZodiacFromBirthYear, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";
import { FortuneClient } from "./FortuneClient";

export default async function FortunePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let defaultZodiac: ZodiacAnimal = "용";
  if (user) {
    const [p] = await db
      .select({ birthYear: profiles.birthYear })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (p?.birthYear) {
      defaultZodiac = getZodiacFromBirthYear(p.birthYear) as ZodiacAnimal;
    }
  }

  return <FortuneClient defaultZodiac={defaultZodiac} currentUserId={user?.id ?? null} />;
}
```

- [ ] **Step 3: typecheck + lint**

```bash
bunx tsc --noEmit
bun run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/fortune/page.tsx src/app/(main)/fortune/FortuneClient.tsx
git commit -m "feat(fortune): page server + FortuneClient subtree"
```

---

## Self-Review

**Spec coverage:**
- Phase 3-A P1-4 (운세 DB 저장): F2, F3, F4 ✓
- 댓글 영속화 (fortune): F5, F6, F7 ✓
- /fortune page server 전환: F8 ✓

**Type consistency:**
- `FortuneApiResponse` (client) = GET 응답 shape — F3/F8 일치
- `CommentRow` = comments JOIN shape — F5/F6/F8 일치
- `ZodiacAnimal` = `lib/fortune.ts`의 union — 전 task 공통

**Placeholder scan:** TBD/TODO 없음.

**Race/correctness:**
- Lazy upsert: 동시 race는 `try/catch + console.warn`로 swallow. 두 번째 request의 INSERT 실패해도 첫 번째가 row 보장. comment INSERT는 FK 만족.
- viewCount equivalent 없음 (운세는 view 추적 안 함).

**제외 항목 명시:** Vercel Cron, URL searchParams zodiac, 추가 인터랙션 — 명시됨.

---

## Execution Handoff

**Plan saved. Inline execution (info plan과 동일 흐름) 진행.**
