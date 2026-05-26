# Harmony Senior System Hardening — Phase 1 & 2 (v3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the most dangerous security/correctness gaps (Phase 1) and wire the profile domain end-to-end with a senior-appropriate BottomNav (Phase 2), turning the app from a UI prototype into a real authenticated senior product.

**Architecture:** Two sequential PRs. PR1 = Phase 1 (security/correctness, no UX changes). PR2 = Phase 2 (BottomNav restructure + profile domain real DB wire-up). Phase 3 (UX token polish, other domain wire-ups, file uploads, GDPR) is OUT of scope and will be a follow-up plan.

**Tech Stack:** Next.js 16 App Router (with the new `proxy.ts` middleware convention), Supabase (Auth + Postgres), Drizzle ORM + `drizzle-zod`, TypeScript, Tailwind v4, Biome, Bun.

**Verification approach:** This codebase has no test framework. Verification uses (a) `npx tsc --noEmit` for types, (b) `bun run lint` for Biome, (c) `bun run build` for the full Next compile, and (d) `bun run dev` + manual route checks for runtime. Adding Vitest is out of scope.

### Critical context the engineer must read first

1. **Next.js 16 renamed `middleware.ts` → `proxy.ts`** with a `proxy` export (confirmed at `https://nextjs.org/docs/app/guides/upgrading/version-16`). The existing `src/proxy.ts:18` IS being executed by the framework — do NOT rename it. The real API auth gap is that `src/proxy.ts:56` excludes `/api/` paths from the redirect; API routes must enforce their own session check.

2. **Drizzle migrations have NEVER been generated for this project.** The `drizzle/` folder does not exist. The DDL source of truth is `supabase/migrations/*.sql`, applied via the Supabase CLI (`bunx supabase db push` or `bun run db:setup`). **DO NOT run `bun run db:generate` or `bun run db:migrate` in this plan** — they would generate a destructive "create-from-scratch" migration.

3. **DB connection uses a Proxy fallback** (`src/db/index.ts:10-15`) — missing `DATABASE_URL` does not break the build. `search_path` is set to `si_mvp,public,extensions` (line 19), so Drizzle queries resolve to the `si_mvp` schema where `h_*` tables live.

4. **Profile creation moves to a DB trigger.** The current flow (`/api/auth/register` called from the register page client-side) breaks if Supabase email confirmation is enabled (no session cookie at fetch time). v3 replaces this with a SQL trigger on `auth.users INSERT` that runs in the same transaction as signup — works regardless of email confirmation, eliminates a race, and lets us delete the API endpoint.

### Changes from v2

- **T5 fully replaced** — Option C from review: a SQL trigger creates profile rows automatically on `auth.users` insert (Supabase-recommended pattern). The `/api/auth/register` route and its client-side fetch are deleted. Includes backfill for existing users.
- **T9** — clarified that `sql` comes from `drizzle-orm` (NOT `drizzle-orm/pg-core`), as a separate import line.
- **T14** — replaced conditional "find insertion point" wording with exact line numbers based on the actual `club/[id]/page.tsx`.
- Other tasks unchanged from v2.

---

## Pre-flight (read before starting either phase)

- [ ] `git status` shows a clean tree (or only the in-flight files you expect).
- [ ] You have `.env.local` with valid `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] You have the Supabase CLI installed (`bunx supabase --version` works) — required for T5 to apply the SQL migration.
- [ ] You can register a test user in the dev Supabase project (used for T11+ smoke tests).
- [ ] You have an admin test account whose email you'll add to `ADMIN_EMAILS` during T2 setup (used for T3/T4 smoke).

---

## Phase 1 — Security & Correctness (PR 1)

### Task 1: Verify the auth proxy is actually executing

**Files:** (read-only verification)
- Read: `src/proxy.ts`

If the proxy isn't running, every other "session check" we add is meaningless.

- [ ] **Step 1: Start the dev server**

Run: `bun run dev`

Expected: dev server starts on `http://localhost:3000`. Wait for the `Ready` log line.

- [ ] **Step 2: Hit a protected page without a session**

Open a fresh incognito browser window (no Supabase cookies) and navigate to `http://localhost:3000/club`.

Expected: redirected to `/login` by the proxy at `src/proxy.ts:56-59`. If you land on `/club` directly, the proxy is broken — STOP and diagnose before continuing.

- [ ] **Step 3: Hit a public path without a session**

Navigate to `http://localhost:3000/login`.

Expected: page loads (no redirect loop). `login` is in `publicPaths` at `src/proxy.ts:5`.

- [ ] **Step 4: Hit an API route without a session**

Run: `curl -i http://localhost:3000/api/profiles/abc`

Expected: HTTP 200 with the current TODO stub. Proxy does NOT redirect API calls.

- [ ] **Step 5: Stop the dev server. No commit (read-only verification).**

---

### Task 2: Add admin-allowlist helper

**Files:**
- Create: `src/lib/auth/is-admin.ts`
- Modify: `.env.example`

Env-var allowlist because `h_profiles` has no `role` column and adding one is a bigger migration than warranted for Phase 1.

- [ ] **Step 1: Add ADMIN_EMAILS to `.env.example`**

Append after line 35 (`GEMINI_MODEL=gemini-2.0-flash`):

```
# 관리자 (콤마 구분, 예: admin@example.com,jp@flowos.work)
ADMIN_EMAILS=
```

- [ ] **Step 2: Create `src/lib/auth/is-admin.ts`**

```typescript
import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AdminCheckResult {
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
}

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, userId: null, email: null };
  }

  const adminSet = parseAdminEmails();
  const email = user.email?.toLowerCase() ?? null;
  const isAdmin = email !== null && adminSet.has(email);

  return { isAdmin, userId: user.id, email };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Add your admin email to `.env.local`**

Edit `.env.local` (not `.env.example`) and set:

```
ADMIN_EMAILS=<your test admin email>
```

This is needed for T3/T4 smoke tests later.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/is-admin.ts .env.example
git commit -m "feat(auth): add admin email allowlist helper"
```

---

### Task 3: Lock `/api/admin/generate` to admin users only

**Files:**
- Modify: `src/app/api/admin/generate/route.ts`

