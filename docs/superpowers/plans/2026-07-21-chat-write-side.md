# 채팅 write-side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅의 write-side(클럽 그룹채팅 자동생성·읽음추적·1:1 DM 수락)를 구현해 목록/방/DM이 실제 동작하게 만든다.

**Architecture:** 클럽방은 클럽 생성/가입 트랜잭션에서 `ensureClubRoom`+`addRoomMember`로 동기화(유일성은 `club_id` 부분 유니크 인덱스). `last_message_at`은 `h_chat_messages` AFTER INSERT DB 트리거(SECURITY DEFINER)로 갱신, `last_read_at`은 방 입장 서버 컴포넌트에서 갱신. 1:1 DM은 기존 `h_chat_requests`를 수락 엔드포인트가 private 방으로 승격.

**Tech Stack:** Next.js 16 App Router, React 19, Bun, Drizzle ORM(Supabase Postgres, schema `si_mvp`), Supabase Auth SSR, Biome, `bun test`.

## Global Constraints

- DB 테이블/enum 이름은 SQL 문자열에서 `h_` 접두사 사용. 컬럼명은 접두사 없음.
- 스키마/DB 변경은 `supabase/migrations/*.sql`이 유일한 source of truth. **drizzle-kit generate/migrate 금지.**
- 새 API 라우트는 `@/lib/api-response.ts`(`successResponse`/`errorResponse`/`unauthorizedError`/`forbiddenError`/`notFoundError`/`validationError`/`serverError`) + `supabase.auth.getUser()` 인증 + Zod(입력 있으면) + Drizzle 사용.
- Next.js 16: 인증은 `src/proxy.ts`가 담당(비-`/api` 페이지), 라우트 핸들러는 자체 `getUser()` 체크.
- 모든 사용자 대면 문자열은 한국어.
- `last_message_at` 트리거 함수는 반드시 `security definer` + `set search_path` 고정.
- TODO/stub/mock 금지 — 시작한 기능은 완성.
- 각 태스크 종료 시 검증: `bunx tsc --noEmit`(0 errors) + `bunx biome lint <변경파일>`(clean). 순수 로직은 `bun test`. DB/라우트/컴포넌트는 이 저장소에 DB 통합 테스트 하네스가 없으므로 tsc+biome+수동 스모크로 검증(저장소 관례).
- 커밋 메시지는 저장소 관례(Conventional Commits, 한국어 본문) 따르고 아래 트레일러로 끝냄:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## File Structure

- **신규**
  - `supabase/migrations/<YYYYMMDDHHMMSS>_chat_write_side.sql` — club_id 부분 유니크 인덱스 + last_message_at 트리거 + 백필
  - `src/lib/chat/rooms.ts` — 방 생성/멤버 동기 헬퍼(트랜잭션 내부 사용)
  - `src/lib/queries/chat-requests.ts` — `isChatRequestActionable`(순수) + `getReceivedChatRequests`
  - `src/app/api/chat/request/[id]/accept/route.ts` — 수락 → private 방 승격
  - `src/app/api/chat/request/[id]/reject/route.ts` — 거절
- **수정**
  - `src/app/api/clubs/route.ts` — 클럽 생성 시 방+owner
  - `src/app/api/clubs/[id]/join/route.ts` — 가입 시 방+멤버 / 탈퇴 시 멤버 제거
  - `src/app/(main)/chat/[id]/page.tsx` — 멤버십 체크 + 읽음 갱신
  - `src/lib/queries/chat.ts` — private 상대 닉네임 + 차단 필터
  - `src/app/(main)/chat/page.tsx` — 받은 요청도 로드
  - `src/app/(main)/chat/ChatListClient.tsx` — 받은 요청 인라인 섹션
  - `src/app/(main)/club/[id]/page.tsx` + `ClubDetailClient.tsx` — clubRoomId 조회 + "채팅 참여하기" wire
- **삭제**
  - `src/app/api/chat/rooms/route.ts` — 미사용 TODO stub(소비처 없음 확인됨)

---

### Task 1: 마이그레이션 (유일성 인덱스 + last_message_at 트리거 + 백필)

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_chat_write_side.sql`

**Interfaces:**
- Produces: `h_chat_rooms(club_id) where type='club'` 유니크 보장; `h_chat_messages` INSERT 시 `h_chat_rooms.last_message_at` 자동 갱신; 기존 클럽/멤버 백필.

- [ ] **Step 1: 마이그레이션 파일 작성**

파일명 타임스탬프는 기존 파일들과 같은 형식(`date +%Y%m%d%H%M%S`)으로 생성. 내용:

```sql
-- 채팅 write-side: 클럽방 유일성 + last_message_at 트리거 + 백필
set search_path = si_mvp, public, extensions;

-- 1. 클럽당 채팅방 1개 보장 (type='club' 부분 유니크)
create unique index if not exists h_idx_chat_rooms_club_unique
  on h_chat_rooms (club_id)
  where type = 'club';

