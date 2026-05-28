# 시니어 온보딩 통합 설계 (Senior Onboarding Design)

- 작성일: 2026-05-28
- 대상: 55~70세 시니어
- 도달 목표: **가입 후 홈 진입까지**
- 관련 코드: `src/app/(auth)/register/page.tsx`, `src/app/(auth)/onboarding/page.tsx`,
  `src/db/schema/users.ts`, `src/lib/recommendation.ts`, `src/lib/notifications.ts`

---

## 1. 배경 및 문제

현재 가입 흐름은 다음 두 문제를 안고 있다.

1. **입력값이 DB에 들어가지 않는다.** `(auth)/onboarding/page.tsx`는 지역·취미를 선택받지만
   클라이언트 상태로만 두고 `h_profiles` 또는 `h_user_hobbies`에 저장하지 않는다.
   추천 클럽도 하드코딩된 sample 데이터다.
2. **가입 직후 가치 체감이 없다.** 가입 → 지역 → 취미 → 샘플 추천 후 곧장 `/club`으로
   이동한다. 시니어는 "방금 가입한 보람"을 느끼지 못한다.

본 설계는 위 두 문제를 풀면서 시니어가 **즉시 가치 체감 · 신뢰 · 사회적 연결 · 진입 쉬움**
네 가지를 동시에 만족하도록 가입~홈 도달까지의 흐름을 통합한다.

## 2. 목표 (Goals) / 비목표 (Non-goals)

### Goals
- 가입을 5탭 60초 안에 끝낸다.
- 시니어 친화 첫인상을 가입 자체에서 만든다 (글자 크기 선택).
- 가입 직후 "환영받고 있다"는 감각을 한 화면에서 전달한다.
- 가입 입력값을 `h_profiles` · `h_user_hobbies`에 실제로 저장한다.
- 홈 도달 후 24시간 안에 "다음 행동" 하나를 시드한다 (모임 알림 옵트인 또는 자녀 알리기).

### Non-goals
- PASS / 본인확인 인증 (V2). MVP는 카카오 OAuth 1차 + 이메일·전화 옵션.
- 자녀 보호자 시점 페이지 본격 구현 (MVP는 카톡 공유 1탭만).
- 비로그인 체험 (랜딩에서 "1탭 시작"만 노출, 콘텐츠 미리보기는 V2).
- 음성 입력(STT) (V2).
- 자동화된 D-1 모임 안부 (수동 운영자 안부로 시작).

## 3. 사용자 여정 (큰 그림)

```
[랜딩]
  │ 카카오 1탭 또는 자녀 초대 링크
  ▼
[Phase 1 가입 5탭 60초]
  ① 카카오 OAuth        (1탭)
  ② 글자 크기 선택       (1탭)
  ③ 닉네임 선택          (1탭)
  ④ 지역 (시도+시군구)   (1탭)
  ⑤ 취미 1개            (1탭)
  │ POST /api/onboarding/complete → 일괄 트랜잭션 INSERT
  ▼
[Phase 2 풀스크린 환영]
  카드 1: "○○구의 X명이 환영해요" + 또래 아바타 3 + 첫만남 배지 + confetti
  │ 다음
  ▼
[Phase 3 홈 도달] ← 도달점
  상단 슬라이더: 카드 2 (운영자 인사) · 카드 3 (또래 코호트) · 카드 4 (첫 추천 클럽)
  4 큰 타일: 동호회 · 콘텐츠 · 채팅 · 내정보
  24h hook: 자녀 알리기 / 모임 알림 옵트인
  │
  ▼
[Phase 4 시드 (다음 날 약속만)]
  옵트인한 사용자: D-1 푸시 알림
  첫 모임 신청자: 운영자 카톡 안부 (수동)
  홈 상단 슬라이더는 7일 후 자동 숨김
```

## 4. Phase 1 — 가입 5탭

### Step ① 인증
- 큰 카카오 버튼 (`h-16`, yellow-400) 1탭으로 Supabase OAuth (`provider: "kakao"`)
- 작은 링크: "자녀가 보낸 초대로 시작하기", "다른 방법 (이메일·전화)"
- 자녀 초대 입구: 카톡 deep link에 `?ref=<invite_token>` 캐치 → 가입 후 family link 시드
- 이메일·전화 옵션은 유지 (카카오 미사용 시니어 대비)

