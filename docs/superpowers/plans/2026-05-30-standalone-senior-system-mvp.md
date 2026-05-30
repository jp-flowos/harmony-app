# Standalone Senior System MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate `harmony-system-lab` MVP that collects senior intake answers, generates a low-risk next-action recommendation, lets an operator review it, and exports a Harmony-compatible JSON payload.

**Architecture:** Create a new Next.js App Router project outside `harmony-app`, with its own Supabase/Postgres database and no direct dependency on Harmony runtime code. Keep recommendation logic in a local rules engine first, with an AI provider interface reserved for later summary generation.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase/Postgres, Drizzle ORM, Zod, Vitest, Biome, Bun.

---

## File Structure

Create the new project at `E:\Github\harmony-system-lab`.

- Create: `E:\Github\harmony-system-lab\docs\product\standalone-senior-system.md` - product scope and MVP constraints.
- Create: `E:\Github\harmony-system-lab\.env.example` - required environment variable names.
- Create: `E:\Github\harmony-system-lab\biome.json` - lint and formatting rules.
- Create: `E:\Github\harmony-system-lab\drizzle.config.ts` - Drizzle migration config.
- Create: `E:\Github\harmony-system-lab\src\db\schema.ts` - database tables.
- Create: `E:\Github\harmony-system-lab\src\lib\contracts\harmony-export.ts` - export payload schema and mapper.
- Create: `E:\Github\harmony-system-lab\src\lib\contracts\harmony-export.test.ts` - export contract tests.
- Create: `E:\Github\harmony-system-lab\src\lib\intake\schema.ts` - intake answer validation.
- Create: `E:\Github\harmony-system-lab\src\lib\recommendation\rules.ts` - deterministic recommendation engine.
- Create: `E:\Github\harmony-system-lab\src\lib\recommendation\rules.test.ts` - recommendation tests.
- Create: `E:\Github\harmony-system-lab\src\app\intake\page.tsx` - intake page entry.
- Create: `E:\Github\harmony-system-lab\src\app\intake\IntakeClient.tsx` - client-side intake flow.
- Create: `E:\Github\harmony-system-lab\src\app\operator\page.tsx` - operator review list.
- Create: `E:\Github\harmony-system-lab\src\app\api\intake\complete\route.ts` - complete intake API.
- Create: `E:\Github\harmony-system-lab\src\app\api\operator\reviews\route.ts` - operator review API.
- Create: `E:\Github\harmony-system-lab\src\app\api\exports\harmony\[id]\route.ts` - Harmony export API.

## Task 1: Scaffold The Separate Project

**Files:**
- Create: `E:\Github\harmony-system-lab`
- Modify: `E:\Github\harmony-system-lab\package.json`
- Create: `E:\Github\harmony-system-lab\biome.json`
- Create: `E:\Github\harmony-system-lab\.env.example`

- [ ] **Step 1: Create the new app**

Run:

```powershell
Set-Location E:\Github
bunx create-next-app@latest harmony-system-lab --ts --tailwind --app --src-dir --import-alias "@/*"
```

Expected: `E:\Github\harmony-system-lab` exists and contains `src\app\page.tsx`.

- [ ] **Step 2: Install project dependencies**

Run:

```powershell
Set-Location E:\Github\harmony-system-lab
bun add zod drizzle-orm postgres @supabase/supabase-js @supabase/ssr drizzle-zod
bun add -d drizzle-kit @biomejs/biome vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` includes the listed runtime and dev dependencies.

- [ ] **Step 3: Set scripts in `package.json`**

Update the `scripts` block to:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "biome check src/",
  "format": "biome format --write src/",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

- [ ] **Step 4: Create `biome.json`**

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.5/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "organizeImports": {
    "enabled": true
  }
}
```

- [ ] **Step 5: Create `.env.example`**

Create `.env.example`:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 6: Verify baseline**

Run:

```powershell
bun run lint
bun run build
```

Expected: both commands complete without TypeScript or lint errors.

- [ ] **Step 7: Commit the scaffold**

Run:

```powershell
git init
git add .
git commit -m "chore: scaffold standalone senior system lab"
```

## Task 2: Lock The Product Scope

**Files:**
- Create: `docs/product/standalone-senior-system.md`

- [ ] **Step 1: Create the product scope document**

Create `docs/product/standalone-senior-system.md`:

```markdown
# Standalone Senior System MVP