-- 2. 메시지 INSERT 시 해당 방의 last_message_at 갱신.
--    브라우저(anon+JWT)가 insert하므로 SECURITY DEFINER로 소유자 권한에서 갱신.
create or replace function fn_touch_chat_room_last_message()
returns trigger
language plpgsql
security definer
set search_path = si_mvp, public
as $$
begin
  update h_chat_rooms
    set last_message_at = new.created_at
    where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_chat_room_last_message on h_chat_messages;
create trigger trg_touch_chat_room_last_message
  after insert on h_chat_messages
  for each row
  execute function fn_touch_chat_room_last_message();

-- 3. 백필: 기존 클럽에 채팅방 생성 + active 멤버 room membership (재실행 안전)
insert into h_chat_rooms (id, type, name, club_id, created_at)
  select gen_random_uuid()::text, 'club', c.name, c.id, now()
  from h_clubs c
  where not exists (
    select 1 from h_chat_rooms r where r.club_id = c.id and r.type = 'club'
  );

insert into h_chat_room_members (room_id, user_id, joined_at)
  select r.id, cm.user_id, now()
  from h_club_members cm
  join h_chat_rooms r on r.club_id = cm.club_id and r.type = 'club'
  where cm.status = 'active'
  on conflict (room_id, user_id) do nothing;
```

- [ ] **Step 2: 마이그레이션 적용**

Run: `bun run db:setup`  (= `bunx supabase db push`)
Expected: 새 마이그레이션이 적용되고 오류 없음.

- [ ] **Step 3: 적용 결과 검증 (DB 쿼리)**

Drizzle Studio(`bun run db:studio`) 또는 psql로 확인:
- `select count(*) from si_mvp.h_chat_rooms where type='club';` == `select count(*) from si_mvp.h_clubs;`
- 트리거 존재: `select tgname from pg_trigger where tgname = 'trg_touch_chat_room_last_message';` → 1행
- 인덱스 존재: `select indexname from pg_indexes where indexname = 'h_idx_chat_rooms_club_unique';` → 1행

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "$(cat <<'EOF'
feat(chat): 클럽방 유일성 인덱스·last_message_at 트리거·백필 마이그레이션

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 방 헬퍼 (`src/lib/chat/rooms.ts`)

**Files:**
- Create: `src/lib/chat/rooms.ts`

**Interfaces:**
- Consumes: Task 1의 `club_id` 유니크 인덱스.
- Produces:
  - `ensureClubRoom(tx, clubId: string, name: string): Promise<string>` — 클럽방 id
  - `addRoomMember(tx, roomId: string, userId: string): Promise<void>`
  - `removeRoomMember(tx, roomId: string, userId: string): Promise<void>`
  - `findOrCreatePrivateRoom(tx, userA: string, userB: string): Promise<string>` — private 방 id
  - `type ChatTx` (트랜잭션 핸들 타입)

- [ ] **Step 1: 헬퍼 작성**

```ts
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatRoomMembers, chatRooms } from "@/db/schema";

// db.transaction 콜백이 받는 tx 핸들 타입. 모든 헬퍼는 트랜잭션 내부에서 호출된다.
export type ChatTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// 클럽방이 없으면 생성하고 방 id를 돌려준다. club_id 부분 유니크로 idempotent.
export async function ensureClubRoom(tx: ChatTx, clubId: string, name: string): Promise<string> {
  await tx
    .insert(chatRooms)
    .values({ id: crypto.randomUUID(), type: "club", name, clubId })
    .onConflictDoNothing();
  const [room] = await tx
    .select({ id: chatRooms.id })
    .from(chatRooms)
    .where(and(eq(chatRooms.clubId, clubId), eq(chatRooms.type, "club")))
    .limit(1);
  return room.id;
}

export async function addRoomMember(tx: ChatTx, roomId: string, userId: string): Promise<void> {
  await tx.insert(chatRoomMembers).values({ roomId, userId }).onConflictDoNothing();
}

export async function removeRoomMember(tx: ChatTx, roomId: string, userId: string): Promise<void> {
  await tx
    .delete(chatRoomMembers)
    .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));
}

// 두 사람이 정확히 멤버인 기존 private 방을 재사용, 없으면 생성.
export async function findOrCreatePrivateRoom(
  tx: ChatTx,
  userA: string,
  userB: string
): Promise<string> {
  const existing = (await tx.execute(sql`
    select r.id
    from si_mvp.h_chat_rooms r
    join si_mvp.h_chat_room_members m1 on m1.room_id = r.id and m1.user_id = ${userA}
    join si_mvp.h_chat_room_members m2 on m2.room_id = r.id and m2.user_id = ${userB}
    where r.type = 'private'
      and (select count(*) from si_mvp.h_chat_room_members m where m.room_id = r.id) = 2
    limit 1
  `)) as unknown as { id: string }[];
  if (existing[0]?.id) return existing[0].id;

  const roomId = crypto.randomUUID();
  await tx.insert(chatRooms).values({ id: roomId, type: "private" });
  await tx
    .insert(chatRoomMembers)
    .values([
      { roomId, userId: userA },
      { roomId, userId: userB },
    ])
    .onConflictDoNothing();
  return roomId;
}
```

- [ ] **Step 2: 타입체크**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Lint**

Run: `bunx biome lint src/lib/chat/rooms.ts`
Expected: 오류 없음.

- [ ] **Step 4: Commit**

```bash
git add src/lib/chat/rooms.ts
git commit -m "$(cat <<'EOF'
feat(chat): 방 생성·멤버 동기 헬퍼 (ensureClubRoom/addRoomMember/findOrCreatePrivateRoom)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 클럽 생성/가입/탈퇴에 방 동기 훅