The route currently has `// In production: verify admin role from session` at line 7 and proceeds to call Gemini regardless.

- [ ] **Step 1: Replace the route handler**

Replace the entire contents of `src/app/api/admin/generate/route.ts` with:

```typescript
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import {
  errorResponse,
  forbiddenError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { generateFortuneContent, generateInfoDraft, isGeminiAvailable } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await requireAdmin();
  if (!userId) return unauthorizedError();
  if (!isAdmin) return forbiddenError("관리자만 사용할 수 있습니다");

  try {
    const body = (await request.json()) as Record<string, string>;
    const { type } = body;

    if (!isGeminiAvailable()) {
      return errorResponse("GEMINI_UNAVAILABLE", "Gemini API가 설정되지 않았습니다", 503);
    }

    if (type === "fortune") {
      const { zodiac, date } = body;
      if (!zodiac || !date) {
        return validationError("zodiac과 date를 입력해주세요");
      }
      const fortune = await generateFortuneContent(zodiac, date);
      return successResponse({ type: "fortune", zodiac, date, generated: fortune });
    }

    if (type === "info") {
      const { topic, category } = body;
      if (!topic || !category) {
        return validationError("topic과 category를 입력해주세요");
      }
      const draft = await generateInfoDraft(topic, category);
      return successResponse({ type: "info", generated: draft });
    }

    return validationError("type은 fortune 또는 info만 가능합니다");
  } catch (err) {
    console.error("[admin/generate]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Smoke test — unauthorized**

```bash
curl -i -X POST http://localhost:3000/api/admin/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"fortune","zodiac":"호랑이","date":"2026-05-26"}'
```

Expected: HTTP 401, body `{"success":false,"error":{"code":"UNAUTHORIZED","message":"로그인이 필요합니다"}}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/generate/route.ts
git commit -m "feat(admin): gate /api/admin/generate behind admin allowlist"
```

---

### Task 4: Lock `/admin` page to admin users only

**Files:**
- Rename: `src/app/admin/page.tsx` → `src/app/admin/AdminDashboardClient.tsx`
- Create: `src/app/admin/page.tsx` (new server-component shell)

`src/app/admin/page.tsx:1` is `"use client"` with default export `AdminDashboardPage`. Split into server-component guard + client subtree.

- [ ] **Step 1: Rename the client file**

```bash
git mv src/app/admin/page.tsx src/app/admin/AdminDashboardClient.tsx
```

In the renamed `src/app/admin/AdminDashboardClient.tsx`, change line 102:

```typescript
// from:
export default function AdminDashboardPage() {
// to:
export default function AdminDashboardClient() {
```

(Keep everything else unchanged.)

- [ ] **Step 2: Create new server-component shell at `src/app/admin/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/is-admin";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const { isAdmin, userId } = await requireAdmin();
  if (!userId) redirect("/login");
  if (!isAdmin) redirect("/");
  return <AdminDashboardClient />;
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && bun run build`

Expected: clean compile.

- [ ] **Step 4: Smoke test**

Run `bun run dev`. Incognito → `/admin` should redirect to `/login`. Non-admin signed in → redirect to `/`. Admin (email in `ADMIN_EMAILS`) → dashboard renders.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): gate /admin page behind admin allowlist"
```

---

### Task 5: Replace `/api/auth/register` with a DB trigger for profile creation

**Files:**
- Create: `supabase/migrations/20260526000000_auto_create_profile_on_signup.sql`
- Delete: `src/app/api/auth/register/route.ts`
- Modify: `src/app/(auth)/register/page.tsx`

**Why this approach (Option C from v2 review):** The current client-side fetch to `/api/auth/register` (`register/page.tsx:58-64`) trusts a body-supplied `userId`. v2 tried to derive it from the session, but Supabase only sets the session cookie when email confirmation is OFF — in production with confirmation ON, the fetch would have no session and the profile would never be created. A DB trigger on `auth.users INSERT` runs in the same transaction as signup, works regardless of email confirmation, eliminates the race, and matches the Supabase-recommended pattern.

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260526000000_auto_create_profile_on_signup.sql`:

```sql
-- Auto-create h_profiles row when a new auth.users row is inserted.
-- Reads nickname from raw_user_meta_data (set client-side via supabase.auth.signUp options.data).
-- Idempotent: re-running drops and recreates the trigger, on conflict do nothing on insert.

create or replace function si_mvp.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into si_mvp.h_profiles (id, nickname, region)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', '회원'),
    coalesce(new.raw_user_meta_data->>'region', '서울')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function si_mvp.handle_new_user();

-- Backfill: create profiles for any existing auth users that don't have one.
insert into si_mvp.h_profiles (id, nickname, region)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nickname', '회원'),
  '서울'
from auth.users u
left join si_mvp.h_profiles p on p.id = u.id
where p.id is null;
```

- [ ] **Step 2: Apply the migration**

Run: `bunx supabase db push`

Expected: Supabase CLI applies the new migration. If you get a "not linked to a project" error, run `bunx supabase link --project-ref <your-ref>` first.

If the Supabase CLI is not available or you prefer to apply via the dashboard, copy the SQL above and run it in the Supabase SQL editor against your dev project.

- [ ] **Step 3: Verify the trigger works**

In Supabase Studio SQL editor, run:

```sql
-- Should return the trigger definition
select tgname, tgrelid::regclass, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';
```

Expected: one row with `tgname='on_auth_user_created'`, `tgrelid='auth.users'`, `tgenabled='O'` (origin/enabled).

Then verify backfill:

```sql
select count(*) as missing_profiles
from auth.users u
left join si_mvp.h_profiles p on p.id = u.id
where p.id is null;
```

Expected: `0`.

- [ ] **Step 4: Update the register page to stop calling the (now-deleted) API**

In `src/app/(auth)/register/page.tsx`, find lines 57-64:

```typescript
      if (data.user) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id, nickname }),
        });
        if (!res.ok) console.error("Profile creation error:", await res.text());
      }

      setStep("complete");
```

Replace with just:

```typescript
      setStep("complete");
