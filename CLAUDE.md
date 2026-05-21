# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Harmony (하모니)** — An active senior lifestyle platform (55-70 age group) for club activities, community, and content. Korean-language app with Korean UI strings throughout.

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Dev server (uses bun runtime)
bun run build            # Production build (next build)
bun run lint             # Lint with Biome (src/ only)
bun run format           # Format with Biome (src/ only)
bun run db:generate      # Generate Drizzle migrations
bun run db:migrate       # Run Drizzle migrations
bun run db:studio        # Open Drizzle Studio
bun run deploy           # Deploy to Vercel (prod)
bun run deploy:preview   # Deploy to Vercel (preview)
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Runtime/Package Manager**: Bun
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss` plugin)
- **UI Components**: Radix UI primitives + CVA (class-variance-authority)
- **Icons**: Phosphor Icons (`@phosphor-icons/react`)
- **Auth**: Supabase Auth with SSR (`@supabase/ssr`)
- **Database**: PostgreSQL (Supabase) via Drizzle ORM
- **Chat**: Firebase Realtime Database (client-side only)
- **Validation**: Zod (with `drizzle-zod` for schema integration)
- **Data Fetching**: TanStack React Query
- **Linting/Formatting**: Biome (2-space indent, double quotes, trailing commas ES5, 100 char line width)
- **Deployment**: Vercel

## Architecture

### App Router Structure

Two route groups with distinct layouts:
- `(auth)/` — Login, register, onboarding. Centered card layout with orange gradient background.
- `(main)/` — All authenticated pages. Mobile-first layout (`max-w-lg`) with `BottomNav` and `pb-20` for bottom nav spacing.
- `admin/` — Admin dashboard (not in a route group).

### Data Layer

- **Supabase clients**: `@/lib/supabase/server.ts` (server components/API routes, uses `server-only`) and `@/lib/supabase/client.ts` (browser client).
- **Drizzle schema**: `src/db/schema/` with barrel export from `index.ts`. Schema files: `users`, `clubs`, `places`, `content`, `chat`, `safety`, `reviews`, `social`.
- **Drizzle config**: Schema entry at `./src/db/schema/index.ts`, outputs to `./drizzle/`, PostgreSQL dialect.

### API Routes

All under `src/app/api/`. Two response utilities exist:
- `@/lib/api-utils.ts` — Simple `jsonResponse`/`errorResponse` helpers (used by older routes).
- `@/lib/api-response.ts` — Standardized `{ success, data }` / `{ success, error: { code, message } }` format with typed helpers (`successResponse`, `unauthorizedError`, `notFoundError`, etc.). **Prefer this for new routes.**

### UI Component Pattern

Components in `src/components/ui/` follow a consistent pattern:
- CVA for variant definitions
- `cn()` utility from `@/lib/utils` (clsx + tailwind-merge)
- Radix UI primitives as base
- `asChild` pattern via `@radix-ui/react-slot`
- Orange as primary brand color (`orange-500`)

### External Services

- **Firebase chat** (`@/lib/firebase/client.ts`): Lazy-initialized singleton with proxy pattern. Client-side only.
- **KakaoMap** (`@/lib/kakao/`): Map integration for meeting locations.
- **Toss Payments** (`@/lib/toss/`): Subscription payments.
- **Gemini AI** (`@/lib/gemini.ts`): Content generation for fortune/info articles (admin-triggered).
- **Push notifications** (`@/lib/notifications.ts`): VAPID Web Push.
- **Recommendation engine** (`@/lib/recommendation.ts`): Content-based + collaborative filtering scoring by hobby/region/age.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Environment Variables

Copy `.env.example` to `.env.local`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`. All others are optional for specific features (Firebase, KakaoMap, Toss, VAPID, Gemini).

## Conventions

- All user-facing strings are in Korean.
- Mobile-first design targeting senior users (larger touch targets, `h-12` default button height).
- Biome handles both linting and formatting — no ESLint or Prettier.
- DB schema uses `text` type for IDs (UUIDs as strings), `timestamp` for dates.
- Profile IDs reference Supabase auth user IDs directly.

### DB Table Naming (Shared Supabase)

This project shares a Supabase database with other projects. **All DB table names and enum names must use the `h_` prefix** to avoid conflicts.

- `pgTable("h_profiles", ...)` — not `pgTable("profiles", ...)`
- `pgEnum("h_subscription_tier", ...)` — not `pgEnum("subscription_tier", ...)`
- When creating new tables or enums, always prefix with `h_`
- When querying, use the Drizzle schema variables (e.g., `profiles`, `clubs`) — the `h_` prefix is only in the SQL table/enum name strings
- Column names inside tables do NOT need the `h_` prefix