**Files:**
- Modify: `src/app/api/clubs/route.ts` (POST 트랜잭션)
- Modify: `src/app/api/clubs/[id]/join/route.ts` (POST/DELETE 트랜잭션)

**Interfaces:**
- Consumes: `ensureClubRoom`, `addRoomMember`, `removeRoomMember` (Task 2).

- [ ] **Step 1: 클럽 생성 훅 추가** — `src/app/api/clubs/route.ts`

상단 import에 추가:
```ts
import { addRoomMember, ensureClubRoom } from "@/lib/chat/rooms";
```
POST의 트랜잭션 블록(현재 `await tx.insert(clubMembers)...` 다음)을 다음으로 교체:
```ts
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
      const roomId = await ensureClubRoom(tx, clubId, club.name);
      await addRoomMember(tx, roomId, user.id);
      return club;
    });
```

- [ ] **Step 2: 클럽 가입/탈퇴 훅 추가** — `src/app/api/clubs/[id]/join/route.ts`

상단 import에 추가:
```ts
import { chatRooms } from "@/db/schema";
import { addRoomMember, ensureClubRoom, removeRoomMember } from "@/lib/chat/rooms";
```
(참고: 파일 상단의 `import { clubMembers, clubs } from "@/db/schema";`에 `chatRooms`를 합쳐도 됨.)

POST에서 클럽 조회 select에 `name` 추가:
```ts
    const [club] = await db
      .select({ id: clubs.id, joinType: clubs.joinType, name: clubs.name })
      .from(clubs)
      .where(eq(clubs.id, id))
      .limit(1);
```
POST의 가입 트랜잭션을 다음으로 교체:
```ts
    await db.transaction(async (tx) => {
      await tx
        .insert(clubMembers)
        .values({ clubId: id, userId: user.id, role: "member", status: "active" })
        .onConflictDoNothing();
      await tx
        .update(clubs)
        .set({ memberCount: activeMemberCount(id) })
        .where(eq(clubs.id, id));
      const roomId = await ensureClubRoom(tx, id, club.name);
      await addRoomMember(tx, roomId, user.id);
    });
```
DELETE(탈퇴)의 트랜잭션을 다음으로 교체:
```ts
    await db.transaction(async (tx) => {
      await tx
        .delete(clubMembers)
        .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)));
      await tx
        .update(clubs)
        .set({ memberCount: activeMemberCount(id) })
        .where(eq(clubs.id, id));
      const [room] = await tx
        .select({ id: chatRooms.id })
        .from(chatRooms)
        .where(and(eq(chatRooms.clubId, id), eq(chatRooms.type, "club")))
        .limit(1);
      if (room) await removeRoomMember(tx, room.id, user.id);
    });
```

- [ ] **Step 3: 타입체크 + Lint**

Run: `bunx tsc --noEmit && bunx biome lint "src/app/api/clubs/route.ts" "src/app/api/clubs/[id]/join/route.ts"`
Expected: 0 errors, lint clean.

- [ ] **Step 4: 수동 스모크**

`bun run dev` 실행 후:
1. 새 클럽 생성 → DB에서 `h_chat_rooms`에 그 클럽의 방 1개 + `h_chat_room_members`에 owner 1행.
2. 다른 계정으로 그 클럽 가입 → `h_chat_room_members`에 가입자 행 추가.
3. 가입자 탈퇴 → 해당 행 삭제, 방은 유지.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/clubs/route.ts" "src/app/api/clubs/[id]/join/route.ts"
git commit -m "$(cat <<'EOF'
feat(chat): 클럽 생성/가입/탈퇴 시 클럽 채팅방 멤버십 동기화

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 클럽 상세 "채팅 참여하기" 연결

**Files:**
- Modify: `src/app/(main)/club/[id]/page.tsx` (로더에서 clubRoomId 조회 후 ClubDetailClient에 전달)
- Modify: `src/app/(main)/club/[id]/ClubDetailClient.tsx` (채팅 탭 버튼 wire)

**Interfaces:**
- Consumes: 클럽방(Task 1 백필/Task 3 훅)의 존재.

- [ ] **Step 1: 로더에서 clubRoomId 조회** — `src/app/(main)/club/[id]/page.tsx`