```

The `nickname` is already passed to Supabase via `options: { data: { nickname } }` at line 45 — the trigger reads it from `raw_user_meta_data`.

- [ ] **Step 5: Delete the now-redundant API route**

```bash
git rm src/app/api/auth/register/route.ts
```

If the `src/app/api/auth/` directory has no other files after this delete (besides `callback/`), leave it — the `callback/` route remains the only file there and that's fine.

- [ ] **Step 6: Type-check + build**

Run: `npx tsc --noEmit && bun run build`

Expected: clean compile. (`/api/auth/register` no longer exists, no callers reference it.)

- [ ] **Step 7: End-to-end smoke**

Run `bun run dev`. In an incognito window:
1. Sign up with a fresh test email + nickname "테스트회원".
2. In Supabase Studio: query `select id, nickname, region from si_mvp.h_profiles where id = (select id from auth.users where email = '<test email>');` — should return one row with `nickname='테스트회원'` and `region='서울'`.
3. Network tab should show NO call to `/api/auth/register`.

Stop server.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260526000000_auto_create_profile_on_signup.sql \
        src/app/(auth)/register/page.tsx \
        src/app/api/auth/register/
git commit -m "feat(auth): auto-create profile via DB trigger, remove register API"
```

---

### Task 6: Disable `/api/payments` and neutralize the `/subscribe` CTA

**Files:**
- Modify: `src/app/api/payments/route.ts`
- Modify: `src/app/(main)/subscribe/page.tsx`

Toss Payments isn't wired (no SDK call, no webhook). Today the CTA shows fake success after 1s — legal/financial risk.

- [ ] **Step 1: Replace the payments route with a 503 stub**

Replace the entire contents of `src/app/api/payments/route.ts` with:

```typescript
import { errorResponse } from "@/lib/api-response";

export async function POST() {
  return errorResponse(
    "PAYMENTS_UNAVAILABLE",
    "결제 시스템이 아직 준비되지 않았습니다",
    503
  );
}

export async function GET() {
  return errorResponse(
    "PAYMENTS_UNAVAILABLE",
    "결제 시스템이 아직 준비되지 않았습니다",
    503
  );
}
```

- [ ] **Step 2: Neutralize the subscribe page CTA**

In `src/app/(main)/subscribe/page.tsx`, find the CTA block at lines 144-159 (`{/* CTA */}` section). Replace it with:

```tsx
      {/* CTA — 결제 시스템 준비 전이므로 비활성 */}
      <div className="sticky bottom-20 -mx-4 border-t border-mocha-100 bg-white/95 p-4 backdrop-blur-sm">
        <div className="rounded-2xl border-2 border-coral-200 bg-coral-50 p-4 text-center">
          <p className="text-lg font-bold text-coral-700">결제 시스템 준비 중이에요</p>
          <p className="mt-1 text-base text-mocha-700">
            곧 프리미엄 구독을 시작할 수 있도록 준비하고 있어요
          </p>
        </div>
      </div>
```

Then remove `isSubscribed`, `loading`, `handleSubscribe` (lines 47-62). The component head becomes:

```tsx
export default function SubscribePage() {
  return (
```

Cleanup imports:
- Line 14: delete `import { useState } from "react";` (no remaining state).
- Line 15: delete `import { Badge } from "@/components/ui/badge";` (Badge was only in the `isSubscribed` branch).
- Keep all `@phosphor-icons/react` icons used elsewhere: `Crown` (Hero, line 75; benefits, line 38), `Check`/`X` (comparison table, lines 125-135), `ChatCircle`/`MapPin`/`ShieldCheck`/`Star` (benefits), `ArrowLeft` (header).

Keep `"use client"` — converting to a server component is a Phase 3 cleanup.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && bun run lint`

Expected: no errors. If lint flags any other unused import, remove it.

- [ ] **Step 4: Smoke test**

Run `bun run dev`. Sign in. Visit `/subscribe`. Confirm:
- The bottom CTA shows the "결제 시스템 준비 중" banner, no button.
- `curl -i -X POST http://localhost:3000/api/payments -H "Content-Type: application/json" -d '{}'` returns HTTP 503.

Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payments/route.ts src/app/(main)/subscribe/page.tsx
git commit -m "fix(payments): disable Toss stub and surface 준비 중 banner"
```

---

### Task 7: Standardize the KakaoMap env variable name

**Files:**
- Modify: `src/components/map/KakaoMap.tsx`

`.env.example:22` declares `NEXT_PUBLIC_KAKAO_MAP_KEY` but `src/components/map/KakaoMap.tsx:122` reads `NEXT_PUBLIC_KAKAO_MAP_API_KEY`. The map never gets a key.

- [ ] **Step 1: Update the component**

In `src/components/map/KakaoMap.tsx:122`, change:

```typescript
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
```

to:

```typescript
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
```

- [ ] **Step 2: Grep for stragglers**

Use the Grep tool with pattern `NEXT_PUBLIC_KAKAO_MAP_API_KEY`, output_mode `files_with_matches`.

Expected: zero matches.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/map/KakaoMap.tsx
git commit -m "fix(map): unify env var to NEXT_PUBLIC_KAKAO_MAP_KEY"
```

---

### Task 8: Add composite primary keys to Drizzle schemas (TS-only)

**Files:**
- Modify: `src/db/schema/users.ts`
- Modify: `src/db/schema/clubs.ts`
- Modify: `src/db/schema/chat.ts`
- Modify: `src/db/schema/social.ts`
- Modify: `src/db/schema/safety.ts`

**⚠️ DO NOT run `bun run db:generate` or `bun run db:migrate`** during this task. The SQL migrations already declare these PKs in the DB (e.g., `migrations/20260523084811_create_si_mvp_schema.sql:56,99,120,151,223,249,275,293`). There is no `drizzle/` folder, so drizzle-kit has never run against this project. Running it now would generate a destructive "create from scratch" migration.

This task is purely a TS-level fix so the Drizzle query layer's expectations match the DB.

- [ ] **Step 1: Update `src/db/schema/users.ts`**

Update line 1 imports to add `primaryKey`:

```typescript
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
```

Replace `userHobbies` at lines 33-36:

```typescript
export const userHobbies = pgTable(
  "h_user_hobbies",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    hobbyId: text("hobby_id")
      .notNull()
      .references(() => hobbies.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.hobbyId] })]
);
```