### Step ② 글자 크기 (+ 음성 안내 옵션)
- 4지선다 큰 버튼: 작게(`text-base`) · 보통(`text-lg`) · 큼(`text-xl`, default) · 아주큼(`text-2xl`)
- 각 버튼은 미니 샘플 텍스트 "가 나 다"를 자기 크기로 보여준다
- 화면 하단에 작은 토글: "🔊 안내 음성으로 듣기" (`prefersVoiceGuide`)
  - 켜면 다음 step부터 모든 안내 문구를 Web Speech TTS로 1회씩 재생
  - 마이페이지에서 언제든 변경 가능
- 첫인상에서 "이 앱은 나를 위한 앱"이라는 신뢰 신호로 작동

### Step ③ 닉네임
- 6개 추천 카드 (사전 정의 풀 30~50개 중 client에서 랜덤 추출)
- "또는 직접 입력" 작은 토글 → text input
- 중복 닉네임은 허용 (충돌 시 시스템이 숫자 자동 부여)

### Step ④ 지역
- 시도 드롭다운 (17개) → 시군구 드롭다운 (동적)
- 시군구는 선택 (비워도 진행 가능)
- 데이터: `src/lib/region/kr-sido-sigungu.json` (행정자치부 표준 코드)

### Step ⑤ 취미 1개
- 카테고리별 카드 (운동/문화/생활/교육) — 기존 `(auth)/onboarding/page.tsx`의 리스트 재사용
- 1개만 선택. 다중 선택은 가입 후 마이페이지에서 추가 가능
- 마스터 데이터: `h_hobbies` 시드 SQL 필요 (27개)

### 일괄 저장
5탭 모두 끝나면 `POST /api/onboarding/complete`이 한 번의 트랜잭션으로:
- `h_profiles` INSERT (id, nickname, sido, sigungu, fontScale, prefersVoiceGuide)
- `h_user_hobbies` INSERT (1 row)
- `h_verification_badges` INSERT (type=`first_meeting`)

중간 이탈 시 재진입 안전성: client `sessionStorage`에 step 진척도 보관. 다음 진입 때 마지막
미완 step부터 이어간다. 서버 측 `onboarding_step` 컬럼은 V2로 보류.

## 5. Phase 2 — 풀스크린 환영

가입 완료 직후 한 화면 전체로:

- **회원수 표시**: `SELECT count(*) FROM h_profiles WHERE sigungu = ?`
- **또래 아바타 3명**: 같은 sido + birthYear ±5세 + activityScore > 0, 닉네임만 표시
  - birthYear는 가입 시 받지 않으므로 MVP는 sido만으로 매칭하고 birthYear 필터는 V2로
- **첫만남 배지**: `h_verification_badges` enum에 `first_meeting` 1개만 추가하여 시각 표시
- **Confetti**: CSS keyframe만으로 구현 (외부 라이브러리 추가하지 않음)
- **TTS 안내**: Step ②에서 음성 안내 토글이 켜져 있으면 Web Speech API로 환영 메시지 1회 재생
- **Edge 처리**:
  - 시군구 회원 < 10명 → 시도 단위로 fallback ("○○도의 X명")
  - 시도 < 10명 → "전국 X명"으로 fallback
- **마지막 버튼**: "다음 →" → 홈으로 전환

API: `GET /api/onboarding/welcome` → `{ regionMemberCount: number, peerSamples: { nickname: string }[] }`

## 6. Phase 3 — 홈 도달

### 상단 슬라이더 (첫 7일만)

가로 슬라이드 카드 3장:

| 카드 | 내용 | 데이터 소스 |
|---|---|---|
| 카드 2 (운영자) | 실명·아바타·"카카오상담 열기" CTA | ENV: `NEXT_PUBLIC_OPERATOR_NAME` 외 |
| 카드 3 (또래 코호트) | 최근 7일 같은 시군구 가입자 닉네임 + 가입 시점 | `h_profiles.created_at` |
| 카드 4 (첫 추천) | 지역·취미 매칭 동호회 1개 | `src/lib/recommendation.ts` |

- 각 카드 [X] 닫기 가능. 모두 닫히면 슬라이더 자체 숨김
- 닫음 상태: `localStorage` (서버 부담 ↓)
- 7일 경과 (`profiles.created_at + 7d`) → 자동 숨김
- 매칭 결과가 0인 카드는 표시하지 않는다 (가짜 절대 금지)

API:
- `GET /api/onboarding/cohort` → `{ peers: { nickname: string, joinedAgo: string }[] }`
- `GET /api/onboarding/first-club` → `{ club: ClubSummary | null }`