`chatRooms` import 추가(기존 `@/db/schema` import 라인에 병합 가능):
```ts
import { chatRooms } from "@/db/schema";
```
클럽 데이터 로드부(멤버/공지 조회 근처)에 방 id 조회 추가:
```ts
  const [clubRoom] = await db
    .select({ id: chatRooms.id })
    .from(chatRooms)
    .where(and(eq(chatRooms.clubId, id), eq(chatRooms.type, "club")))
    .limit(1);
  const clubRoomId = clubRoom?.id ?? null;
```
(파일에 `and`,`eq`가 이미 import되어 있지 않으면 `drizzle-orm`에서 추가.)
`<ClubDetailClient .../>`에 prop 전달:
```tsx
        clubRoomId={clubRoomId}
```

- [ ] **Step 2: ClubDetailClient에서 버튼 연결** — `src/app/(main)/club/[id]/ClubDetailClient.tsx`

props 타입에 추가(컴포넌트 props interface):
```ts
  clubRoomId: string | null;
```
함수 시그니처 구조분해에 `clubRoomId` 추가. 채팅 탭(현재 `onClick={() => {}}` 버튼)을 다음으로 교체:
```tsx
          <TabsContent value="chat">
            <div className="py-8 text-center">
              <ChatCircle size={48} className="mx-auto text-gray-300" />
              <p className="mt-3 text-base text-gray-400">클럽 채팅방</p>
              {isMember && clubRoomId ? (
                <Link href={`/chat/${clubRoomId}`} className="mt-3 inline-block">
                  <Button>채팅 참여하기</Button>
                </Link>
              ) : (
                <p className="mt-3 text-base text-gray-400">가입하면 채팅에 참여할 수 있어요</p>
              )}
            </div>
          </TabsContent>
```
(`isMember`는 이 컴포넌트가 이미 보유한 가입여부 값. 이름이 다르면 해당 값 사용 — 예: `canManageNotices`와 같은 계열의 멤버십 플래그. `Link`가 import 안 되어 있으면 `next/link`에서 추가.)

- [ ] **Step 3: 타입체크 + Lint**

Run: `bunx tsc --noEmit && bunx biome lint "src/app/(main)/club/[id]/page.tsx" "src/app/(main)/club/[id]/ClubDetailClient.tsx"`
Expected: 0 errors, lint clean.

- [ ] **Step 4: 수동 스모크**

가입한 클럽 상세 → 채팅 탭 → "채팅 참여하기" → `/chat/<clubRoomId>`로 이동하고 방이 열림. 비멤버는 안내 문구.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main)/club/[id]/page.tsx" "src/app/(main)/club/[id]/ClubDetailClient.tsx"
git commit -m "$(cat <<'EOF'
feat(chat): 클럽 상세 '채팅 참여하기'를 클럽 채팅방으로 연결

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 방 입장 멤버십 체크 + 읽음 갱신

**Files:**
- Modify: `src/app/(main)/chat/[id]/page.tsx`

**Interfaces:**
- Consumes: `h_chat_room_members` 멤버십 행(Task 3/1).

- [ ] **Step 1: 멤버십 체크 + 읽음 갱신 추가** — `src/app/(main)/chat/[id]/page.tsx`

import에 `and` 추가 및 `chatRoomMembers` 추가:
```ts
import { and, eq } from "drizzle-orm";
import { chatRoomMembers, profiles } from "@/db/schema";
```
`me` 조회 다음에 삽입(멤버 아니면 리다이렉트, 맞으면 읽음 마킹):
```ts
  const [membership] = await db
    .select({ userId: chatRoomMembers.userId })
    .from(chatRoomMembers)
    .where(and(eq(chatRoomMembers.roomId, id), eq(chatRoomMembers.userId, user.id)))
    .limit(1);
  if (!membership) redirect("/chat");

  await db
    .update(chatRoomMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatRoomMembers.roomId, id), eq(chatRoomMembers.userId, user.id)));
```

- [ ] **Step 2: 타입체크 + Lint**

Run: `bunx tsc --noEmit && bunx biome lint "src/app/(main)/chat/[id]/page.tsx"`
Expected: 0 errors, lint clean.

- [ ] **Step 3: 수동 스모크**

1. 내가 멤버인 방 URL 접속 → 정상 렌더 + DB에서 내 `last_read_at` 갱신됨.
2. 멤버 아닌 임의 방 id 접속 → `/chat`로 redirect.
3. 새 메시지 온 방을 열었다가 목록으로 → 미읽음 뱃지 사라짐(Task 6 후 완전 확인).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/chat/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(chat): 방 입장 시 멤버십 체크 + 읽음(last_read_at) 갱신

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 채팅 목록 — 1:1 상대 닉네임 + 차단 필터

**Files:**
- Modify: `src/lib/queries/chat.ts`

**Interfaces:**
- Consumes: `blocks` 테이블(`h_blocks`), `profiles`.
- Produces: `getMyChatRooms(userId)`는 private 방 이름을 상대 닉네임으로, 차단관계 1:1 방을 제외.

- [ ] **Step 1: `getMyChatRooms` 전체 교체** — `src/lib/queries/chat.ts`