- [ ] **Step 2: Update `src/db/schema/clubs.ts`**

Add `primaryKey` to imports at line 1.

Replace `clubMembers` at lines 28-34:

```typescript
export const clubMembers = pgTable(
  "h_club_members",
  {
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").default("member"),
    joinedAt: timestamp("joined_at").defaultNow(),
    status: memberStatusEnum("status").default("active"),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.userId] })]
);
```

Replace `clubPostLikes` at lines 50-54:

```typescript
export const clubPostLikes = pgTable(
  "h_club_post_likes",
  {
    postId: text("post_id")
      .notNull()
      .references(() => clubPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })]
);
```

Replace `meetingParticipants` at lines 79-84:

```typescript
export const meetingParticipants = pgTable(
  "h_meeting_participants",
  {
    meetingId: text("meeting_id")
      .notNull()
      .references(() => clubMeetings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: meetingParticipantStatusEnum("status").default("joined"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.userId] })]
);
```

- [ ] **Step 3: Update `src/db/schema/chat.ts`**

Add `primaryKey` to imports at line 1.

Replace `chatRoomMembers` at lines 22-27:

```typescript
export const chatRoomMembers = pgTable(
  "h_chat_room_members",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow(),
    lastReadAt: timestamp("last_read_at"),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })]
);
```

- [ ] **Step 4: Update `src/db/schema/social.ts`**

Add `primaryKey` to imports at line 1.

Replace `userFollows` at lines 13-21:

```typescript
export const userFollows = pgTable(
  "h_user_follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] })]
);
```

- [ ] **Step 5: Update `src/db/schema/safety.ts`**

Add `primaryKey` to imports at line 1.

Replace `blocks` at lines 23-27:

```typescript
export const blocks = pgTable(
  "h_blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })]
);
```

- [ ] **Step 6: Type-check and build**

Run: `npx tsc --noEmit && bun run build`

Expected: clean compile. Skip any drizzle-kit commands.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema/
git commit -m "fix(db): add composite PKs to junction tables to match SQL DDL"
```

---

### Task 9: Add the missing `h_push_subscriptions` Drizzle table

**Files:**
- Modify: `src/db/schema/users.ts`

`supabase/migrations/20260523084811_create_si_mvp_schema.sql:307-314` declares `h_push_subscriptions` but it's missing from the Drizzle TS schema.

**⚠️ Same warning as T8:** do NOT run drizzle-kit commands.

- [ ] **Step 1: Add a second import line for `sql`**

At the top of `src/db/schema/users.ts`, AFTER the existing `import { ... } from "drizzle-orm/pg-core";` block (which after T8 imports `boolean, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp`), add a separate import:

```typescript
import { sql } from "drizzle-orm";
```

Note: `sql` lives in the `drizzle-orm` root package, NOT in `drizzle-orm/pg-core`. This is a new, separate import line — do not try to merge it into the pg-core import.

- [ ] **Step 2: Append the table to `src/db/schema/users.ts`**

Add at the end of the file (after `verificationBadges`):

```typescript
export const pushSubscriptions = pgTable("h_push_subscriptions", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

The `sql\`gen_random_uuid()::text\`` mirrors the DB-side default declared in the SQL migration so future drizzle-kit runs (if ever introduced) won't think there's a default mismatch.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && bun run build`

Expected: clean compile.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/users.ts
git commit -m "feat(db): add h_push_subscriptions to Drizzle schema"
```

---

### Task 10: Sync Vercel env config

**Files:**
- Modify: `scripts/vercel-env-setup.sh`
- Modify: `DEPLOYMENT.md`

Production deploy depends on env vars being in Vercel. T2 added `ADMIN_EMAILS`.

- [ ] **Step 1: Add ADMIN_EMAILS to `scripts/vercel-env-setup.sh`**

Read `scripts/vercel-env-setup.sh` and find the env-vars associative array (the line with `["NEXT_PUBLIC_KAKAO_MAP_KEY"]=`). Add a new line in the same array following the existing pattern:

```bash
  ["ADMIN_EMAILS"]="${ADMIN_EMAILS:-}"
```

- [ ] **Step 2: Update `DEPLOYMENT.md`**

Find the env-var checklist table (search for `NEXT_PUBLIC_KAKAO_MAP_KEY` — confirmed at `DEPLOYMENT.md:95`). Add a new row:

```
| `ADMIN_EMAILS` | ⬜ | 관리자 이메일 (콤마 구분) |
```

Place near other auth/admin-related vars if such a grouping exists; otherwise append to optional vars.

- [ ] **Step 3: Manual deploy reminder (no code change)**

After this PR merges, the deployer must run for each environment (production, preview, development):

```bash
vercel env add ADMIN_EMAILS production
# paste comma-separated admin emails
```

Document this in the PR description. Do NOT block the commit on this.

- [ ] **Step 4: Commit**

```bash
git add scripts/vercel-env-setup.sh DEPLOYMENT.md
git commit -m "chore(deploy): document ADMIN_EMAILS env var for Vercel"
```

---

### Task 11: Phase 1 final smoke test + push

- [ ] **Step 1: Full build**

Run: `bun run build`

Expected: build succeeds.

- [ ] **Step 2: Lint**

Run: `bun run lint`

Expected: no Biome errors.

- [ ] **Step 3: Manual end-to-end smoke**

Run `bun run dev`. Verify each:

| Check | Expected |
|---|---|
| Incognito → `/club` | redirect to `/login` |
| Incognito → `/login` | loads normally |
| Sign up new test user | profile row appears in `si_mvp.h_profiles` automatically via trigger (no API call needed) |
| Sign in as non-admin → `/admin` | redirect to `/` |
| Sign in as admin → `/admin` | dashboard renders |
| Non-admin → POST `/api/admin/generate` | 401 |
| Anyone → POST `/api/payments` | 503 |
| `/subscribe` page | "결제 시스템 준비 중" banner, no CTA |
| Map page (if KAKAO key set) | KakaoMap renders |

- [ ] **Step 4: Review the commit list with the user**

Run: `git log --oneline main..HEAD`

Mention in the PR description:
- `ADMIN_EMAILS` must be set in Vercel for prod/preview/dev (T10 step 3).
- The new SQL migration (T5) must be applied to staging/production via `bunx supabase db push` against those projects.

---

## Phase 2 — BottomNav Restructure + Profile Domain (PR 2)

> **Important:** Phase 2 starts from the merged state of Phase 1.

### Task 12: Add `/logout` route (must land before T16)

**Files:**
- Create: `src/app/logout/route.ts`
- Modify: `src/proxy.ts`

T16 will replace the broken logout button in mypage with `<Link href="/logout">`. Land the route first.

- [ ] **Step 1: Create the logout route**

Create `src/app/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
```

- [ ] **Step 2: Allow `/logout` through the proxy without auth**

In `src/proxy.ts`, update `publicPaths` at lines 4-16 to include `/logout`:

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
];
```

- [ ] **Step 3: Type-check + smoke**

Run: `npx tsc --noEmit`. Then `bun run dev`, sign in, visit `http://localhost:3000/logout` directly. Expected: redirect to `/login`, cookies cleared. Visiting `/club` afterwards should redirect to `/login`.

