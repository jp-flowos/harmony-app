# W1 운영 기반 + 클럽 가입 실연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8월 첫 모임 코어 루프의 W1 조각 — 클럽 가입/탈퇴 실DB 연동, 클럽 상세 가입 버튼 wire + 라이브 멤버 수, 게스트 RSVP 전화번호 중복 방지, 그리고 배포 파이프라인 복원(git 자동배포·VAPID 키)을 완료한다.

**Architecture:** 클럽 가입은 `h_club_members` 복합 PK(clubId, userId) 위에 멱등 INSERT/DELETE로 구현. 클럽 상세는 이미 서버 컴포넌트 + client subtree 구조라 서버에서 membership/라이브 카운트를 조회해 props로 내리고, 클라이언트는 API 호출 후 `router.refresh()`. RSVP dedup은 같은 모임 + 같은 전화번호(하이픈 제거 비교)면 INSERT 대신 기존 행 UPDATE — 중복 정원 채움을 막으면서 게스트가 마음을 바꿀 수 있게 한다.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (postgres-js, `si_mvp` search_path), Supabase Auth SSR, Zod v4, Biome, Vercel CLI (npx).

**Spec:** `docs/superpowers/specs/2026-07-11-launch-roadmap-design.md` (W1 섹션)

## Global Constraints

- DB 테이블/enum 이름은 반드시 `h_` prefix. 이번 plan은 **새 테이블/마이그레이션 없음** — 기존 `h_club_members`, `h_meeting_rsvps`만 사용.
- **drizzle-kit generate/migrate 절대 금지.** (이번 plan은 DDL 자체가 없음)
- API 응답은 `@/lib/api-response`만 사용. `@/lib/api-utils` import 금지 (기존 스텁의 `jsonResponse` import는 제거 대상).
- `createClient`는 `@/lib/supabase/server` (async). 브라우저 코드는 fetch로 API 호출.
- Zod v4: 에러는 `.issues` (`.errors` 없음).
- 사용자 노출 문자열 전부 한국어 존댓말. 터치 타겟 최소 `h-12`.
- Biome: 2-space indent, double quotes, trailing commas ES5, 100자 폭. 검증 `bun run lint`.
- TypeScript 검증은 `bunx tsc --noEmit` (npx tsc는 이 환경에서 깨짐).
- 새 라우트 파일 추가 후 dev 서버 404가 나면 Turbopack hot-add 이슈 — `bun run dev` 재시작.
- 커밋은 `feature/w1-launch-loop` 브랜치에. 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 커밋/push 전 사용자 확인 (글로벌 규칙). 태스크 말미 커밋 단계에서 일괄 확인받아 진행.

## 검증 정책 (기존 plan들과 동일)