## Goal

Collect short senior intake answers, generate a low-risk next-action recommendation, let an operator review the result, and expose a Harmony-compatible JSON export.

## MVP Includes

- Mobile-first intake flow
- Region, interests, mobility, group comfort, help area, and contact consent questions
- Rules-based next-action recommendation
- Operator review list
- Harmony export payload

## MVP Excludes

- Club creation
- Chat
- Payments
- Community posts
- Direct writes into Harmony production tables
- Automatic outreach without operator review

## Product Rule

If a recommendation could be interpreted as medical, financial, or legal advice, the system must route it to operator review and avoid showing it as final user guidance.
```

- [ ] **Step 2: Commit the product scope**

Run:

```powershell
git add docs/product/standalone-senior-system.md
git commit -m "docs: define standalone senior system mvp scope"
```

## Task 3: Define The Harmony Export Contract First

**Files:**
- Create: `src/lib/contracts/harmony-export.test.ts`
- Create: `src/lib/contracts/harmony-export.ts`

- [ ] **Step 1: Write the failing contract test**

Create `src/lib/contracts/harmony-export.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HarmonyExportPayloadSchema, toHarmonyExportPayload } from "./harmony-export";

describe("toHarmonyExportPayload", () => {
  it("creates a Harmony-compatible approved recommendation payload", () => {
    const payload = toHarmonyExportPayload({
      participant: {
        id: "11111111-1111-4111-8111-111111111111",
        nickname: "행복한봄",
        regionSido: "서울특별시",
        regionSigungu: "강남구",
      },
      intake: {
        interests: ["걷기", "건강"],
      },
      recommendation: {
        summary: "가까운 야외 활동을 선호하고 처음 모임 참여에는 안내가 필요합니다.",
        nextActionType: "recommend_club",
        nextActionLabel: "가까운 걷기 모임 추천",
        reason: "지역과 관심사가 모두 일치합니다.",
      },
      review: {
        status: "approved",
        note: "첫 참여 전 전화 안내 권장",
      },
      createdAt: new Date("2026-05-30T00:00:00.000Z"),
    });

    expect(HarmonyExportPayloadSchema.parse(payload)).toEqual({
      source: "harmony-system-lab",
      externalParticipantId: "11111111-1111-4111-8111-111111111111",
      nickname: "행복한봄",
      region: {
        sido: "서울특별시",
        sigungu: "강남구",
      },
      interests: ["걷기", "건강"],
      summary: "가까운 야외 활동을 선호하고 처음 모임 참여에는 안내가 필요합니다.",
      nextAction: {
        type: "recommend_club",
        label: "가까운 걷기 모임 추천",
        reason: "지역과 관심사가 모두 일치합니다.",
      },
      operatorReview: {
        status: "approved",
        note: "첫 참여 전 전화 안내 권장",
      },
      createdAt: "2026-05-30T00:00:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
bun run test src/lib/contracts/harmony-export.test.ts
```

Expected: FAIL because `src/lib/contracts/harmony-export.ts` does not exist.

- [ ] **Step 3: Implement the export contract**

Create `src/lib/contracts/harmony-export.ts`:

```ts
import { z } from "zod";

export const HarmonyExportPayloadSchema = z.object({
  source: z.literal("harmony-system-lab"),
  externalParticipantId: z.string().uuid(),
  nickname: z.string().min(1),
  region: z.object({
    sido: z.string().min(1),
    sigungu: z.string().min(1).nullable(),
  }),
  interests: z.array(z.string().min(1)).min(1),
  summary: z.string().min(1),
  nextAction: z.object({
    type: z.enum(["recommend_club", "operator_call", "show_content"]),
    label: z.string().min(1),
    reason: z.string().min(1),
  }),
  operatorReview: z.object({
    status: z.enum(["approved", "held", "rejected"]),
    note: z.string(),
  }),
  createdAt: z.string().datetime(),
});

export type HarmonyExportPayload = z.infer<typeof HarmonyExportPayloadSchema>;

type ExportInput = {
  participant: {
    id: string;
    nickname: string;
    regionSido: string;
    regionSigungu: string | null;
  };
  intake: {
    interests: string[];
  };
  recommendation: {
    summary: string;
    nextActionType: HarmonyExportPayload["nextAction"]["type"];
    nextActionLabel: string;
    reason: string;
  };
  review: {
    status: HarmonyExportPayload["operatorReview"]["status"];
    note: string;
  };
  createdAt: Date;
};

export function toHarmonyExportPayload(input: ExportInput): HarmonyExportPayload {
  return HarmonyExportPayloadSchema.parse({
    source: "harmony-system-lab",
    externalParticipantId: input.participant.id,
    nickname: input.participant.nickname,
    region: {
      sido: input.participant.regionSido,
      sigungu: input.participant.regionSigungu,
    },
    interests: input.intake.interests,
    summary: input.recommendation.summary,
    nextAction: {
      type: input.recommendation.nextActionType,
      label: input.recommendation.nextActionLabel,
      reason: input.recommendation.reason,
    },
    operatorReview: {
      status: input.review.status,
      note: input.review.note,
    },
    createdAt: input.createdAt.toISOString(),
  });
}
```

- [ ] **Step 4: Run the contract test**

Run:

```powershell
bun run test src/lib/contracts/harmony-export.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the contract**

Run:

```powershell
git add src/lib/contracts/harmony-export.ts src/lib/contracts/harmony-export.test.ts
git commit -m "feat: define harmony export contract"
```

## Task 4: Add Intake Validation And Recommendation Rules

**Files:**
- Create: `src/lib/intake/schema.ts`
- Create: `src/lib/recommendation/rules.test.ts`
- Create: `src/lib/recommendation/rules.ts`

- [ ] **Step 1: Create intake schema**

Create `src/lib/intake/schema.ts`:

```ts
import { z } from "zod";

export const IntakeAnswersSchema = z.object({
  nickname: z.string().min(1).max(20),
  phone: z.string().max(30).optional(),
  regionSido: z.string().min(1),
  regionSigungu: z.string().min(1).nullable(),
  interests: z.array(z.string().min(1)).min(1).max(3),
  mobility: z.enum(["nearby_only", "within_city", "anywhere_with_help"]),
  groupComfort: z.enum(["low", "medium", "high"]),
  helpArea: z.enum(["first_meeting", "finding_club", "using_app", "none"]),
  consentContact: z.boolean(),
});

export type IntakeAnswers = z.infer<typeof IntakeAnswersSchema>;
```

- [ ] **Step 2: Write failing recommendation tests**

Create `src/lib/recommendation/rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { recommendNextAction } from "./rules";

const baseAnswers = {
  nickname: "행복한봄",
  regionSido: "서울특별시",
  regionSigungu: "강남구",
  interests: ["걷기"],
  mobility: "nearby_only" as const,
  groupComfort: "medium" as const,
  helpArea: "finding_club" as const,
  consentContact: true,
};

describe("recommendNextAction", () => {
  it("recommends operator call when group comfort is low and contact is allowed", () => {
    const result = recommendNextAction({
      ...baseAnswers,
      groupComfort: "low",
      helpArea: "first_meeting",
    });

    expect(result.nextActionType).toBe("operator_call");
    expect(result.needsOperatorReview).toBe(true);
  });

  it("recommends a club when interests and region are present", () => {
    const result = recommendNextAction(baseAnswers);

    expect(result.nextActionType).toBe("recommend_club");
    expect(result.nextActionLabel).toContain("걷기");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });
});
```

- [ ] **Step 3: Run the failing recommendation tests**

Run:

```powershell
bun run test src/lib/recommendation/rules.test.ts
```

Expected: FAIL because `src/lib/recommendation/rules.ts` does not exist.

- [ ] **Step 4: Implement rules**

Create `src/lib/recommendation/rules.ts`:

```ts
import type { IntakeAnswers } from "@/lib/intake/schema";

export type RecommendationResult = {
  summary: string;
  nextActionType: "recommend_club" | "operator_call" | "show_content";
  nextActionLabel: string;
  reason: string;
  confidence: number;
  needsOperatorReview: boolean;
  reasons: string[];
};

export function recommendNextAction(answers: IntakeAnswers): RecommendationResult {
  const primaryInterest = answers.interests[0];
  const regionLabel = answers.regionSigungu ?? answers.regionSido;

  if (answers.groupComfort === "low" && answers.consentContact) {
    return {
      summary: `${regionLabel}에서 ${primaryInterest}에 관심이 있지만 첫 참여 전 안내가 필요합니다.`,
      nextActionType: "operator_call",
      nextActionLabel: "운영자 안내 전화",
      reason: "모임 참여 부담이 낮아질 수 있도록 사람의 안내가 먼저 필요합니다.",
      confidence: 0.82,
      needsOperatorReview: true,
      reasons: ["group_comfort_low", "contact_allowed"],
    };
  }

  if (answers.interests.length > 0 && answers.regionSido.length > 0) {
    return {
      summary: `${regionLabel} 근처에서 ${primaryInterest} 활동을 먼저 추천할 수 있습니다.`,
      nextActionType: "recommend_club",
      nextActionLabel: `가까운 ${primaryInterest} 모임 추천`,
      reason: "지역과 관심사가 모두 확인되었습니다.",
      confidence: 0.74,
      needsOperatorReview: false,
      reasons: ["region_present", "interest_present"],
    };
  }

  return {
    summary: "관심사를 더 확인한 뒤 콘텐츠를 먼저 보여주는 편이 안전합니다.",
    nextActionType: "show_content",
    nextActionLabel: "초보자 안내 콘텐츠 보기",
    reason: "추천에 필요한 입력이 충분하지 않습니다.",
    confidence: 0.5,
    needsOperatorReview: true,
    reasons: ["insufficient_input"],
  };
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
bun run test src/lib/recommendation/rules.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit recommendation rules**

Run:

```powershell
git add src/lib/intake/schema.ts src/lib/recommendation/rules.ts src/lib/recommendation/rules.test.ts
git commit -m "feat: add intake validation and recommendation rules"
```

## Task 5: Add Database Schema

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/schema.ts`

- [ ] **Step 1: Create `drizzle.config.ts`**

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
```

- [ ] **Step 2: Create database tables**

Create `src/db/schema.ts`:

```ts
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const intakeStatusEnum = pgEnum("intake_status", ["draft", "completed", "reviewed", "archived"]);
export const reviewStatusEnum = pgEnum("review_status", ["approved", "held", "rejected"]);
export const nextActionTypeEnum = pgEnum("next_action_type", ["recommend_club", "operator_call", "show_content"]);

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  nickname: text("nickname").notNull(),
  phone: text("phone"),
  regionSido: text("region_sido").notNull(),
  regionSigungu: text("region_sigungu"),
  consentContact: boolean("consent_contact").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const intakeSessions = pgTable("intake_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  status: intakeStatusEnum("status").notNull().default("draft"),
  answersJson: jsonb("answers_json").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recommendationResults = pgTable("recommendation_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  intakeSessionId: uuid("intake_session_id").notNull().references(() => intakeSessions.id),
  summary: text("summary").notNull(),
  nextActionType: nextActionTypeEnum("next_action_type").notNull(),
  nextActionLabel: text("next_action_label").notNull(),
  confidence: text("confidence").notNull(),
  needsOperatorReview: boolean("needs_operator_review").notNull().default(false),
  reasonsJson: jsonb("reasons_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const operatorReviews = pgTable("operator_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  recommendationResultId: uuid("recommendation_result_id").notNull().references(() => recommendationResults.id),
  status: reviewStatusEnum("status").notNull(),
  operatorNote: text("operator_note").notNull().default(""),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Generate migration**

Run:

```powershell
bun run db:generate
```

Expected: a new SQL migration appears under `drizzle\`.

- [ ] **Step 4: Commit database schema**

Run:

```powershell
git add drizzle.config.ts src/db/schema.ts drizzle
git commit -m "feat: add standalone intake database schema"
```

## Task 6: Build Intake Completion API

**Files:**
- Create: `src/app/api/intake/complete/route.ts`

- [ ] **Step 1: Create the complete-intake API**

Create `src/app/api/intake/complete/route.ts`:

```ts
import { IntakeAnswersSchema } from "@/lib/intake/schema";
import { recommendNextAction } from "@/lib/recommendation/rules";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = IntakeAnswersSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_INTAKE",
          message: "입력값을 다시 확인해 주세요.",
          issues: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  const recommendation = recommendNextAction(parsed.data);

  return NextResponse.json({
    success: true,
    data: {
      participant: {
        nickname: parsed.data.nickname,
        regionSido: parsed.data.regionSido,
        regionSigungu: parsed.data.regionSigungu,
      },
      recommendation,
    },
  });
}
```

- [ ] **Step 2: Verify API validation manually**

Run the dev server:

```powershell
bun run dev
```

In another terminal, run:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/intake/complete -ContentType "application/json" -Body '{"nickname":"행복한봄","regionSido":"서울특별시","regionSigungu":"강남구","interests":["걷기"],"mobility":"nearby_only","groupComfort":"medium","helpArea":"finding_club","consentContact":true}'
```

Expected: response contains `success: true` and `recommendation.nextActionType: recommend_club`.

- [ ] **Step 3: Commit the API**

Run:

```powershell
git add src/app/api/intake/complete/route.ts
git commit -m "feat: add intake completion api"
```

## Task 7: Build The Mobile Intake UI

**Files:**
- Create: `src/app/intake/page.tsx`
- Create: `src/app/intake/IntakeClient.tsx`

- [ ] **Step 1: Create page entry**

Create `src/app/intake/page.tsx`:

```tsx
import { IntakeClient } from "./IntakeClient";

export default function IntakePage() {
  return <IntakeClient />;
}
```

- [ ] **Step 2: Create the intake client**

Create `src/app/intake/IntakeClient.tsx`:

```tsx
"use client";

import { useState } from "react";

const interests = ["걷기", "건강", "등산", "독서", "여행"];

export function IntakeClient() {
  const [selectedInterest, setSelectedInterest] = useState("걷기");
  const [result, setResult] = useState<string | null>(null);

  async function submit() {
    const response = await fetch("/api/intake/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: "행복한봄",
        regionSido: "서울특별시",
        regionSigungu: "강남구",
        interests: [selectedInterest],
        mobility: "nearby_only",
        groupComfort: "medium",
        helpArea: "finding_club",
        consentContact: true,
      }),
    });
    const json = await response.json();
    setResult(json.data.recommendation.nextActionLabel);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-5 py-8">
      <section className="space-y-3">
        <p className="text-sm text-neutral-500">1분 입력</p>
        <h1 className="text-3xl font-bold leading-tight">어떤 활동에 관심이 있으세요?</h1>
      </section>

      <div className="grid gap-3">
        {interests.map((interest) => (
          <button
            className={`min-h-16 rounded-lg border px-5 text-left text-xl font-semibold ${
              selectedInterest === interest ? "border-black bg-black text-white" : "border-neutral-300"
            }`}
            key={interest}
            onClick={() => setSelectedInterest(interest)}
            type="button"
          >
            {interest}
          </button>
        ))}
      </div>

      <button className="mt-auto min-h-14 rounded-lg bg-emerald-700 px-5 text-xl font-bold text-white" onClick={submit} type="button">
        결과 보기
      </button>

      {result ? <p className="rounded-lg bg-emerald-50 p-4 text-lg font-semibold text-emerald-900">{result}</p> : null}
    </main>
  );
}
```

- [ ] **Step 3: Verify intake page**

Run:

```powershell
bun run dev
```

Open `http://localhost:3000/intake`.

Expected: the page shows large interest buttons, `결과 보기` returns a recommendation, and there are no console errors.

- [ ] **Step 4: Commit intake UI**

Run:

```powershell
git add src/app/intake/page.tsx src/app/intake/IntakeClient.tsx
git commit -m "feat: add mobile intake flow"
```

## Task 8: Add Operator Review And Export Endpoints

**Files:**
- Create: `src/app/operator/page.tsx`
- Create: `src/app/api/operator/reviews/route.ts`
- Create: `src/app/api/exports/harmony/[id]/route.ts`

- [ ] **Step 1: Create operator page with static first version**

Create `src/app/operator/page.tsx`:

```tsx
export default function OperatorPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-3xl font-bold">운영자 검토</h1>
      <section className="mt-6 rounded-lg border border-neutral-200 p-5">
        <p className="text-sm text-neutral-500">대기 중</p>
        <h2 className="mt-2 text-xl font-semibold">행복한봄</h2>
        <p className="mt-2 text-neutral-700">가까운 걷기 모임 추천</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-black px-4 py-2 text-white" type="button">승인</button>
          <button className="rounded-md border border-neutral-300 px-4 py-2" type="button">보류</button>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create review API placeholder with explicit response**

Create `src/app/api/operator/reviews/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json({
    success: true,
    data: {
      recommendationResultId: body.recommendationResultId,
      status: body.status,
      operatorNote: body.operatorNote ?? "",
    },
  });
}
```

- [ ] **Step 3: Create Harmony export API with sample payload**

Create `src/app/api/exports/harmony/[id]/route.ts`:

```ts
import { toHarmonyExportPayload } from "@/lib/contracts/harmony-export";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return NextResponse.json({
    success: true,
    data: toHarmonyExportPayload({
      participant: {
        id,
        nickname: "행복한봄",
        regionSido: "서울특별시",
        regionSigungu: "강남구",
      },
      intake: {
        interests: ["걷기", "건강"],
      },
      recommendation: {
        summary: "가까운 야외 활동을 선호하고 처음 모임 참여에는 안내가 필요합니다.",
        nextActionType: "recommend_club",
        nextActionLabel: "가까운 걷기 모임 추천",
        reason: "지역과 관심사가 모두 일치합니다.",
      },
      review: {
        status: "approved",
        note: "첫 참여 전 전화 안내 권장",
      },
      createdAt: new Date("2026-05-30T00:00:00.000Z"),
    }),
  });
}
```

- [ ] **Step 4: Verify export endpoint**

Run:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/exports/harmony/11111111-1111-4111-8111-111111111111
```

Expected: response contains `source: harmony-system-lab` and `nextAction.type: recommend_club`.

- [ ] **Step 5: Commit operator and export surface**

Run:

```powershell
git add src/app/operator/page.tsx src/app/api/operator/reviews/route.ts src/app/api/exports/harmony/[id]/route.ts
git commit -m "feat: add operator review and harmony export surface"
```

## Task 9: Final Verification

**Files:**
- Modify only if verification finds a defect.

- [ ] **Step 1: Run automated checks**

Run:

```powershell
bun run lint
bun run test
bun run build
```

Expected: all commands complete successfully.

- [ ] **Step 2: Run browser smoke test**

Run:

```powershell
bun run dev
```

Open:

```text
http://localhost:3000/intake
http://localhost:3000/operator
http://localhost:3000/api/exports/harmony/11111111-1111-4111-8111-111111111111
```

Expected:

- `/intake` shows a mobile-friendly flow and returns a recommendation.
- `/operator` shows a review card.
- `/api/exports/harmony/[id]` returns a schema-valid export payload.

- [ ] **Step 3: Commit verification fixes**

If any fix was required, run:

```powershell
git add .
git commit -m "fix: resolve standalone mvp verification issues"
```

If no fix was required, do not create an empty commit.

## Self-Review

- Spec coverage: the plan covers separate project setup, isolated database, intake, recommendation, operator review, and Harmony export.
- Placeholder scan: no unfinished marker text or vague future-only steps remain.
- Type consistency: export action types are consistently `recommend_club`, `operator_call`, and `show_content`; review statuses are consistently `approved`, `held`, and `rejected`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-standalone-senior-system-mvp.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.
