# 카톡 공유 웨지 설계 (공유 인프라 + 모임 초대장 + 운세 카드)

- 작성일: 2026-07-10
- 상태: 사용자 승인된 설계 (구현 계획 작성 전)

---

## 1. 배경

하모니는 프리런치 단계로 실사용자가 없다. 확인된 유입 채널 두 가지에 맞춰 초기 어필 기능을 만든다.

1. **오프라인 모임 연계** — 기존 동호회 총무 한 명이 회원 20~30명을 데려오는 구조
2. **카톡 공유/지인 소개** — 시니어가 좋은 콘텐츠를 카톡방에 퍼나르는 구조

두 채널의 공통 병목: 현재 `src/proxy.ts`가 모든 비-`/api` 페이지에 인증을 강제해서, 카톡으로 어떤 링크를 공유해도 받는 사람은 로그인 벽에 막힌다. 따라서 **로그인 없이 열리는 공개 공유 페이지**가 선행 조건이다.

## 2. 목표

- 로그인 없이 열리는 공개 공유 라우트(`/s/*`)와 카톡 공유 인프라를 만든다.
- 모임 초대장: 총무가 카톡방에 뿌리면 비회원이 일정 확인 + 참석 응답까지 할 수 있게 한다.
- 운세 공유 카드: 매일 바뀌는 운세를 카톡 카드로 공유할 수 있게 한다.
- 두 페이지 모두 끝에 가입 전환 훅을 둔다.

## 3. 비목표 (이번 범위 제외)

- 회비 관리, 모임 사진첩 — 초대장 반응을 보고 다음 조각으로 결정
- 운세 DB wire-up / 운세 댓글 — 기존 별도 계획(`2026-05-27-fortune-content-wireup.md`) 유지
- 게스트 응답자 대상 푸시/문자 알림 — 비회원이라 채널 없음
- harmony-system-lab 복지 페이지 연동

## 4. 공개 라우트 구조

새 공개 네임스페이스 `/s/*` (짧은 URL — 카톡 공유에 유리).

- `src/proxy.ts`의 `publicPaths`에 `"/s"` 추가 (기존 `startsWith` 매칭 그대로).
- `src/app/s/layout.tsx` — 공유 전용 레이아웃:
  - BottomNav 없음, 인증 없음
  - 큰 글씨(시니어 기준), 상단 하모니 로고, 하단 고정 "하모니 시작하기" CTA 배너(→ `/register`)
- 페이지:
  - `/s/meeting/[id]` — 모임 초대장
  - `/s/fortune/[date]/[zodiac]` — 운세 카드 (날짜가 URL 경로에 있어야 카톡 OG 스크래퍼 캐시가 날짜별로 분리됨)

## 5. 공유 인프라

이미 있는 자산 재활용: Kakao SDK v2.7.2는 root layout에 로드됨, `src/lib/kakao/share.ts`의 `initKakao()`/`shareToKakao()` 존재, `metadataBase`는 root layout에 설정됨(`NEXT_PUBLIC_SITE_URL` 기반).

### ShareBar 컴포넌트

`src/components/share/ShareBar.tsx` (client component):

- [카카오톡으로 공유] 큰 주 버튼 — `shareToKakao()` 호출 (title/description/imageUrl/link props)
- [링크 복사] 보조 버튼 — `navigator.clipboard.writeText` + 복사 완료 피드백
- Kakao SDK 초기화 실패 시(키 미설정 등) 카카오 버튼 숨기고 링크 복사만 노출
- 기존 `/fortune` 페이지의 `navigator.share` 공유 버튼을 ShareBar로 교체

### 동적 OG 이미지

각 `/s/*` 페이지에 `opengraph-image.tsx` (next/og `ImageResponse`, 1200×630):

- 운세: 띠 이모지 + 날짜 + 별점 + 종합운 요약
- 모임: 모임명 + 일시 + 장소 + "참석 응답하기"
- Kakao SDK 공유의 `imageUrl`에도 같은 OG 이미지의 절대 URL을 사용

### metadata

각 공유 페이지에 `generateMetadata`로 title/description 동적 생성. 카톡방에서 링크가 카드 형태로 보이는 것이 시니어 클릭률의 핵심.

## 6. 모임 초대장

### 6-1. 선행: 미팅 도메인 DB 연동

현재 `/api/clubs/[id]/meetings`는 스텁(TODO), 미팅 상세 페이지는 목업 데이터. 표준 API 패턴(auth + Zod + `@/lib/api-response` + Drizzle)으로 wire-up:

- `GET /api/clubs/[id]/meetings` — `h_club_meetings` 목록 (인증 필요)
- `POST /api/clubs/[id]/meetings` — 생성. 클럽 owner/admin만 (`h_club_members.role` 검사)
- 미팅 상세 페이지(`club/[id]/meeting/[mid]`)는 서버 컴포넌트 + 클라이언트 서브트리 패턴으로 재작성 (mypage 패턴 참조). DB 직접 조회.

### 6-2. 게스트 참석 응답 테이블

기존 `h_meeting_participants`는 `profiles` FK 필수라 비로그인 응답 불가. 새 테이블:

```
h_meeting_rsvps
- id           text PK (crypto.randomUUID())
- meeting_id   text NOT NULL FK → h_club_meetings(id) ON DELETE CASCADE
- guest_name   text NOT NULL          -- 1~20자
- guest_phone  text                   -- 선택 입력
- status       h_rsvp_status NOT NULL -- enum: 'joined' | 'declined'
- created_at   timestamp DEFAULT now()
```

마이그레이션은 정책대로 `supabase/migrations/*.sql` 수기 작성 (drizzle-kit 금지). Drizzle 스키마는 `src/db/schema/clubs.ts`에 추가.

### 6-3. 초대장 페이지 `/s/meeting/[id]`

서버 컴포넌트(DB 직접 조회) + 응답 폼만 클라이언트 서브트리.

표시 내용:
- 클럽명, 모임명, 일시, 장소(+ 카카오맵 "길찾기" 링크: `https://map.kakao.com/link/to/{장소명},{lat},{lng}` — 좌표 없으면 장소명 검색 링크), 설명
- 참석 현황: 로그인 참석자(`h_meeting_participants`) + 게스트 응답(`h_meeting_rsvps`) 합산 인원과 이름 목록. 게스트 전화번호는 공개 페이지에 절대 표시하지 않음.

참석 응답 흐름:
1. [참석해요] / [못 가요] 큰 버튼
2. 이름 입력(필수, 1~20자) + 전화번호(선택) — 시니어 마찰 최소화를 위해 이름만으로 응답 가능
3. `POST /api/share/meetings/[id]/rsvp` (공개, 인증 없음)
4. 완료 화면 + 전환 훅: "가입하면 다음 모임 알림을 받아요 → 하모니 시작하기"

중복/스팸 방지 (비로그인 특성상 완벽한 dedup은 포기, 총무가 명단에서 눈으로 정리):
- localStorage에 응답 기록 저장 → 재방문 시 "이미 응답하셨어요" 안내 표시. v1은 응답 수정 미지원 — "변경은 총무님께 말씀해주세요" 문구로 안내
- 서버: Zod 길이 제한, 모임당 RSVP 200건 상한, 지난 모임(일시 경과)에는 응답 불가

상태 처리:
- 존재하지 않는 meeting id → 404 페이지("초대장을 찾을 수 없어요")
- 모임 일시가 지났으면 "지난 모임이에요" 표시, 응답 폼 숨김

### 6-4. RSVP API

`POST /api/share/meetings/[id]/rsvp` — 공개 (proxy는 `/api/*` 미차단, 라우트 내부에서 인증 검사 안 함):

- Zod: `{ guestName: string(1~20), guestPhone?: string(숫자/하이픈 8~13자), status: 'joined'|'declined' }`
- 검증: 모임 존재 + 일시 미경과 + RSVP 수 < 200
- 응답: `@/lib/api-response` 표준 포맷

### 6-5. 총무 쪽 흐름

- 앱 내 미팅 상세 페이지에 ShareBar 추가 → 초대장 링크(`/s/meeting/[id]`) 카톡 공유
- 미팅 상세에서 게스트 응답 명단 표시(전화번호는 클럽 owner/admin에게만 표시)

## 7. 운세 공유 카드

DB 연동 없이 구현 — `generateFortune(date, zodiac)`이 결정적(deterministic)이라 서버에서 그대로 실행 가능.

### `/s/fortune/[date]/[zodiac]`

서버 컴포넌트:
- 기존 `FortuneCard` UI를 공용 컴포넌트로 추출(`src/components/fortune/FortuneCard.tsx`)해서 앱 내 페이지와 공유 페이지가 같이 사용
- 하단 CTA: "내 띠 운세 매일 받기 → 하모니 시작하기"
- ShareBar 포함 (본 사람이 다시 자기 카톡방에 공유하는 2차 확산)

