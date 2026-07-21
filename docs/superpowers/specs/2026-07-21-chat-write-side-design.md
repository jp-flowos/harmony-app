# 채팅 write-side 설계 (클럽 그룹채팅 · 읽음추적 · 1:1 DM 수락)

- **작성일**: 2026-07-21
- **브랜치**: feat/club-notices
- **상태**: 승인됨 (구현 대기)

## 배경 / 문제

`feat/club-notices` 검수에서 채팅 기능의 **write-side가 전부 누락**된 것이 확인됨:

- 방(`h_chat_rooms`)·멤버(`h_chat_room_members`)를 **생성하는 코드가 repo 전체에 없음** → 클럽방·1:1방 모두 안 만들어지고 채팅 목록은 항상 빈 값.
- 클럽 상세 "채팅 참여하기" 버튼은 `onClick={() => {}}` 빈 stub.
- 1:1 요청은 `h_chat_requests`에 `pending` row만 생성 — 수락·방생성·받은요청 UI 없음(요청자는 "요청 보냈어요" 성공 표시를 보지만 상대는 영영 못 받음).
- `last_message_at`(정렬/시간)·`last_read_at`(미읽음)를 갱신하는 코드가 없음 → 목록 정렬·타임스탬프·미읽음 뱃지 모두 무효(리뷰 #2 CRITICAL, #3 HIGH).

## 이미 존재하는 인프라 (재사용)

- 스키마: `chatRooms`(type: club|private|open, clubId, lastMessageAt), `chatRoomMembers`(roomId, userId, lastReadAt, PK(roomId,userId)), `chatMessages`, `chatRequests`(fromUser, toUser, status: pending|accepted|rejected|expired).
- 메시지 송수신: `src/lib/chat/realtime.ts` — **브라우저** Supabase 클라이언트가 `h_chat_messages` INSERT + `postgres_changes` 구독.
- RLS: `h_chat_messages`는 **room member만** read/insert(`h_chat_room_members` + `auth.uid()`).
- `ChatRoom` 컴포넌트, 채팅 목록/방 페이지, `getMyChatRooms` 쿼리(이미 올바르나 방이 없어 `[]` 반환).

## 범위

**포함 (A+B+C):**
- A. 클럽 그룹채팅 자동생성 + 멤버 동기
- B. `last_message_at`/`last_read_at` 추적 + 방 입장 멤버십 체크
- C. 1:1 DM 수락 플로우(받은요청 UI + 수락/거절 + 방 생성)

**제외 (후속):**
- ban 시 방 멤버 제거 (ban 처리 위치 확인 후)
- 동일 모임/클럽 멤버 즉시 DM(무승인) — 이번엔 전부 요청→수락으로 통일
- 푸시 알림 연동(notifications.ts) — 인라인 섹션으로 충분
- `/api/chat/rooms` 재구현 — 목록은 서버 컴포넌트가 `getMyChatRooms`로 직접 조회하므로 이 라우트는 미사용 stub. 소비처 없음 확인 후 삭제.

## 핵심 결정 (rationale)

1. **`last_message_at`는 DB 트리거로 갱신.** 메시지 INSERT는 브라우저(anon+JWT)에서 일어나므로, 앱 레벨 갱신은 왕복·레이스가 생긴다. `AFTER INSERT ON h_chat_messages` 트리거가 원자적으로 방을 갱신. 트리거 함수는 **SECURITY DEFINER**(테이블 소유자 권한) + `search_path` 고정 — 그래야 `authenticated` 역할이 `h_chat_rooms` UPDATE 권한이 없어도 갱신되고, search_path 하이재킹을 막는다.
2. **`last_read_at`는 방 입장 시 서버에서 갱신.** `chat/[id]/page.tsx`(서버 컴포넌트)에서 멤버십 확인 후 `now()`로 마킹(mark-as-read on open). v1은 재입장 시 갱신으로 충분.
3. **방 입장 멤버십 체크 추가.** 현재 페이지는 멤버십을 검사하지 않고 RLS에만 의존(비멤버는 빈 방). read 갱신을 위해 어차피 멤버십을 조회하므로, 비멤버는 `/chat`로 redirect해 defense-in-depth 갭도 함께 해소.
4. **클럽방 유일성은 `club_id` partial unique index로 보장**(type='club'). 방 id는 random uuid. `ensureClubRoom`는 onConflict(club_id)로 idempotent.
5. **1:1방 id는 random uuid + 중복검사.** 결정적 id(정렬된 user쌍)는 URL에 양쪽 UUID를 노출하므로 지양. 수락 시 두 사람의 기존 private방을 조회해 있으면 재사용, 없으면 생성.
6. **차단 반영.** 목록(`getMyChatRooms`)에서 상대가 차단관계인 private방 제외(리뷰 MEDIUM). 수락 엔드포인트도 차단 재확인.

## A. 클럽 그룹채팅

### 헬퍼 — `src/lib/chat/rooms.ts`
- `ensureClubRoom(tx, clubId, name): Promise<string>` — `chatRooms{id:uuid, type:'club', clubId, name}`를 `onConflictDoNothing`(club_id unique)로 삽입, 존재하는 방 id 반환.
- `addRoomMember(tx, roomId, userId)` — `chatRoomMembers` insert `onConflictDoNothing`.
- `removeRoomMember(tx, roomId, userId)` — delete.

### 훅 (기존 트랜잭션 내부)
- **클럽 생성** `POST /api/clubs`: `ensureClubRoom` + owner를 `addRoomMember`.
- **클럽 가입** `POST /api/clubs/[id]/join`: `ensureClubRoom`(legacy 클럽 lazy 보장) + 가입자 `addRoomMember`.
- **클럽 탈퇴** `DELETE /api/clubs/[id]/join`: 해당 클럽방에서 `removeRoomMember`.

### UI
- 클럽 상세 로더가 `clubRoomId`(해당 클럽방 id) 조회 → `ClubDetailClient` 채팅 탭 "채팅 참여하기" 버튼을 `/chat/[clubRoomId]` 링크로 교체. 비멤버는 가입 유도 문구.

### 백필
- 마이그레이션에서: 모든 클럽에 클럽방 생성(없으면), 모든 `status='active'` 클럽 멤버를 대응 방의 room member로 삽입.

## B. 읽음/최근메시지 추적

- **트리거**(마이그레이션): `si_mvp`에 `fn_touch_chat_room_last_message()` SECURITY DEFINER 함수 + `AFTER INSERT ON h_chat_messages FOR EACH ROW` 트리거. 본문: `update h_chat_rooms set last_message_at = new.created_at where id = new.room_id`.
- **읽음 갱신**: `chat/[id]/page.tsx`에서 멤버십 조회 → 없으면 `redirect('/chat')`, 있으면 `update chatRoomMembers set lastReadAt = now() where roomId=id and userId=me`.
- 결과: `getMyChatRooms`의 `orderBy(last_message_at)`·`lastMessageAt` 표시·`unread`(last_message_at > last_read_at) 실동작.

## C. 1:1 DM 수락 플로우

### 조회 — `src/lib/queries/chat-requests.ts`
- `getReceivedChatRequests(userId)`: `chatRequests` where `toUser=userId AND status='pending' AND (expiresAt is null OR expiresAt > now())`, fromUser `profiles`(id, nickname, avatarUrl) 조인, 차단관계 제외. 반환: `{ requestId, fromUserId, nickname, avatarUrl, createdAt }[]`.

### 수락 — `POST /api/chat/request/[id]/accept`
- 인증 → 요청 로드 → `toUser === user.id` 확인(아니면 forbidden) → `status === 'pending'` 확인 → 차단 재확인.
- 트랜잭션: `findOrCreatePrivateRoom(tx, a, b)`(두 사람이 정확히 멤버인 `type='private'` 방 조회, 없으면 생성 + 두 멤버 삽입) → 요청 `status='accepted'` → roomId 반환.
- 반환 `{ roomId }` → 클라가 `/chat/[roomId]` 이동.

### 거절 — `POST /api/chat/request/[id]/reject`
- `toUser === user.id` 확인 → `status='rejected'`.

### UI
- `/chat` 서버 로더가 `getMyChatRooms` + `getReceivedChatRequests` 조회 → `ChatListClient`에 `receivedRequests` prop 전달 → 1:1 탭 상단 "받은 채팅 요청" 인라인 섹션(프로필 + 수락/거절 버튼; 수락 시 `fetch` 후 반환 roomId로 라우팅, 거절 시 목록에서 제거).

### 목록 표시
- `getMyChatRooms`: private방(clubId null) 이름 = 상대 닉네임 → 상대 member + `profiles` 조인 추가. 차단관계 private방 제외.

## 마이그레이션 (`supabase/migrations/`, drizzle-kit 금지 · 컬럼 추가 없음)

1. `h_chat_rooms.club_id` partial unique index (`where type = 'club'`).
2. `fn_touch_chat_room_last_message()` + `AFTER INSERT` 트리거.
3. 백필: 클럽방 생성 + active 멤버 room membership.

(단일 마이그레이션 파일로 묶어도 무방.)

## 변경 파일

- **신규**: `src/lib/chat/rooms.ts`, `src/lib/queries/chat-requests.ts`, `src/app/api/chat/request/[id]/accept/route.ts`, `src/app/api/chat/request/[id]/reject/route.ts`, `supabase/migrations/2026072x_chat_write_side.sql`.
- **수정**: `src/app/api/clubs/route.ts`, `src/app/api/clubs/[id]/join/route.ts`, `src/app/(main)/chat/[id]/page.tsx`, `src/app/(main)/chat/page.tsx`, `src/app/(main)/chat/ChatListClient.tsx`, `src/app/(main)/club/[id]/ClubDetailClient.tsx`(+ 클럽 상세 로더), `src/lib/queries/chat.ts`.
- **삭제**: `src/app/api/chat/rooms/route.ts`(미사용 stub, 소비처 없음 확인 후).

## 테스트

- **Unit**: `findOrCreatePrivateRoom` dedup, `getReceivedChatRequests` 필터(pending+미만료+차단제외), `getMyChatRooms` 차단필터/private 닉네임.
- **Manual**: 클럽 생성→목록에 클럽방 / 가입→멤버십 / 메시지 전송→목록 재정렬+시간 표시 / 방 입장→미읽음 해제 / 비멤버 방 접근→redirect / DM 요청→상대 수락→양쪽 목록에 방.
- DB 트리거·RLS는 유닛테스트 어려움 → 마이그레이션 정확성 + 수동 검증으로 커버.

## 리스크 / 엣지케이스

- 트리거 함수가 SECURITY DEFINER가 아니면 브라우저 메시지 INSERT가 권한오류로 실패할 수 있음 → 반드시 DEFINER + search_path 고정.
- 백필은 idempotent해야 함(재실행 안전) — `on conflict do nothing`.
- 클럽 탈퇴 시 방 멤버 제거는 하되 방 자체는 유지(다른 멤버 있음).
- private방 재사용 조회는 정확히 2인 매칭이어야 함(그룹 오인 방지).
- `chat/[id]` 멤버십 redirect는 클럽방·private방 모두에 동일 적용.