파일 전체를 다음으로 교체:
```ts
import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { blocks, chatRoomMembers, chatRooms, clubs } from "@/db/schema";

export type ChatRoomSummary = {
  id: string;
  name: string;
  type: "club" | "private" | "open";
  lastMessage: string;
  lastMessageAt: Date | null;
  unread: boolean;
};

// 내가 속한 채팅방 목록 — 최근 메시지순. 1:1 방은 상대 닉네임을 이름으로,
// 차단 관계인 상대의 1:1 방은 제외한다.
export async function getMyChatRooms(userId: string): Promise<ChatRoomSummary[]> {
  const rooms = await db
    .select({
      id: chatRooms.id,
      type: chatRooms.type,
      name: chatRooms.name,
      clubName: clubs.name,
      lastMessageAt: chatRooms.lastMessageAt,
      lastReadAt: chatRoomMembers.lastReadAt,
      otherUserId: sql<string | null>`(
        select m.user_id from si_mvp.h_chat_room_members m
        where m.room_id = ${chatRooms.id} and m.user_id <> ${userId} limit 1
      )`,
      otherNickname: sql<string | null>`(
        select p.nickname from si_mvp.h_chat_room_members m
        join si_mvp.h_profiles p on p.id = m.user_id
        where m.room_id = ${chatRooms.id} and m.user_id <> ${userId} limit 1
      )`,
    })
    .from(chatRoomMembers)
    .innerJoin(chatRooms, eq(chatRoomMembers.roomId, chatRooms.id))
    .leftJoin(clubs, eq(chatRooms.clubId, clubs.id))
    .where(eq(chatRoomMembers.userId, userId))
    .orderBy(sql`${chatRooms.lastMessageAt} desc nulls last`);

  if (rooms.length === 0) return [];

  // 차단 관계인 상대의 1:1 방 제외
  const privateOthers = rooms
    .filter((r) => r.type !== "club" && r.otherUserId)
    .map((r) => r.otherUserId as string);
  const blocked = new Set<string>();
  if (privateOthers.length > 0) {
    const blockRows = await db
      .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, userId), inArray(blocks.blockedId, privateOthers)),
          and(eq(blocks.blockedId, userId), inArray(blocks.blockerId, privateOthers))
        )
      );
    for (const b of blockRows) {
      blocked.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }
  }
  const visible = rooms.filter((r) => !(r.otherUserId && blocked.has(r.otherUserId)));
  if (visible.length === 0) return [];

  // 방별 최신 메시지 미리보기 + 발신자 (윈도우 함수로 한 번에)
  const ids = visible.map((r) => r.id);
  const previews = await db.execute(sql`
    select room_id, content, sender_id
    from (
      select room_id, content, sender_id,
             row_number() over (partition by room_id order by created_at desc) as rn
      from si_mvp.h_chat_messages
      where is_deleted = false
        and room_id in (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `
        )})
    ) ranked
    where rn = 1
  `);
  const previewByRoom = new Map<string, string>();
  const lastSenderByRoom = new Map<string, string>();
  for (const row of previews as unknown as {
    room_id: string;
    content: string;
    sender_id: string;
  }[]) {
    previewByRoom.set(row.room_id, row.content);
    lastSenderByRoom.set(row.room_id, row.sender_id);
  }

  return visible.map((r) => ({
    id: r.id,
    name: r.name ?? r.clubName ?? r.otherNickname ?? "채팅방",
    type: r.type,
    lastMessage: previewByRoom.get(r.id) ?? "",
    lastMessageAt: r.lastMessageAt ?? null,
    // 마지막 메시지가 내 것이면 안읽음으로 보지 않는다
    unread: Boolean(
      r.lastMessageAt &&
        (!r.lastReadAt || r.lastMessageAt > r.lastReadAt) &&
        lastSenderByRoom.get(r.id) !== userId
    ),
  }));
}
```

- [ ] **Step 2: 타입체크 + Lint**

Run: `bunx tsc --noEmit && bunx biome lint src/lib/queries/chat.ts`
Expected: 0 errors, lint clean.

- [ ] **Step 3: 수동 스모크**

1. 클럽방에 메시지 전송 → `/chat` 목록에서 그 방이 최상단 + 최근시간 표시.
2. 상대가 보낸 메시지가 있는 방 → 미읽음 뱃지 표시, 방 열면 사라짐.
3. 1:1 방 → 이름이 상대 닉네임. 상대를 차단하면 목록에서 사라짐.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries/chat.ts
git commit -m "$(cat <<'EOF'
feat(chat): 채팅 목록에 1:1 상대 닉네임 표시 + 차단 관계 방 제외

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 받은 채팅 요청 조회 (`chat-requests.ts`)

**Files:**
- Create: `src/lib/queries/chat-requests.ts`
- Create: `src/lib/queries/chat-requests.test.ts`

**Interfaces:**
- Produces:
  - `isChatRequestActionable(status: string | null, expiresAt: Date | null, now: Date): boolean` (순수)
  - `getReceivedChatRequests(userId: string): Promise<ReceivedChatRequest[]>`
  - `type ReceivedChatRequest = { requestId: string; fromUserId: string; nickname: string; avatarUrl: string | null; createdAt: Date | null }`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/queries/chat-requests.test.ts`

