# 핸드오프 — 시니어 온보딩 (2026-05-30)

다른 세션이 이어받기 위한 인수인계 문서. 시니어(55~70세) 온보딩 통합 플로우 구현이 **코드 기준 완료**된 상태이며, 배포 전 사람이 처리할 일과 후속 plan만 남았다.

## 1. 현재 상태 한눈에

- **Branch**: `feat/senior-system-hardening-phase1` (작업 트리 clean, **main 미머지**)
- **Merge-base with main**: `bdc9546`
- **온보딩 구현**: 16개 task 전부 완료, `bunx tsc --noEmit` 0 errors + `bun run lint` clean
- **검증 방식**: 이 repo는 테스트 인프라가 없음 → `tsc` / `lint` / `bun run dev` + curl 로만 검증 (가짜 테스트 만들지 말 것)
- **원천 문서**:
  - Spec: `docs/superpowers/specs/2026-05-28-senior-onboarding-design.md`
  - Plan (task별 정확한 코드/명령/커밋): `docs/superpowers/plans/2026-05-28-senior-onboarding.md`

> 주의: 이 branch에는 온보딩 외에 Phase 3-A info 도메인 wire-up 커밋도 섞여 있다 (`55b00fe`~`97ff01f` 등). main 머지/PR 범위 결정 시 구분할 것.

## 2. 완료된 16개 Task → 핵심 파일 / 커밋

| Task | 내용 | 핵심 파일 | feat 커밋 |
|---|---|---|---|
| 1 | DB 마이그레이션 | `supabase/migrations/20260528000000_senior_onboarding.sql` | `6029123` |
| 2 | Drizzle 스키마 동기화 | `src/db/schema/users.ts` | `3896bd5` |
| 3 | 정적 데이터 (sido + 닉네임 풀) | `src/lib/onboarding/` | `f3b5ac8` |
| 4 | FontScaleProvider (전역 CSS 스케일) | `src/components/providers/FontScaleProvider.tsx`, `src/app/layout.tsx` | `1640619` |
| 5 | VoiceGuide TTS 래퍼 | `src/lib/` voice guide | `c914fd3` |
| 6 | Kakao OAuth (login/register) | login/register 페이지 + `/api/auth/callback` | `4e634d2` |
| 7 | 온보딩 5탭 페이지 | `src/app/(auth)/onboarding/page.tsx` + `src/components/onboarding/Step*.tsx` | `3bfa151` |
| 8 | POST /api/onboarding/complete (트랜잭션 영속화) | `src/app/api/onboarding/complete/route.ts` | `c0425df` |
| 9 | GET /api/onboarding/welcome | `src/app/api/onboarding/welcome/route.ts` | `7ce8641` |
| 10 | Welcome 풀스크린 페이지 + confetti | welcome 페이지 + `src/components/onboarding/Confetti.tsx` | `87af94b` |
| 11 | GET /api/onboarding/cohort | `src/app/api/onboarding/cohort/route.ts` | `cdbbf47` |
| 12 | GET /api/onboarding/first-club | `src/app/api/onboarding/first-club/route.ts` (`src/lib/recommendation.ts` 재사용) | `16e7893` |
| 13 | OnboardingCarousel + 카드 | `OnboardingCarousel.tsx`, `OperatorCard/CohortCard/FirstClubCard.tsx` | `5d1c3e2` |
| 14 | 홈 통합 (7일 캐러셀) | `src/app/(main)/page.tsx` | `8f075d5` |
| 15 | KakaoShareButton (자녀 알리기) | `src/lib/kakao/share.ts`, `KakaoShareButton.tsx`, `src/app/api/onboarding/share-done/route.ts` | `410f134` |
| 16 | NotificationOptInCard | `NotificationOptInCard.tsx`, `src/lib/notifications.ts` (subscribeUser) | `de5fedc` |

마이그레이션 컬럼 요약: `h_profiles`에 `font_scale`/`prefers_voice_guide`/`sido`/`sigungu`/`kakao_share_done_at` 추가, `region` nullable 화, `h_verification_type` enum에 `first_meeting` 추가, hobby 23개 seed.

홈 노출 규칙 (`src/app/(main)/page.tsx`): `showCarousel` = 가입 후 7일 이내, `showShareButton` = 가입 후 24시간 이내. NotificationOptInCard는 `showCarousel`에 묶임.

## 3. Plan과 의도적으로 달리한 구현 결정 (중요)