단위 테스트 러너 없음 (package.json에 test 스크립트/러너 부재 — 프로젝트 확립 패턴). 각 태스크는 ① `bunx tsc --noEmit` ② `bun run lint` ③ 런타임 검증(공개 API는 PowerShell `Invoke-RestMethod`/curl, 인증 필요 흐름은 브라우저 수동 스모크)으로 검증한다. dev 서버: `bun run dev` (http://localhost:3000).

---

## File Structure

```
Modify:
  src/app/api/clubs/[id]/join/route.ts          — TODO 스텁 → 실DB 가입/탈퇴 (auth + h_club_members)
  src/app/(main)/club/[id]/page.tsx             — membership status 포함 조회 + 라이브 memberCount
  src/app/(main)/club/[id]/ClubDetailClient.tsx — 가짜 useState 토글 → 실제 API 호출 + 역할별 버튼
  src/app/api/share/meetings/[id]/rsvp/route.ts — 전화번호 dedup (update-instead-of-insert)
  .env.local                                    — VAPID 3종 추가

Ops (코드 아님):
  Task 1: git push origin main:main, npx vercel git connect, VAPID 키 생성/등록
  Task 5: Supabase Kakao provider + Kakao Developers redirect URL (운영자 수동 체크리스트)
```

관련 기존 파일 (수정 없음, 참조용):
- `src/db/schema/clubs.ts` — `clubMembers` (복합 PK clubId+userId, role: owner/admin/member, status: active/banned), `meetingRsvps`
- `src/app/api/clubs/[id]/meetings/[mid]/join/route.ts` — 표준 패턴의 최신 예시 (카톡 웨지에서 작성)
- `src/lib/notifications.ts:28-33` — VAPID env 이름 3종의 소비처

---

### Task 1: 배포 파이프라인 복원 (main 동기화 + git 자동배포 + VAPID)

**Files:**
- Modify: `.env.local` (VAPID 3종 추가 — 시크릿이므로 커밋 금지 대상)
- Ops: git push, `npx vercel git connect`, `npx vercel env add`

**Interfaces:**
- Consumes: 로컬 `main` (origin보다 2커밋 앞), Vercel 프로젝트 링크 `.vercel/project.json` (projectId `prj_s0fQbB56k0CRPUVEaUn7CmBt3Soa`, team `flow-os`)
- Produces: origin/main 동기화 상태, GitHub push 시 자동배포, VAPID env 3종 (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`) — W2 알림 실체화의 선행 조건

- [ ] **Step 1: 로컬 main을 origin에 push (사용자 확인 후)**

로컬 main이 origin보다 2커밋 앞선 상태(프로덕션에 이미 배포된 share 픽스 2건)임을 사용자에게 알리고 push 확인을 받는다.

```bash
git fetch origin && git log --oneline origin/main..main
# 예상: bc797ab, 3746678 두 커밋만 표시
git push origin main:main
```

Expected: fast-forward push 성공. `git log --oneline origin/main..main`이 빈 출력.

- [ ] **Step 2: Vercel Git 자동배포 연결**

```bash
npx vercel git connect --yes
```

Expected: `Connected GitHub repository sjpjjang11/harmony-app` 류의 성공 메시지.
실패 시(권한/인터랙티브 요구): 사용자에게 Vercel 대시보드 → `flow-os/harmony` → Settings → Git → Connect Git Repository 수동 연결을 안내하고 완료 회신을 기다린다.

- [ ] **Step 3: VAPID 키 생성**

```bash
bunx web-push generate-vapid-keys
```

Expected: `Public Key:` / `Private Key:` 한 쌍 출력. 이 값을 다음 스텝들에서 사용.

- [ ] **Step 4: .env.local에 VAPID 3종 추가**

`.env.local` 끝에 추가 (실제 생성된 키로 치환):

```bash
# 푸시 알림 (VAPID) — 2026-07-13 생성
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Step 3의 Public Key>
VAPID_PRIVATE_KEY=<Step 3의 Private Key>
VAPID_EMAIL=mailto:jp@flowos.work
```

env 이름 3종은 `src/lib/notifications.ts:28-33`이 소비하는 정확한 이름이어야 한다.

- [ ] **Step 5: Vercel env 등록 (production + development)**

```bash
printf '%s' '<Public Key>' | npx vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
printf '%s' '<Private Key>' | npx vercel env add VAPID_PRIVATE_KEY production
printf '%s' 'mailto:jp@flowos.work' | npx vercel env add VAPID_EMAIL production
printf '%s' '<Public Key>' | npx vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY development
printf '%s' '<Private Key>' | npx vercel env add VAPID_PRIVATE_KEY development
printf '%s' 'mailto:jp@flowos.work' | npx vercel env add VAPID_EMAIL development
```

주의: CLI 51.4.0 버그로 preview 타겟은 git 브랜치를 강제함 — preview는 대시보드에서 "all preview branches"로 추가 (사용자 안내, W2 전까지만 완료되면 됨).

- [ ] **Step 6: 등록 검증**

```bash
npx vercel env ls
```

Expected: 3개 키가 Production/Development에 각각 표시.

- [ ] **Step 7: 커밋 없음 확인**

이 태스크는 코드 변경이 없다 (.env.local은 gitignore 대상). `git status`로 tracked 파일 변경이 없는지 확인만 한다.

```bash
git status --short
# 예상: .env.local은 표시되지 않음 (gitignored), 기존 ?? public/icons/만 표시
```

---

### Task 2: 클럽 가입/탈퇴 API 실DB 전환

**Files:**
- Modify: `src/app/api/clubs/[id]/join/route.ts` (전체 재작성 — 현재 TODO 스텁 + legacy `api-utils` 사용)

**Interfaces:**
- Consumes: `clubMembers`, `clubs` (`@/db/schema`), `@/lib/api-response`의 `errorResponse/forbiddenError/notFoundError/serverError/successResponse/unauthorizedError`, `createClient` (`@/lib/supabase/server`)
- Produces:
  - `POST /api/clubs/[id]/join` → 201 `{ success: true, data: { joined: true } }` (신규), 200 (이미 가입, 멱등), 401/404, 409 `APPROVAL_REQUIRED`, 403 (banned)
  - `DELETE /api/clubs/[id]/join` → 200 `{ success: true, data: { left: true } }`, 401/404, 409 `OWNER_CANNOT_LEAVE`, 403 (banned)
  - Task 3의 클라이언트가 이 두 엔드포인트를 호출

- [ ] **Step 1: 라우트 전체 재작성**

`src/app/api/clubs/[id]/join/route.ts` 전체를 다음으로 교체:

```typescript
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import {
  errorResponse,
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// POST /api/clubs/[id]/join - 클럽 가입
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [club] = await db
      .select({ id: clubs.id, joinType: clubs.joinType })
      .from(clubs)
      .where(eq(clubs.id, id))
      .limit(1);
    if (!club) return notFoundError("클럽을 찾을 수 없습니다");
    if (club.joinType === "approval") {
      return errorResponse("APPROVAL_REQUIRED", "승인제 클럽은 아직 준비 중이에요", 409);
    }

    const [existing] = await db
      .select({ status: clubMembers.status })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (existing?.status === "banned") {
      return forbiddenError("가입할 수 없는 클럽이에요");
    }
    if (existing) {
      // 이미 가입된 상태 — 멱등 처리
      return successResponse({ joined: true });
    }

    await db
      .insert(clubMembers)
      .values({ clubId: id, userId: user.id, role: "member", status: "active" })
      .onConflictDoNothing();

    return successResponse({ joined: true }, 201);
  } catch (err) {
    console.error("[club join POST]", err);
    return serverError();
  }
}

// DELETE /api/clubs/[id]/join - 클럽 탈퇴
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [membership] = await db
      .select({ role: clubMembers.role, status: clubMembers.status })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (!membership) return notFoundError("가입 내역이 없어요");
    if (membership.status === "banned") {
      // ban 기록 삭제 방지 — 탈퇴로 ban을 지우고 재가입하는 경로 차단
      return forbiddenError("처리할 수 없는 요청이에요");
    }
    if (membership.role === "owner") {
      return errorResponse("OWNER_CANNOT_LEAVE", "모임장은 탈퇴할 수 없어요", 409);
    }

    await db
      .delete(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)));

    return successResponse({ left: true });
  } catch (err) {
    console.error("[club join DELETE]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 타입/린트 검증**

```bash
bunx tsc --noEmit && bun run lint
```

Expected: 둘 다 에러 0.

- [ ] **Step 3: 런타임 검증 — 비인증 401**

dev 서버 실행 중 상태에서 (새 파일 아님 → 재시작 불필요):

```powershell
Invoke-WebRequest -Method POST -Uri http://localhost:3000/api/clubs/anything/join -SkipHttpErrorCheck | Select-Object StatusCode, Content
```

Expected: `401`, body에 `"success":false` + UNAUTHORIZED 계열 코드.

- [ ] **Step 4: 런타임 검증 — 브라우저 스모크 (인증 경로)**

Task 3 완료 후 통합 스모크에서 함께 검증한다 (버튼 없이는 인증 POST를 만들기 번거로움). 이 시점에서는 401 경로만 확인하고 넘어간다.

- [ ] **Step 5: 커밋 (사용자 확인 후)**

```bash
git add "src/app/api/clubs/[id]/join/route.ts"
git commit -m "feat(club): wire join/leave api to h_club_members

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 클럽 상세 가입 버튼 wire + 라이브 멤버 수

**Files:**
- Modify: `src/app/(main)/club/[id]/page.tsx`
- Modify: `src/app/(main)/club/[id]/ClubDetailClient.tsx`

**Interfaces:**
- Consumes: Task 2의 `POST/DELETE /api/clubs/[id]/join`. 에러 응답 shape `{ success: false, error: { code, message } }`.
- Produces: `ClubDetailClient` props에 `myRole: "owner" | "admin" | "member" | null` 추가, `club.memberCount`는 `h_club_members` status='active' 라이브 카운트.

- [ ] **Step 1: page.tsx — membership에 status 추가 + 라이브 카운트 조회**

`src/app/(main)/club/[id]/page.tsx`의 membership 조회(20-24행)를 다음으로 교체:

```typescript
  const [membership] = await db
    .select({ role: clubMembers.role, status: clubMembers.status })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
    .limit(1);

  const [{ memberCount }] = await db
    .select({ memberCount: sql<number>`count(*)::int` })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.status, "active")));

  const myRole = membership?.status === "active" ? (membership.role ?? "member") : null;