```ts
import { describe, expect, test } from "bun:test";
import { isChatRequestActionable } from "./chat-requests";

describe("isChatRequestActionable", () => {
  const now = new Date("2026-07-21T00:00:00Z");

  test("pending + 미래 만료 → true", () => {
    expect(isChatRequestActionable("pending", new Date("2026-07-22T00:00:00Z"), now)).toBe(true);
  });

  test("pending + 만료없음(null) → true", () => {
    expect(isChatRequestActionable("pending", null, now)).toBe(true);
  });

  test("pending + 과거 만료 → false", () => {
    expect(isChatRequestActionable("pending", new Date("2026-07-20T00:00:00Z"), now)).toBe(false);
  });

  test("accepted → false", () => {
    expect(isChatRequestActionable("accepted", null, now)).toBe(false);
  });

  test("null 상태 → false", () => {
    expect(isChatRequestActionable(null, null, now)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun test src/lib/queries/chat-requests.test.ts`
Expected: FAIL — `chat-requests` 모듈/`isChatRequestActionable` 없음.

- [ ] **Step 3: 구현 작성** — `src/lib/queries/chat-requests.ts`

```ts
import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { chatRequests, profiles } from "@/db/schema";
import { getBlockRelation, isBlockedEitherWay } from "@/lib/blocks";

// 요청이 수락/거절 가능한 상태인지 — 목록 필터와 수락 라우트 가드가 공유.
export function isChatRequestActionable(
  status: string | null,
  expiresAt: Date | null,
  now: Date
): boolean {
  return status === "pending" && (expiresAt === null || expiresAt > now);
}

export type ReceivedChatRequest = {
  requestId: string;
  fromUserId: string;
  nickname: string;
  avatarUrl: string | null;
  createdAt: Date | null;
};

// 내가 받은 pending·미만료 1:1 요청 목록(차단 관계 제외), 보낸 사람 프로필 포함.
export async function getReceivedChatRequests(userId: string): Promise<ReceivedChatRequest[]> {
  const now = new Date();
  const rows = await db
    .select({
      requestId: chatRequests.id,
      fromUserId: chatRequests.fromUser,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      createdAt: chatRequests.createdAt,
    })
    .from(chatRequests)
    .innerJoin(profiles, eq(profiles.id, chatRequests.fromUser))
    .where(
      and(
        eq(chatRequests.toUser, userId),
        eq(chatRequests.status, "pending"),
        or(isNull(chatRequests.expiresAt), gt(chatRequests.expiresAt, now))
      )
    );

  const result: ReceivedChatRequest[] = [];
  for (const r of rows) {
    if (!r.fromUserId) continue;
    const rel = await getBlockRelation(userId, r.fromUserId);
    if (isBlockedEitherWay(rel)) continue;
    result.push({
      requestId: r.requestId,
      fromUserId: r.fromUserId,
      nickname: r.nickname,
      avatarUrl: r.avatarUrl,
      createdAt: r.createdAt,
    });
  }
  return result;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test src/lib/queries/chat-requests.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 타입체크 + Lint**

Run: `bunx tsc --noEmit && bunx biome lint src/lib/queries/chat-requests.ts src/lib/queries/chat-requests.test.ts`
Expected: 0 errors, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queries/chat-requests.ts src/lib/queries/chat-requests.test.ts
git commit -m "$(cat <<'EOF'
feat(chat): 받은 1:1 채팅 요청 조회 + isChatRequestActionable 순수 가드

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 1:1 요청 수락/거절 라우트

**Files:**
- Create: `src/app/api/chat/request/[id]/accept/route.ts`
- Create: `src/app/api/chat/request/[id]/reject/route.ts`

**Interfaces:**
- Consumes: `findOrCreatePrivateRoom` (Task 2), `isChatRequestActionable` (Task 7), `getBlockRelation`/`isBlockedEitherWay`.
- Produces: `POST accept` → `{ success, data: { roomId } }`; `POST reject` → `{ success, data: { rejected: true } }`.

- [ ] **Step 1: 수락 라우트 작성** — `src/app/api/chat/request/[id]/accept/route.ts`

```ts
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { chatRequests } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { getBlockRelation, isBlockedEitherWay } from "@/lib/blocks";
import { findOrCreatePrivateRoom } from "@/lib/chat/rooms";
import { isChatRequestActionable } from "@/lib/queries/chat-requests";
import { createClient } from "@/lib/supabase/server";