- [ ] **Step 4: Commit**

```bash
git add src/app/logout/ src/proxy.ts
git commit -m "feat(auth): add /logout route and allow it through proxy"
```

---

### Task 13: Restructure BottomNav for senior IA

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`

Reduce from 6 items to 5. Drop `검색` (redundant — home header already has it at `src/app/(main)/page.tsx:95`) and `지도` (will be cross-linked from club pages in T14). Add `정보`. New order: 홈 · 클럽 · 정보 · 채팅 · 내정보.

- [ ] **Step 1: Replace the navItems array**

In `src/components/layout/BottomNav.tsx`, replace lines 3-22:

```typescript
import {
  ChatsCircle,
  House,
  MagnifyingGlass,
  MapPin,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: House },
  { href: "/club", label: "클럽", icon: UsersThree },
  { href: "/search", label: "검색", icon: MagnifyingGlass },
  { href: "/map", label: "지도", icon: MapPin },
  { href: "/chat", label: "채팅", icon: ChatsCircle },
  { href: "/mypage", label: "내정보", icon: UserCircle },
];
```

with:

```typescript
import {
  ChatsCircle,
  House,
  Newspaper,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: House },
  { href: "/club", label: "클럽", icon: UsersThree },
  { href: "/info", label: "정보", icon: Newspaper },
  { href: "/chat", label: "채팅", icon: ChatsCircle },
  { href: "/mypage", label: "내정보", icon: UserCircle },
];
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`

Expected: no errors.

- [ ] **Step 3: Smoke test**

Run `bun run dev`. Visit `/`. Confirm BottomNav shows 5 items in the new order. Tap each — every destination loads. `/search` and `/map` remain reachable by typing URL directly.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/BottomNav.tsx
git commit -m "feat(nav): restructure BottomNav for senior IA (5 items, content-first)"
```

---

### Task 14: Add a "지도에서 보기" link on the club detail page

**Files:**
- Modify: `src/app/(main)/club/[id]/page.tsx`

Surface the map where it's actually useful. Confirmed file layout: `"use client"` at line 1; Phosphor imports from `@phosphor-icons/react` at line 3; header gradient div ends at line 93; tabs wrapper `<div className="px-4">` starts at line 95. We insert a wrapper at line 94.

- [ ] **Step 1: Add `MapPin` to the Phosphor import on line 3**

Find:

```typescript
import { Bell, CalendarDots, ChatCircle, ImageSquare, Users } from "@phosphor-icons/react";
```

Replace with (insert `MapPin` alphabetically):

```typescript
import { Bell, CalendarDots, ChatCircle, ImageSquare, MapPin, Users } from "@phosphor-icons/react";
```

- [ ] **Step 2: Insert the link card between the header and tabs**

In `src/app/(main)/club/[id]/page.tsx`, between line 93 (`</div>` — closing div of the header gradient) and line 95 (`<div className="px-4">` — tabs wrapper), insert a new block. The result should look like:

```tsx
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
```

`Card`, `CardContent`, and `Link` are already imported at lines 4 and 10. No additional imports needed beyond `MapPin` from step 1.

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`

Expected: no errors.

- [ ] **Step 4: Smoke test**

Run `bun run dev`. Sign in. Visit `/club/1` (or any club id). Confirm the "지도에서 보기" card appears below the header gradient and above the tabs, and tapping it goes to `/map`. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/(main)/club/[id]/page.tsx
git commit -m "feat(nav): add 지도에서 보기 link on club detail page"
```

---

### Task 15: Wire `/api/profiles/[id]` GET/PATCH to the real DB

**Files:**
- Modify: `src/app/api/profiles/[id]/route.ts`

Replace the TODO stub. Policy: any signed-in user can read any profile (needed by `/users/[id]`); only the profile owner can PATCH.

- [ ] **Step 1: Replace the route**

Replace the entire contents of `src/app/api/profiles/[id]/route.ts` with:

```typescript
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const UpdateProfileSchema = z.object({
  nickname: z.string().min(1).max(20).optional(),
  region: z.string().min(1).max(20).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    if (!row) return notFoundError("프로필을 찾을 수 없습니다");
    return successResponse(row);
  } catch (err) {
    console.error("[profiles GET]", err);
    return serverError();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();
  if (user.id !== id) return forbiddenError("본인의 프로필만 수정할 수 있습니다");

  const parsed = UpdateProfileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  if (Object.keys(parsed.data).length === 0) {
    return validationError("수정할 내용이 없습니다");
  }

  try {
    const [updated] = await db
      .update(profiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!updated) return notFoundError("프로필을 찾을 수 없습니다");
    return successResponse(updated);
  } catch (err) {
    console.error("[profiles PATCH]", err);
    return serverError();
  }
}
```

Policy notes (do NOT add to code, just be aware): GET is open to any signed-in user. PATCH has no admin override — admin profile editing is out of scope for Phase 2. `subscriptionTier` is intentionally absent — tier changes go through the (currently disabled) payment flow only.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Smoke test (manual)**

Run `bun run dev`. Sign in as a test user. In the browser console:

```javascript
await fetch(`/api/profiles/${"<UID>"}`).then(r => r.json())
```

Expected: `{success: true, data: { id, nickname, region, ... }}`.

Test PATCH ownership:

```javascript
await fetch(`/api/profiles/some-other-uid`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nickname: "x" }),
}).then(r => r.json())
```

Expected: `{success: false, error: { code: "FORBIDDEN", ... }}`.

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/profiles/[id]/route.ts
git commit -m "feat(profiles): wire GET/PATCH to real DB with auth + Zod"
```

---

### Task 16: Convert `mypage/page.tsx` to load the real profile

**Files:**
- Create: `src/app/(main)/mypage/NotificationSettings.tsx`
- Modify: `src/app/(main)/mypage/page.tsx`

Convert to a server component that fetches the real profile, with notification toggles extracted to a client subtree.

**Honesty note for activity counts:** original surfaced fake `clubs: 3, posts: 12, meetings: 8, reviews: 5`. Real counts need 4 separate queries against domains not in this PR's scope. We replace with `0` placeholders + a Phase 3 comment — fake numbers are worse than zeros.

- [ ] **Step 1: Create `src/app/(main)/mypage/NotificationSettings.tsx`**

```typescript
"use client";

import { Bell } from "@phosphor-icons/react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const NOTIFICATIONS = [
  { key: "chat" as const, label: "채팅 알림", desc: "새 메시지가 오면 알려드려요" },
  { key: "meeting" as const, label: "모임 알림", desc: "모임 일정을 미리 알려드려요" },
  { key: "club" as const, label: "클럽 알림", desc: "클럽의 새 글과 공지" },
  { key: "marketing" as const, label: "이벤트 안내", desc: "혜택과 이벤트 소식" },
];