```

- [ ] **Step 2: page.tsx — props 전달 교체**

return의 `<ClubDetailClient>` 호출에서:

- `memberCount: club.memberCount ?? 0` → `memberCount` (라이브 값)
- `canCreateMeeting={membership?.role === "owner" || membership?.role === "admin"}` → `canCreateMeeting={myRole === "owner" || myRole === "admin"}`
- prop 추가: `myRole={myRole}`

```typescript
  return (
    <ClubDetailClient
      club={{
        id: club.id,
        name: club.name,
        category: club.category,
        region: club.region,
        description: club.description,
        memberCount,
      }}
      meetings={meetingRows.map((m) => ({
        id: m.id,
        title: m.title,
        dateLabel: formatMeetingDate(m.date),
        location: m.location,
        joinedCount: m.joinedCount,
        maxParticipants: m.maxParticipants ?? 20,
      }))}
      canCreateMeeting={myRole === "owner" || myRole === "admin"}
      myRole={myRole}
    />
  );
```

- [ ] **Step 3: ClubDetailClient.tsx — props 타입 + 실제 가입 핸들러**

(a) import 추가: `import { useRouter } from "next/navigation";`

(b) 컴포넌트 시그니처를 다음으로 교체:

```typescript
export function ClubDetailClient({
  club,
  meetings,
  canCreateMeeting,
  myRole,
}: {
  club: ClubInfo;
  meetings: MeetingItem[];
  canCreateMeeting: boolean;
  myRole: "owner" | "admin" | "member" | null;
}) {
```

(c) 본문 상단 `const [joined, setJoined] = useState(false);`를 다음으로 교체 (MeetingDetailClient의 확립된 에러 패턴과 동일):

```typescript
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joined = myRole !== null;

  async function handleJoinToggle() {
    if (joined && !window.confirm("클럽에서 탈퇴할까요?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}/join`, {
        method: joined ? "DELETE" : "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "요청에 실패했어요. 다시 시도해주세요");
        return;
      }
      router.refresh();
    } catch {
      setError("요청에 실패했어요. 다시 시도해주세요");
    } finally {
      setPending(false);
    }
  }
```

- [ ] **Step 4: ClubDetailClient.tsx — 버튼 블록 교체**

기존 `<Button className="mt-4 w-full max-w-xs" ... >{joined ? "가입됨 ✓" : "클럽 가입하기"}</Button>`을 다음으로 교체 (owner는 탈퇴 불가 → 버튼 대신 라벨):

```tsx
        {myRole === "owner" ? (
          <p className="mt-4 text-base font-medium text-orange-600">내가 만든 클럽이에요</p>
        ) : (
          <Button
            className="mt-4 w-full max-w-xs"
            size="lg"
            variant={joined ? "outline" : "default"}
            disabled={pending}
            onClick={handleJoinToggle}
          >
            {pending ? "처리 중..." : joined ? "가입됨 ✓ (누르면 탈퇴)" : "클럽 가입하기"}
          </Button>
        )}
        {error && <p className="mt-2 text-base text-red-600">{error}</p>}
```

- [ ] **Step 5: 타입/린트 검증**

```bash
bunx tsc --noEmit && bun run lint
```

Expected: 에러 0. (`useState` unused import가 생기면 안 됨 — `pending`이 useState 사용하므로 유지)

- [ ] **Step 6: 브라우저 통합 스모크 (Task 2 + 3)**

`bun run dev` 상태에서 브라우저 수동 검증 (owner 아닌 계정 필요 — 없으면 신규 가입):

1. 비-owner 계정으로 클럽 상세 진입 → "클럽 가입하기" 클릭 → 버튼이 "가입됨 ✓ (누르면 탈퇴)"로 바뀌고 멤버 수 +1 (router.refresh 반영)
2. 새로고침 → 가입 상태 유지 (DB 영속 확인)
3. 같은 버튼 재클릭 → confirm 후 탈퇴 → "클럽 가입하기"로 복귀, 멤버 수 -1
4. owner 계정으로 진입 → 버튼 대신 "내가 만든 클럽이에요" 표시
5. (DB 직접 확인, 선택) Supabase Studio에서 `h_club_members` 행 생성/삭제 확인

Expected: 5개 전부 통과. 실패 시 원인 수정 후 재검증.

- [ ] **Step 7: 커밋 (사용자 확인 후)**

```bash
git add "src/app/(main)/club/[id]/page.tsx" "src/app/(main)/club/[id]/ClubDetailClient.tsx"
git commit -m "feat(club): real join button + live member count on club detail

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 게스트 RSVP 전화번호 중복 방지

**Files:**
- Modify: `src/app/api/share/meetings/[id]/rsvp/route.ts`

**Interfaces:**
- Consumes: 기존 `RsvpSchema` (guestName/guestPhone/status), `meetingRsvps` 스키마
- Produces: 같은 모임 + 같은 전화번호(하이픈 무시 비교) 재응답 시 새 행 대신 기존 행 UPDATE. 응답 200 `{ id, guestName, status, updated: true }`. 전화번호 미입력 응답은 기존과 동일하게 INSERT (dedup 불가). 신규 INSERT 응답은 기존 201 유지.

- [ ] **Step 1: dedup 로직 삽입**

`src/app/api/share/meetings/[id]/rsvp/route.ts`에서 `RSVP_CAP` 체크 블록(47-53행)의 **앞**, meeting past 체크 직후에 다음 블록을 삽입:

```typescript
    // 같은 전화번호의 기존 응답이 있으면 새 행 대신 업데이트 (중복 정원 채움 방지 + 마음 바꾸기 허용)
    const phoneDigits = parsed.data.guestPhone?.replace(/-/g, "");
    if (phoneDigits) {
      const [existing] = await db
        .select({ id: meetingRsvps.id, status: meetingRsvps.status })
        .from(meetingRsvps)
        .where(
          and(
            eq(meetingRsvps.meetingId, id),
            sql`replace(${meetingRsvps.guestPhone}, '-', '') = ${phoneDigits}`
          )
        )
        .limit(1);

      if (existing) {
        if (parsed.data.status === "joined" && existing.status !== "joined") {
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

        await db
          .update(meetingRsvps)
          .set({ guestName: parsed.data.guestName, status: parsed.data.status })
          .where(eq(meetingRsvps.id, existing.id));

        return successResponse(
          { id: existing.id, guestName: parsed.data.guestName, status: parsed.data.status, updated: true }
        );
      }
    }
```

import 라인 수정: `import { eq, sql } from "drizzle-orm";` → `import { and, eq, sql } from "drizzle-orm";`

기존 RSVP_CAP → 정원 체크 → INSERT 경로는 그대로 유지 (existing이 없거나 전화번호 미입력일 때만 도달).

- [ ] **Step 2: 타입/린트 검증**

```bash
bunx tsc --noEmit && bun run lint
```

Expected: 에러 0.

- [ ] **Step 3: 런타임 검증 — 공개 API 직접 호출**

dev 서버에서, 실제 존재하는 미래 모임 ID 하나를 골라 (`h_club_meetings`에서 조회하거나 브라우저에서 초대장 URL 확인):

```powershell
$body = @{ guestName = "테스트게스트"; guestPhone = "010-1234-5678"; status = "joined" } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/share/meetings/<MEETING_ID>/rsvp -ContentType "application/json" -Body $body
# 1차: 201, updated 없음 (신규 INSERT)

$body2 = @{ guestName = "테스트게스트"; guestPhone = "01012345678"; status = "declined" } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/share/meetings/<MEETING_ID>/rsvp -ContentType "application/json" -Body $body2
# 2차: 200, updated=true (하이픈 유무 달라도 같은 번호로 매칭 → status 변경)
```

Expected: 2차 호출 후 `h_meeting_rsvps`에 해당 번호 행이 **1개**이고 status가 declined. (Supabase Studio 또는 3차 joined 재호출로 확인)

- [ ] **Step 4: 검증 데이터 정리**

Supabase Studio에서 테스트로 넣은 `h_meeting_rsvps` 행 삭제 (guestName "테스트게스트").

- [ ] **Step 5: 커밋 (사용자 확인 후)**

```bash
git add "src/app/api/share/meetings/[id]/rsvp/route.ts"
git commit -m "fix(share): dedupe guest rsvp by phone number

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 최종 검증 + 운영자 수동 체크리스트 (Kakao OAuth)

**Files:**
- 없음 (검증 + 운영자 안내)

**Interfaces:**
- Consumes: Task 1-4 전체 결과
- Produces: W1 완료 판정, 운영자(사용자)가 처리할 콘솔 작업 목록

- [ ] **Step 1: 전체 fresh 검증**

```bash
bunx tsc --noEmit && bun run lint && bun run build
```

Expected: 셋 다 성공. build 실패 시 원인 수정 후 재실행.

- [ ] **Step 2: 운영자 수동 체크리스트 전달**

아래 목록을 사용자에게 전달하고 각 항목 완료 여부를 확인받는다 (코드 밖 콘솔 작업 — Claude가 대신 못 함):

1. **Supabase 콘솔**: Authentication → Providers → Kakao 활성화, Kakao REST API 키 + Client Secret 입력
2. **Kakao Developers 콘솔**: 원본 앱 "하모니"(ID 1509591)에 Redirect URI 등록 — Supabase가 표시하는 콜백 URL (`https://<project-ref>.supabase.co/auth/v1/callback`)
   - 주의: 테스트 앱("하모니-TEST")이 아니라 **원본 앱**에 등록 (키/도메인 등록이 앱별로 분리됨)
3. **검증**: 프로덕션 `https://harmony-tawny-iota.vercel.app/login`에서 카카오 로그인 버튼 → 실제 로그인 성공 확인
4. (Task 1 Step 2가 수동 폴백이었다면) Vercel 대시보드 Git 연결 완료 확인

- [ ] **Step 3: 브랜치 마무리**

superpowers:finishing-a-development-branch 스킬로 진행 — main 머지/PR 여부는 사용자 선택. 머지 push가 Task 1에서 복원한 git 자동배포를 처음으로 트리거하므로, push 후 Vercel 대시보드에서 자동 배포 시작을 확인하면 Task 1 Step 2의 최종 검증이 된다.