유효성:
- `date`: `YYYY-MM-DD` 형식 + **오늘 기준 과거 7일 ~ 오늘**만 허용 (미래 날짜, 오래된 링크는 오늘 날짜 URL로 redirect — 링크가 며칠 뒤 열려도 자연스럽게 동작)
- `zodiac`: 12간지 검증, 불일치 시 404

### 앱 내 `/fortune` 페이지 변경

- 공유 버튼을 ShareBar로 교체, 공유 링크는 `/s/fortune/{오늘}/{선택띠}`
- 그 외 기존 동작(선택자, 탭, 목업 댓글) 변경 없음

## 8. 에러 처리 원칙

- 공유 페이지는 어떤 경우에도 로그인으로 redirect하지 않는다 (깨진 링크도 공개 404/안내 페이지로).
- RSVP 실패(마감, 지난 모임, 서버 오류)는 시니어가 이해할 수 있는 한국어 문구로 표시.
- Kakao SDK 불가 환경(키 미설정, 인앱 아닌 데스크톱 등)에서는 링크 복사로 항상 폴백.

## 9. 테스트/검증

- `npx tsc --noEmit` + `bun run lint`
- API: PowerShell `Invoke-RestMethod`로 RSVP POST 정상/검증실패/지난모임/상한 케이스
- 브라우저 수동 검증: 비로그인 상태(시크릿 창)에서 `/s/meeting/[id]`, `/s/fortune/...` 접근 → 로그인 redirect 없이 렌더 확인, RSVP 응답 → DB 반영 확인
- OG 확인: 카카오톡 공유 디버거(https://developers.kakao.com/tool/debugger/sharing)로 OG 카드 렌더 확인

## 10. 운영 셋업 필요사항 (코드 외, 배포 전 체크)

- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` Vercel 설정 확인 — 2026-07-09 재배포 때 optional 시크릿 미설정 상태
- [ ] `NEXT_PUBLIC_SITE_URL` Vercel 설정 확인 (OG 절대 URL 기준값)
- [ ] Kakao Developers 콘솔에 배포 도메인 등록 (Web 플랫폼 + JavaScript 키 허용 도메인) — 미등록 시 카톡 공유 버튼이 조용히 실패

## 11. 결정 기록

- 게스트 RSVP 식별: **이름 필수 + 전화번호 선택** (시니어 입력 마찰 최소화, 초대장은 지인 카톡방에 뿌려지므로 이름으로 식별 가능)
- 운세 공유는 DB 없이 deterministic 엔진 재사용 (기존 fortune wire-up 계획과 독립)
- 공개 네임스페이스는 `/s/*` 단일 prefix로 통일 (proxy publicPaths 한 줄 관리)

## 12. 구현 계획 작성 중 발견/결정 추가 (2026-07-10)

- **클럽 도메인 전체가 스텁으로 확인됨** (`/api/clubs` POST 포함 전부 TODO, 클럽 상세/생성 페이지 목업). 초대장 흐름이 동작하려면 최소 wire-up이 필요해 범위에 추가: 클럽 생성 API+폼, 클럽 상세 페이지의 헤더/일정 탭 실데이터 전환. 클럽 목록/가입/게시판/사진/채팅/멤버 탭은 계속 목업 유지 (범위 밖).
- **proxy publicPaths에는 `"/s/"` (trailing slash 필수)**: `"/s"`는 `startsWith` 매칭이라 `/search`, `/subscribe`까지 공개해버림.
- **회원 참석 토글 API 추가** (`POST /api/clubs/[id]/meetings/[mid]/join`): 초대장의 참석 인원 합산(회원+게스트)이 의미 있으려면 회원 참석도 실제로 동작해야 함.
- **`h_club_meetings.current_count`는 사용하지 않음**: 참석 인원은 항상 `h_meeting_participants`(joined) + `h_meeting_rsvps`(joined) 라이브 계산 (게스트/회원 두 경로라 저장 카운터는 drift 위험).
- **OG 이미지 한글 폰트**: satori는 한글 폰트를 번들하지 않으므로 Pretendard-Bold.otf를 `src/assets/fonts/`에 번들 (앱 웹폰트와 동일 서체).
- **미팅 일시는 KST instant로 저장**: `new Date(\`${date}T${time}:00+09:00\`)`로 쓰고, 표시는 `Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ... })`.