// Note: toggles are local state only. Persistence is Phase 3 (needs h_push_subscriptions wire-up).
export function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    chat: true,
    meeting: true,
    club: false,
    marketing: false,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Bell size={24} weight="duotone" className="text-coral-600" />
          알림 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {NOTIFICATIONS.map((item) => (
          <div key={item.key} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-lg">{item.label}</Label>
              <p className="mt-0.5 text-base text-mocha-700">{item.desc}</p>
            </div>
            <Switch
              checked={notifications[item.key]}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, [item.key]: checked })
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Replace `src/app/(main)/mypage/page.tsx`**

Replace the entire contents with:

```typescript
import {
  CalendarDots,
  CaretRight,
  Crown,
  Gear,
  Heart,
  PencilSimple,
  ShieldCheck,
  SignOut,
  Star,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettings } from "./NotificationSettings";

// Mock data — to be replaced when respective domains are wired (Phase 3+):
//   myClubs   ← join h_club_members on user_id
//   myMeetings← join h_meeting_participants on user_id
//   myReviews ← h_meeting_reviews where user_id = me
//   myFavorites ← (no favorites table yet — needs schema)
//   badges    ← h_verification_badges where user_id = me
const myClubs = [
  { id: "1", name: "서울 등산 모임", emoji: "⛰️", members: 45 },
  { id: "2", name: "골프 친구들", emoji: "⛳", members: 32 },
  { id: "3", name: "독서 클럽", emoji: "📚", members: 28 },
];
const myMeetings = [
  { id: "m1", title: "3월 정기 산행", clubName: "서울 등산 모임", date: "2026-06-15", status: "upcoming" as const },
  { id: "m2", title: "2월 독서 모임", clubName: "독서 클럽", date: "2026-04-20", status: "completed" as const },
];
const myReviews = [
  { id: "r1", meetingTitle: "2월 산행", rating: 5, content: "최고의 산행이었습니다!", date: "2026-04-18" },
  { id: "r2", meetingTitle: "1월 독서 모임", rating: 4, content: "유익한 시간이었어요", date: "2026-03-20" },
];
const myFavorites = [
  { id: "f1", name: "북한산 둘레길", type: "장소" },
  { id: "f2", name: "서울 등산 모임", type: "클럽" },
];
const badges = [
  { type: "실명인증", verified: true },
  { type: "활동인증", verified: true },
  { type: "얼굴인증", verified: false },
  { type: "후기인증", verified: false },
];
const ratingStars = [1, 2, 3, 4, 5] as const;

// Phase 3: query counts from h_club_members, h_club_posts, h_meeting_participants, h_meeting_reviews
const STATS = [
  { key: "clubs", label: "클럽", value: 0 },
  { key: "posts", label: "게시글", value: 0 },
  { key: "meetings", label: "모임", value: 0 },
  { key: "reviews", label: "후기", value: 0 },
];

const MENU_ITEMS = [
  { label: "프로필 수정", icon: UserCircle, href: "/mypage/edit" },
  { label: "구독 관리", icon: Crown, href: "/subscribe" },
  { label: "설정", icon: Gear, href: "/mypage/settings" },
] as const;

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) redirect("/onboarding");

  const initial = profile.nickname.charAt(0);
  const isPremium = profile.subscriptionTier === "premium";

  return (
    <div className="space-y-5 p-5">
      <h1 className="pt-2 text-3xl font-extrabold text-mocha-900 tracking-tight">내 정보</h1>

      <Card className="overflow-hidden border-coral-100 bg-gradient-to-br from-coral-50 to-cream-100">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-white">
                <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
              </Avatar>
              <Link
                href="/mypage/edit"
                aria-label="프로필 수정"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-coral-500 text-white shadow-warm transition-all hover:bg-coral-600 active:scale-95"
              >
                <PencilSimple size={16} weight="bold" />
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-mocha-900 tracking-tight">
                  {profile.nickname}
                </h2>
                {isPremium && (
                  <Badge className="bg-coral-500 text-white">
                    <Crown size={14} weight="fill" className="mr-1" />
                    프리미엄
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-base text-mocha-700">
                {profile.region}
                {profile.bio ? ` · ${profile.bio}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.isVerified && (
                  <Badge variant="success">
                    <ShieldCheck size={16} weight="bold" className="mr-1" />
                    인증됨
                  </Badge>
                )}
                <Badge variant="cream">활동점수 {profile.activityScore ?? 0}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-white p-4 shadow-soft">
            {STATS.map((stat) => (
              <div key={stat.key} className="text-center">
                <p className="text-2xl font-extrabold text-coral-600">{stat.value}</p>
                <p className="mt-0.5 text-sm font-semibold text-mocha-700">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">인증 뱃지</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge
              key={badge.type}
              variant={badge.verified ? "success" : "outline"}
              className="text-base"
            >
              <span aria-hidden="true" className="mr-1">
                {badge.verified ? "✓" : "○"}
              </span>
              {badge.type}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <Tabs defaultValue="clubs">
            <TabsList>
              <TabsTrigger value="clubs">내 클럽</TabsTrigger>
              <TabsTrigger value="meetings">참여 모임</TabsTrigger>
              <TabsTrigger value="reviews">작성 후기</TabsTrigger>
              <TabsTrigger value="favorites">찜 목록</TabsTrigger>
            </TabsList>

            <TabsContent value="clubs" className="space-y-2">
              {myClubs.map((club) => (
                <Link key={club.id} href={`/club/${club.id}`} className="block">
                  <div className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-cream-100 active:bg-cream-200">
                    <span aria-hidden="true" className="text-3xl">{club.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-mocha-900 truncate">{club.name}</p>
                      <p className="text-base text-mocha-700">멤버 {club.members}명</p>
                    </div>
                    <CaretRight size={22} weight="bold" className="text-mocha-400" />
                  </div>
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="meetings" className="space-y-2">
              {myMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center gap-3 rounded-2xl p-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      meeting.status === "upcoming" ? "bg-coral-50" : "bg-mocha-100"
                    }`}
                  >
                    <CalendarDots
                      size={26}
                      weight="duotone"
                      className={meeting.status === "upcoming" ? "text-coral-600" : "text-mocha-500"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-mocha-900 truncate">{meeting.title}</p>
                    <p className="text-base text-mocha-700 truncate">
                      {meeting.clubName} · {meeting.date}
                    </p>
                  </div>
                  <Badge variant={meeting.status === "upcoming" ? "default" : "secondary"}>
                    {meeting.status === "upcoming" ? "예정" : "완료"}
                  </Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-3">
              {myReviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-mocha-100 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-bold text-mocha-900">{review.meetingTitle}</p>
                    <div role="img" aria-label={`${review.rating}점 만점에 5점`} className="flex">
                      {ratingStars.map((star) => (
                        <Star
                          key={`star-${review.id}-${star}`}
                          size={18}
                          weight={star <= review.rating ? "fill" : "regular"}
                          className={
                            star <= review.rating ? "text-[var(--color-warning)]" : "text-mocha-200"
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-base text-mocha-800 leading-relaxed">{review.content}</p>
                  <p className="mt-2 text-sm font-medium text-mocha-500">{review.date}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-2">
              {myFavorites.map((fav) => (
                <div key={fav.id} className="flex items-center gap-3 rounded-2xl p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral-50">
                    <Heart size={24} weight="fill" className="text-coral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-mocha-900 truncate">{fav.name}</p>
                    <p className="text-base text-mocha-700">{fav.type}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <NotificationSettings />

      <Card>
        <CardContent className="p-0">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex w-full items-center gap-4 border-b border-mocha-100 px-6 py-5 text-lg font-semibold text-mocha-900 transition-colors hover:bg-cream-100 active:bg-cream-200"
              >
                <Icon size={26} weight="duotone" className="text-coral-600" />
                <span className="flex-1 text-left">{item.label}</span>
                <CaretRight size={22} weight="bold" className="text-mocha-400" />
              </Link>
            );
          })}
          <Link
            href="/logout"
            className="flex w-full items-center gap-4 px-6 py-5 text-lg font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-bg)]"
          >
            <SignOut size={26} weight="bold" />
            <span>로그아웃</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && bun run build`

Expected: clean build.

- [ ] **Step 4: Smoke test**

Run `bun run dev`. Sign in. Visit `/mypage`. Confirm:
- Nickname/region/bio match the DB row in `si_mvp.h_profiles`.
- Activity stats show `0` (intentional).
- Clicking 로그아웃 redirects to `/login`.
- Registering a brand-new user and visiting `/mypage` immediately works (trigger from T5 created the profile in the same transaction as auth.users insert).

Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/(main)/mypage/
git commit -m "feat(profile): render mypage from real DB profile row"
```

---

### Task 17: Convert `mypage/edit` to call the PATCH API

**Files:**
- Create: `src/app/(main)/mypage/edit/EditProfileForm.tsx`
- Modify: `src/app/(main)/mypage/edit/page.tsx`

Today the save handler is empty (`mypage/edit/page.tsx:44-46`). Wire it to PATCH and load initial values from the profile row.

- [ ] **Step 1: Create `src/app/(main)/mypage/edit/EditProfileForm.tsx`**

```typescript
"use client";

import { Camera } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const hobbyOptions = [
  "등산", "골프", "독서", "여행", "요리", "사진", "낚시",
  "바둑", "테니스", "수영", "서예", "가드닝", "댄스", "요가", "그림",
];

interface Props {
  userId: string;
  initial: {
    nickname: string;
    region: string;
    bio: string;
  };
}

export function EditProfileForm({ userId, initial }: Props) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initial.nickname);
  const [bio, setBio] = useState(initial.bio);
  const [region, setRegion] = useState(initial.region);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  };

  const handleSave = async () => {
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch(`/api/profiles/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, bio, region }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "저장에 실패했어요");
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("[profile save]", err);
      setError("네트워크 오류가 발생했어요");
    }
  };

  return (
    <>
      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-3xl">{nickname.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            aria-label="프로필 사진 변경 (준비 중)"
            disabled
            className="absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 text-white shadow-warm disabled:opacity-50"
          >
            <Camera size={20} />
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">지역</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">자기소개</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="자기소개를 입력해주세요"
            />
          </div>

          <div className="space-y-2">
            <Label>관심 취미 (복수 선택, 저장은 준비 중)</Label>
            <div className="flex flex-wrap gap-2">
              {hobbyOptions.map((hobby) => (
                <Badge
                  key={hobby}
                  variant={selectedHobbies.includes(hobby) ? "default" : "outline"}
                  className="cursor-pointer text-base"
                  onClick={() => toggleHobby(hobby)}
                >
                  {hobby}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div
          role="status"
          className="rounded-2xl border-2 border-sage-200 bg-sage-50 p-4 text-base font-medium text-sage-800"
        >
          저장되었어요
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSave}
        disabled={isPending || !nickname.trim()}
      >
        {isPending ? "저장 중이에요..." : "저장하기"}
      </Button>
    </>
  );
}
```

- [ ] **Step 2: Replace `src/app/(main)/mypage/edit/page.tsx`**

Replace the entire contents with:

```typescript
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "./EditProfileForm";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) redirect("/onboarding");

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-3">
        <Link
          href="/mypage"
          aria-label="뒤로 가기"
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200"
        >
          <ArrowLeft size={24} weight="bold" />
        </Link>
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">프로필 수정</h1>
      </div>

      <EditProfileForm
        userId={user.id}
        initial={{
          nickname: profile.nickname,
          region: profile.region,
          bio: profile.bio ?? "",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && bun run build`

Expected: clean build.

- [ ] **Step 4: Smoke test**

Run `bun run dev`. Sign in. Visit `/mypage/edit`:
- Form is pre-filled from the DB profile.
- Change nickname, hit 저장하기.
- "저장되었어요" appears.
- Navigate to `/mypage` — new nickname shown.
- In Supabase Studio: `si_mvp.h_profiles` row has updated `nickname` and `updated_at`.
- Try PATCH another user via browser console — returns 403.

Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/(main)/mypage/edit/
git commit -m "feat(profile): wire mypage/edit to PATCH /api/profiles/[id]"
```

---

### Task 18: Phase 2 final smoke test + push

- [ ] **Step 1: Full build + lint**

Run: `bun run build && bun run lint`

Expected: clean.

- [ ] **Step 2: Manual end-to-end smoke**

Run `bun run dev`. Verify:

| Check | Expected |
|---|---|
| BottomNav | 5 items: 홈 · 클럽 · 정보 · 채팅 · 내정보 |
| Tap 정보 | navigates to `/info` |
| `/club/[id]` page | shows "지도에서 보기" card between header and tabs |
| `/mypage` | renders signed-in user's real nickname/region/bio; activity stats show 0 |
| `/mypage/edit` form | pre-filled from DB |
| Save in `/mypage/edit` | DB row updates, "저장되었어요", `/mypage` reflects change |
| PATCH another user via console | 403 |
| 로그아웃 link | clears session, redirects to `/login` |
| `/search`, `/map` via URL | still load |

- [ ] **Step 3: Confirm with user before pushing**

Show `git log --oneline main..HEAD` and confirm.

---

## Out of Scope (Phase 3 candidates, separate plan)

The following are explicitly NOT in this plan:

1. Wire remaining domains to real DB — club, community, info, place, recommendations, search.
2. Activity-stats counts on mypage (replace the `0` placeholders).
3. CRUD endpoints for club join, meeting participation, community write, info comments.
4. Notification persistence — install `web-push`, save subscriptions to `h_push_subscriptions`.
5. UX token polish — replace `gray-*` with `mocha-*` in Dialog, Toast, Checkbox, `loading.tsx`, `error.tsx`. Forbid `text-xs` via Biome rule.
6. File upload pipeline — Supabase Storage bucket + signed URLs.
7. GDPR/PIPA user deletion flow.
8. Rate limiting on write endpoints.
9. Cross-link IA — fortune→community, info→clubs, member rows→`/users/[id]`.
10. Toss Payments real integration.
11. Test infrastructure — Vitest + starter tests for `lib/gemini.ts` parser, `lib/recommendation.ts`, `lib/auth/is-admin.ts`.
12. Persist hobby selection on profile edit (`h_user_hobbies` wire-up).
13. Onboarding flow — currently doesn't save anything; should write region/hobbies to profile.

---

## Self-Review (v3)

**Spec coverage** — Every Phase 1/2 issue maps to a task: proxy verification (T1), admin gating (T2-T4), register/profile-creation fix via trigger (T5 — replaces v2's session-based approach that broke under email-confirmation-ON), payments stub (T6), KakaoMap env (T7), schema PK drift (T8), `h_push_subscriptions` missing (T9), Vercel env sync (T10), BottomNav (T13), map cross-link (T14), profile CRUD (T15-T17), logout (T12). Phase 3 items deferred and listed.

**Placeholder scan** — T14 now has concrete line numbers (93/94/95). T9 import path clarified (separate import from `drizzle-orm`, not pg-core). No remaining "find a sensible point" or conditional "if X then A else B" language.

**Type consistency** — `requireAdmin()` returns `{ isAdmin, userId, email }` and is called identically in T3 and T4. `api-response.ts` helpers match signatures at `src/lib/api-response.ts:18-49`. `EditProfileForm` props match the shell. `NotificationSettings` named export imported correctly. `createClient` is the async server-side variant from `@/lib/supabase/server`. The trigger function's column list (`id, nickname, region`) matches `h_profiles` schema in `src/db/schema/users.ts:11-15`.

**Ordering check** — T12 (logout route) lands BEFORE T16 (mypage replacement that adds the logout link). T13 (BottomNav) is independent. T15 (profiles API) lands before T16/T17 which use it. T5 (trigger + register page cleanup) lands before T11 smoke test that verifies new signups auto-create profiles.

**Destructive-action review** — No drizzle-kit commands (T8/T9 explicitly warn against them). The only DB-mutating command is `bunx supabase db push` in T5, which applies the new migration file — this is the standard migration flow. The migration is idempotent (`drop trigger if exists`, `on conflict do nothing`, backfill uses `left join ... where p.id is null`). No `git push --force`, no `--no-verify`. The trigger uses `security definer set search_path = ''` per Supabase guidance.

**Email-confirmation independence** — T5's trigger fires on `auth.users INSERT`, which happens regardless of whether email confirmation is required. The signup flow's `options: { data: { nickname } }` (`register/page.tsx:45`, unchanged) puts the nickname into `raw_user_meta_data` synchronously with the auth.users row creation, so the trigger reads it from the same transaction. Works in both email-confirm-ON and -OFF configurations.