// POST /api/chat/request/[id]/accept - 받은 요청 수락 → private 방 승격
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [req] = await db
      .select({
        id: chatRequests.id,
        fromUser: chatRequests.fromUser,
        toUser: chatRequests.toUser,
        status: chatRequests.status,
        expiresAt: chatRequests.expiresAt,
      })
      .from(chatRequests)
      .where(eq(chatRequests.id, id))
      .limit(1);
    if (!req || !req.fromUser) return notFoundError("채팅 요청을 찾을 수 없어요");
    if (req.toUser !== user.id) return forbiddenError("수락 권한이 없어요");
    if (!isChatRequestActionable(req.status, req.expiresAt, new Date())) {
      return forbiddenError("이미 처리되었거나 만료된 요청이에요");
    }

    const rel = await getBlockRelation(user.id, req.fromUser);
    if (isBlockedEitherWay(rel)) return forbiddenError("차단 관계에서는 채팅할 수 없어요");

    const fromUser = req.fromUser;
    const roomId = await db.transaction(async (tx) => {
      const rid = await findOrCreatePrivateRoom(tx, fromUser, user.id);
      await tx.update(chatRequests).set({ status: "accepted" }).where(eq(chatRequests.id, id));
      return rid;
    });

    return successResponse({ roomId });
  } catch (err) {
    console.error("[chat/request accept]", err);
    return serverError();
  }
}
```

- [ ] **Step 2: 거절 라우트 작성** — `src/app/api/chat/request/[id]/reject/route.ts`

```ts
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { chatRequests } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// POST /api/chat/request/[id]/reject - 받은 요청 거절
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [req] = await db
      .select({ toUser: chatRequests.toUser })
      .from(chatRequests)
      .where(eq(chatRequests.id, id))
      .limit(1);
    if (!req) return notFoundError("채팅 요청을 찾을 수 없어요");
    if (req.toUser !== user.id) return forbiddenError("거절 권한이 없어요");

    await db.update(chatRequests).set({ status: "rejected" }).where(eq(chatRequests.id, id));
    return successResponse({ rejected: true });
  } catch (err) {
    console.error("[chat/request reject]", err);
    return serverError();
  }
}
```

- [ ] **Step 3: 타입체크 + Lint**

Run: `bunx tsc --noEmit && bunx biome lint "src/app/api/chat/request/[id]/accept/route.ts" "src/app/api/chat/request/[id]/reject/route.ts"`
Expected: 0 errors, lint clean.

- [ ] **Step 4: 수동 스모크 (curl 또는 UI)**

1. A→B로 `/api/chat/request` 요청 생성(기존 라우트) → pending row.
2. B로 로그인해 `POST /api/chat/request/<id>/accept` → `{ roomId }` 반환. DB에 `type='private'` 방 + 두 멤버, 요청 status='accepted'.
3. 같은 요청 재수락 시도 → 403(이미 처리됨). 권한 없는 사용자 수락 → 403.
4. 다른 pending 요청 `reject` → status='rejected'.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/chat/request/[id]/accept/route.ts" "src/app/api/chat/request/[id]/reject/route.ts"
git commit -m "$(cat <<'EOF'
feat(chat): 1:1 요청 수락(private 방 생성)·거절 라우트

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 채팅 목록에 "받은 요청" 인라인 섹션

**Files:**
- Modify: `src/app/(main)/chat/page.tsx` (로더에서 받은 요청 조회 후 전달)
- Modify: `src/app/(main)/chat/ChatListClient.tsx` (섹션 + 수락/거절 핸들러)

**Interfaces:**
- Consumes: `getReceivedChatRequests` (Task 7), accept/reject 라우트 (Task 8).

- [ ] **Step 1: 로더에서 받은 요청 조회** — `src/app/(main)/chat/page.tsx`

`getMyChatRooms` 호출 근처에 병렬 조회 추가하고 클라이언트에 전달. import 추가:
```ts
import { getReceivedChatRequests } from "@/lib/queries/chat-requests";
```
인증된 user에 대해:
```ts
  const [rooms, receivedRequests] = await Promise.all([
    getMyChatRooms(user.id),
    getReceivedChatRequests(user.id),
  ]);
