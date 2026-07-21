# 클럽 참여자 상세 프로필 조회 — 설계 (2026-07-21)

## 목표
클럽 멤버 목록에서 참여자를 선택하면 해당 사용자의 실제 프로필을 안전하게 조회하고, 1:1 채팅 요청·신고·차단을 할 수 있다.

## 확정 결정 (사용자 승인)
- **범위**: 코어 풀세트 — 프로필 조회 + 멤버목록 실연동 + 신고(DB 기록) + 차단(실제 enforcement) + 1:1 채팅 요청 전송.
- **공개 범위**: MVP 고정 정책 — 나열 필드만 공개, 인증정보(전화·이름·생년월일·이메일)는 서버 projection에서 절대 미노출. 공개설정 UI 없음.
- **탈퇴 판정**: profiles 행 부재 → "탈퇴한 사용자입니다". status 컬럼 추가 안 함. 전역 banned 개념 없음.
- follow 제거 / 상대가 나를 차단 시 중립 안내 / 신고·차단은 "더보기" Sheet.

## 아키텍처
서버 컴포넌트에서 전 게이팅 + 안전 projection, 클라이언트는 액션만. (기존 server+client-subtree 패턴)

- `/users/[id]/page.tsx` (mock 교체 → 서버 컴포넌트): 게이팅 + 데이터 로드.
- `components/user/UserProfileActions.tsx` (신규 클라이언트): 채팅 요청 / 신고(Sheet) / 차단·해제.

## 안전 데이터 projection
노출: `avatarUrl, nickname, region, bio, hobbies(name[]), 공통 참여 클럽, isVerified`.
미노출(절대): `phone, name, birthYear`, auth email.
- 공통 클럽: `h_club_members` self-join (viewer∩target, status='active').
- 취미: `h_user_hobbies ⨝ h_hobbies.name`.

## 접근 제어 결정 트리 (서버, 순서) → 완료조건
1. 미로그인 → `/login` (requireUser)
2. 본인(id===viewer) → `redirect('/mypage')`  — #6
3. 프로필 부재 → "탈퇴한 사용자입니다"  — #4
4. 차단 관계(양방향 중 하나라도 `h_blocks`) → 제한: 프로필 상세 미표시 + 채팅 불가  — #5
   - 내가 차단: "차단한 사용자입니다" + [차단 해제]
   - 상대가 차단: 중립 "프로필을 볼 수 없습니다" (차단 사실 비노출)
5. 정상 → 프로필 표시. 대상만 로드 → 타인 정보 혼입 불가  — #1 #2 #3

## 액션 · API (스텁/부재 → 실제 구축, auth+Zod+api-response+Drizzle)
- `POST /api/reports` (스텁 재작성): auth + Zod{targetType,targetId,reason,detail?} + `h_reports` insert. 동일 대상 pending 중복은 idempotent. 사유 프리셋: 부적절한 사진/프로필·욕설/비방·사기/광고·사칭·기타.
- `POST /api/users/[id]/block` / `DELETE`: `h_blocks` insert(onConflictDoNothing)/delete. self-block 금지. 차단 시 양방향 pending chat request 정리.
- `POST /api/chat/request` (스텁 재작성): auth + 차단검사(양방향, forbidden) + 대상 존재 + 중복(pending/accepted) dedupe + `h_chat_requests` insert(+24h).

## 멤버 목록 실연동
- `club/[id]/page.tsx`: 활성 멤버(`clubMembers ⨝ profiles`: id·nickname·avatarUrl·role) owner→admin→member→joinedAt 순 → `ClubDetailClient` `members` prop.
- 멤버 탭 mock 제거 → 실데이터, 각 항목 `Link /users/[id]`.

## 차단 enforcement 지점 (2곳)
① 프로필 상세, ② 채팅 요청 API. (멤버목록/검색 광범위 숨김은 범위 밖)

## DB 변경
없음 — `h_blocks`/`h_reports`/`h_chat_requests` 기존 테이블 사용. 마이그레이션 불필요.

## 범위 밖
채팅 수락 인박스(미존재 → 보낸 요청 수신자 액션 UI 없음, 후속), 공개범위 설정 UI, 전역 banned, 탈퇴 플로우, 차단 관리 화면, follow.