### 4 큰 타일

기존 홈에 큰 타일 4개를 시니어 모드로 두께 있게:
동호회 / 콘텐츠 / 채팅 / 내정보. `min-h-32`, 아이콘 32px, 글자 `text-xl`, `tap-target ≥ 48px`.

### 24시간 hook 카드 두 개

**자녀에게 알리기**
- 1탭 → Kakao JavaScript SDK `Kakao.Share.sendDefault()`
- 메시지: "어머니가 하모니에 가입하셨어요. 함께 보세요" + 앱 deep link
- 1회 클릭 또는 24시간 경과 후 사라짐
- DB: `h_profiles.kakao_share_done_at timestamp` 1컬럼

**모임 알림 옵트인**
- `sido + userHobby` 매칭 중 가장 가까운 미래 모임 1건이 있을 때만 표시
- 1탭 → `Notification.requestPermission()` → 승인 시 `subscribeUser()` 호출 →
  `h_push_subscriptions` 등록
- 거부 또는 추천 0건 → 카드 숨김

## 7. Phase 4 — 시드 (다음 날 약속만)

- **D-1 푸시 알림**: 옵트인한 사용자 대상으로 모임 일정 D-1에 자동 발송.
  cron job 1개 (Vercel Cron) — `0 9 * * *` 매일 9시.
- **운영자 카톡 안부**: 첫 모임 신청자 D-1 리스트를 Admin UI에 노출.
  운영자가 카톡 1:1로 직접 발송. 자동화 안 함 (사람 손길 유지).
- **슬라이더 자동 숨김**: 가입 후 7일 경과 시.

## 8. DB 변경 사항

`supabase/migrations/<timestamp>_senior_onboarding.sql`:

```sql
-- profiles 확장
ALTER TABLE h_profiles ADD COLUMN font_scale text NOT NULL DEFAULT 'lg';
ALTER TABLE h_profiles ADD COLUMN prefers_voice_guide boolean DEFAULT false;
ALTER TABLE h_profiles ADD COLUMN sido text;
ALTER TABLE h_profiles ADD COLUMN sigungu text;
ALTER TABLE h_profiles ADD COLUMN kakao_share_done_at timestamp;

-- 기존 region 컬럼은 점진 마이그레이션:
--   1차 배포: 신규 컬럼 추가만, 기존 region NOT NULL 유지
--   2차 배포: 백필 (region → sido) 후 region을 nullable로 변경
--   3차 배포: region 컬럼 drop

-- verification_badges enum에 first_meeting 추가
ALTER TYPE h_verification_type ADD VALUE 'first_meeting';

-- hobbies 마스터 시드 (27개)
INSERT INTO h_hobbies (id, name, category, icon) VALUES
  ('hb_hiking', '등산', '운동', 'mountain'),
  ('hb_golf',   '골프', '운동', 'golf'),
  ...
;
```

**중요**: 본 프로젝트는 `drizzle-kit`을 사용하지 않고
`supabase/migrations/*.sql`이 source of truth (메모리 `db-migration-policy` 참고).

## 9. API 명세

| 경로 | 메서드 | 요청 | 응답 |
|---|---|---|---|
| `/api/onboarding/complete` | POST | `{ nickname, sido, sigungu?, fontScale, prefersVoiceGuide, hobbyId }` | `{ success: true, profile }` |
| `/api/onboarding/welcome` | GET | (auth) | `{ regionMemberCount, peerSamples }` |
| `/api/onboarding/cohort` | GET | (auth) | `{ peers: { nickname, joinedAgo }[] }` |
| `/api/onboarding/first-club` | GET | (auth) | `{ club: ClubSummary \| null }` |

모든 응답은 `src/lib/api-response.ts`의 표준 포맷 (`{ success, data }` /
`{ success, error: { code, message } }`)을 따른다.
요청 검증은 Zod 스키마. 관련 API 패턴은 메모리 `project_api_route_pattern` 준수.

## 10. UI 컴포넌트