```
`<ChatListClient rooms={rooms} receivedRequests={receivedRequests} />`로 prop 전달.
(현재 파일이 `rooms`만 넘기고 있으면 위 형태로 교체. user가 없을 때의 기존 분기는 그대로 두되 `receivedRequests={[]}` 전달.)

- [ ] **Step 2: ChatListClient에 섹션 추가** — `src/app/(main)/chat/ChatListClient.tsx`

import 추가:
```ts
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ReceivedChatRequest } from "@/lib/queries/chat-requests";
```
props 시그니처 교체:
```ts
export function ChatListClient({
  rooms,
  receivedRequests,
}: {
  rooms: ChatRoomSummary[];
  receivedRequests: ReceivedChatRequest[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState(receivedRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleAccept = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/chat/request/${requestId}/accept`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: { roomId?: string } }
        | null;
      if (res.ok && payload?.data?.roomId) {
        router.push(`/chat/${payload.data.roomId}`);
        return;
      }
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await fetch(`/api/chat/request/${requestId}/reject`, { method: "POST" });
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } finally {
      setBusyId(null);
    }
  };
```
(기존 `const [search, setSearch] = useState("");`는 위 블록으로 대체되므로 중복 선언하지 않도록 주의.)

1:1 탭(`<TabsContent value="private" ...>`) 최상단, 방 목록 앞에 받은 요청 섹션 삽입:
```tsx
        <TabsContent value="private" className="space-y-3">
          {requests.length > 0 && (
            <div className="space-y-2">
              <h2 className="px-1 text-base font-bold text-mocha-700">받은 채팅 요청</h2>
              {requests.map((r) => (
                <Card key={r.requestId}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-xl">{r.nickname[0] ?? "💬"}</AvatarFallback>
                    </Avatar>
                    <p className="flex-1 min-w-0 truncate text-lg font-bold text-mocha-900">
                      {r.nickname}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(r.requestId)}
                        disabled={busyId === r.requestId}
                      >
                        수락
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(r.requestId)}
                        disabled={busyId === r.requestId}
                      >
                        거절
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {privateRooms.length === 0 ? (
```
(이후 기존 private 방 목록 JSX는 그대로 유지.)

- [ ] **Step 3: 타입체크 + Lint**

Run: `bunx tsc --noEmit && bunx biome lint "src/app/(main)/chat/page.tsx" "src/app/(main)/chat/ChatListClient.tsx"`
Expected: 0 errors, lint clean.

- [ ] **Step 4: 수동 스모크**

A→B 요청 후 B의 `/chat` 1:1 탭 상단에 "받은 채팅 요청" 카드. 수락 → 방으로 이동, A·B 모두 목록에 1:1 방. 거절 → 카드 사라지고 방 안 생김.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main)/chat/page.tsx" "src/app/(main)/chat/ChatListClient.tsx"
git commit -m "$(cat <<'EOF'
feat(chat): 1:1 탭에 받은 채팅 요청 섹션(수락/거절) 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: 미사용 `/api/chat/rooms` stub 삭제

**Files:**
- Delete: `src/app/api/chat/rooms/route.ts`

- [ ] **Step 1: 소비처 없음 재확인**

Run: `git grep -n "api/chat/rooms" -- 'src/*'`
Expected: 매치 없음(라우트 파일 자신 외 소비처 없음). 매치가 있으면 삭제 중단하고 소비처를 먼저 처리.

- [ ] **Step 2: 파일 삭제**

```bash
git rm "src/app/api/chat/rooms/route.ts"
```

- [ ] **Step 3: 타입체크**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(chat): 미사용 /api/chat/rooms TODO stub 제거

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: 최종 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 타입체크**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: 전체 테스트**

Run: `bun test src/lib`
Expected: 이전 통과분 + Task 7의 5개 추가, 0 fail.

- [ ] **Step 3: Lint(신규/변경 파일)**

Run:
```bash
bunx biome lint \
  "src/lib/chat/rooms.ts" \
  "src/lib/queries/chat-requests.ts" "src/lib/queries/chat-requests.test.ts" \
  "src/lib/queries/chat.ts" \
  "src/app/api/clubs/route.ts" "src/app/api/clubs/[id]/join/route.ts" \
  "src/app/api/chat/request/[id]/accept/route.ts" "src/app/api/chat/request/[id]/reject/route.ts" \
  "src/app/(main)/chat/page.tsx" "src/app/(main)/chat/ChatListClient.tsx" \
  "src/app/(main)/chat/[id]/page.tsx" \
  "src/app/(main)/club/[id]/page.tsx" "src/app/(main)/club/[id]/ClubDetailClient.tsx"
```
Expected: lint clean(CRLF 포맷 경고는 무관).

- [ ] **Step 4: 엔드투엔드 수동 패스**

두 계정으로:
1. A가 클럽 생성 → A의 `/chat` 클럽 탭에 방. 클럽 상세 "채팅 참여하기" 동작.
2. B가 그 클럽 가입 → B의 클럽 탭에도 방. 둘 다 메시지 주고받기 → 목록 재정렬·시간·미읽음 정상.
3. A가 B 프로필에서 1:1 요청 → B의 1:1 탭에 받은 요청 → 수락 → 방 생성, 양쪽 목록 노출, 대화 가능.
4. B가 A 차단 → A·B 목록에서 해당 1:1 방 사라짐.

- [ ] **Step 5: 계획 완료 메모** — 필요 시 커밋 없음(각 태스크가 이미 커밋됨).

---

## Self-Review 결과

- **Spec coverage**: A(클럽방)=Task 1,2,3,4 / B(읽음·트리거)=Task 1,5,6 / C(1:1 DM)=Task 7,8,9 / 마이그레이션=Task 1 / stub 삭제=Task 10 / 최종검증=Task 11. spec의 모든 항목이 태스크에 매핑됨.
- **Placeholder scan**: 각 코드 스텝에 실제 코드 포함. 마이그레이션 파일명 타임스탬프만 생성 시점 확정(형식 명시).
- **Type consistency**: `ensureClubRoom`/`addRoomMember`/`removeRoomMember`/`findOrCreatePrivateRoom`(Task 2) ↔ 사용처(Task 3,8) 시그니처 일치. `isChatRequestActionable`/`getReceivedChatRequests`/`ReceivedChatRequest`(Task 7) ↔ Task 8,9 사용 일치. `ChatRoomSummary`(Task 6) 유지.