다음 세션이 "왜 plan이랑 다르지?" 하지 않도록 기록한다.

1. **`subscribeUser` 엔드포인트**: plan은 `POST /api/notifications/subscribe`를 호출하라고 했으나 그 라우트는 **존재하지 않음**. 실제 라우트는 `POST /api/notifications` (body `{ action: "subscribe", endpoint, keys }`). 이쪽에 맞춰 `src/lib/notifications.ts`에 `subscribeUser` 작성.
2. **VAPID 키 처리**: base64url → `Uint8Array` 변환 헬퍼(`urlBase64ToUint8Array`) 추가. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`가 없으면 throw 없이 `false` 반환 → dev에서 service worker 미등록 시 `serviceWorker.ready` 무한대기 회피.
3. **TS 5.7 이슈**: `Uint8Array<ArrayBufferLike>`가 `BufferSource`에 assignable하지 않음 → `new Uint8Array(new ArrayBuffer(n))`로 백킹해 구체 타입 추론하도록 해결.
4. **알려진 한계 (미해결)**: `src/app/api/notifications/route.ts`는 구독을 **in-memory 배열**에 저장 (DB 미연동, 서버 재시작 시 소실). 푸시를 실제 운영하려면 `h_push_subscriptions` 테이블에 upsert하도록 별도 작업 필요.

## 4. 검증 방법 (완료 주장 전 필수 실행)

```bash
bunx tsc --noEmit     # 0 errors 기대
bun run lint          # biome check src/ — clean 기대
bun run dev           # 수동 확인
```

dev 수동 확인 시나리오:
- 신규 가입 → 온보딩 5탭(닉네임/지역/취미/폰트/음성) → /welcome 풀스크린(confetti) → 홈 진입
- 홈 상단: 7일 이내 캐러셀(운영자/cohort/first-club), 24h 이내 "자녀에게 가입 알리기", "내일 모임 알림 받기" 카드
- Kakao 공유: `NEXT_PUBLIC_KAKAO_JS_KEY` 없으면 클릭해도 동작 안 함 (의도된 graceful)

## 5. 배포 전 사람이 처리할 일 (코드 아님)

**(A) DB 마이그레이션 적용** — `drizzle-kit` 금지 정책. `supabase/migrations/*.sql`이 source of truth. 사용자가 직접 적용:
```
supabase/migrations/20260528000000_senior_onboarding.sql
```

**(B) 운영자 수동 셋업**:
- Supabase 콘솔 → Authentication → Providers → **Kakao 활성화** + Client ID/Secret
- Kakao Developers → redirect URL `<APP_URL>/api/auth/callback` 등록, JavaScript 키 발급
- Kakao Business 채널 등록
- ENV 입력 (`.env.local` + Vercel Preview/Prod 모두):
  - `NEXT_PUBLIC_KAKAO_JS_KEY`
  - `NEXT_PUBLIC_OPERATOR_NAME`
  - `NEXT_PUBLIC_OPERATOR_KAKAO_CHANNEL_URL`
  - `NEXT_PUBLIC_OPERATOR_AVATAR_URL`
  - (푸시) `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL`
- `.env.example`에 위 키들 자리표시자 이미 추가됨.

## 6. 후속 작업 (이번 plan 범위 밖)

1. **Phase 4 D-1 푸시 cron job**: 첫 모임 전날 알림 (Vercel Cron `0 9 * * *`) + 첫 모임 신청자 D-1 리스트 admin UI. → 별도 plan 필요.
2. **푸시 구독 DB 연동**: §3-4의 in-memory 한계 해소.
3. **main 머지 / PR**: 이 branch의 온보딩 + info 도메인 커밋 범위 정리 후 진행 (사용자 확인 필수).

## 7. 프로젝트 규칙 리마인더 (작업 전 숙지)

- 커밋/push 전 **사용자 확인 필수**, feature branch only
- `drizzle-kit` 절대 금지, 마이그레이션은 `supabase/migrations/*.sql`
- Next.js 16: proxy는 `middleware.ts`가 아니라 `src/proxy.ts`
- 새 API 라우트 패턴: auth(`createClient`) + Zod + `@/lib/api-response` + Drizzle
- DB 테이블/enum은 `h_` prefix, schema는 `si_mvp` (db client의 `search_path`로 자동 해석)
- 모든 사용자 노출 문자열 한국어, 시니어 친화 UX (큰 터치 타깃, `h-12`+)
- 메모리: `project_senior_onboarding_done.md` (이 작업 요약)