| 컴포넌트 | 경로 | 책임 |
|---|---|---|
| `<FontScaleProvider>` | `src/components/providers/FontScaleProvider.tsx` | root layout에서 `data-font-scale` 속성과 Tailwind CSS 변수 글로벌 적용 |
| `<VoiceGuideProvider>` | `src/components/providers/VoiceGuideProvider.tsx` | Web Speech API TTS wrapper. iOS Safari 호환 확인 |
| `<WelcomeFullscreen>` | `src/app/(main)/welcome/page.tsx` | Phase 2 풀스크린 환영 페이지 |
| `<OnboardingCarousel>` | `src/components/onboarding/OnboardingCarousel.tsx` | 홈 상단 3 카드 슬라이더 |
| `<KakaoShareButton>` | `src/components/onboarding/KakaoShareButton.tsx` | 자녀 알리기 1탭 |
| `<NotificationOptInCard>` | `src/components/onboarding/NotificationOptInCard.tsx` | 모임 알림 옵트인 |

5탭 가입은 `src/app/(auth)/onboarding/page.tsx` 한 페이지에서 stateful로 처리하되,
step별 컴포넌트로 분리:
`OnboardingStepFontScale`, `OnboardingStepNickname`, `OnboardingStepRegion`,
`OnboardingStepHobby`.

## 11. ENV / 외부 서비스

- Supabase: Kakao OAuth provider 활성화 + redirect URL 등록
- 카카오 비즈 채널: 등록 + 실제 응대자 1명 배정 (가짜 챗봇 금지)
- `NEXT_PUBLIC_KAKAO_JS_KEY` — Kakao JavaScript SDK
- `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_OPERATOR_AVATAR_URL`,
  `NEXT_PUBLIC_OPERATOR_KAKAO_CHANNEL_URL`
- 기존 `src/lib/notifications.ts` (VAPID) 재활용
- 기존 `src/lib/kakao/` (KakaoMap) — Sharing SDK 추가 필요

## 12. 정적 데이터

- `src/lib/region/kr-sido-sigungu.json` — 행정자치부 표준 (신규)
- `src/lib/nickname/recommended.ts` — 30~50개 닉네임 풀 (신규)

## 13. 핵심 설계 원칙

| 원칙 | 의미 |
|---|---|
| 가짜 금지 | 회원수·또래·운영자·코호트 모두 실재. 부족하면 카드 숨김 |
| 마케팅 톤 금지 | "숨은"·"공짜"·과장 단어 사용 안 함 |
| 시니어 친화 첫인상 | 가입 두 번째 단계가 글자 크기 선택 |
| 인지부하 최소 | 한 화면 한 의사결정. 5탭 60초 목표 |
| 사람 손길 유지 | 첫 모임 D-1 안부는 자동화하지 않음 |
| 이탈 안 막음 | "건너뛰기" 항상 노출 |
| 재진입 안전 | 카카오 미사용자 위해 이메일·전화 옵션 유지 |
| 출처·근거 | 추천 클럽에 매칭 이유 1줄 표시 ("○○구 + 등산") |

## 14. 비기능 요구사항

- 모바일 LCP < 2.0s (3G fast)
- 모든 인터랙티브 요소 tap target ≥ 48px
- 색 대비 WCAG AA 이상
- 글자 크기 4단계가 본문·버튼·input 모두에 적용
- 한국어 UI, `aria-label`도 한국어
- Lighthouse Accessibility 90+ 목표

## 15. 위험 / 열린 질문

1. **카카오 OAuth만으로 충분한가?** 시니어 일부는 카카오 계정 없이 통신사 인증만 사용.
   MVP에서는 이메일·전화를 fallback으로 유지하지만 이탈률 측정 필요.
2. **운영자 1명으로 카카오상담 운영 가능한가?** 가입 폭증 시 응대 지연 위험.
   대안: 채널 답변 SLA 설정 + Off-hours 자동응답 ("내일 오전 답변드려요").
3. **첫만남 배지의 의미가 가벼울 위험.** 패널 평가의 "보상이 가벼우면 스팸감" 우려.
   대응: 배지에 "○○구 X번째 가입자" 같은 의미를 부여하는 V2 고려.
4. **birthYear를 가입에서 안 받음.** 또래 코호트 정확도 ↓. V2에서 마이페이지 입력 권유.
5. **자녀 초대 deep link의 invite token 발급/검증 방식**은 본 스펙 밖. 별도 설계 필요.

## 16. V2 / 이후 로드맵

- PASS / 통신사 본인확인 통합
- 자녀 보호자 시점 페이지 (`/family`)
- birthYear 입력 권유 → 또래 매칭 정확도 ↑
- 비로그인 콘텐츠 미리보기 (가입 훅)
- 코호트 1:1 인사 보내기
- 운영자 N명 + 지역별 매칭
- 7일 데일리 미션 / 정착 배지
- 자동 D-1 카톡 알림톡 (현재는 수동)
