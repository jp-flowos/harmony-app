# 배포 가이드

Harmony 앱 배포를 위한 단계별 가이드입니다.

## 사전 준비

- Node.js 18+ / Bun
- GitHub CLI (`gh`) 로그인 완료
- Vercel CLI (`npx vercel`) 로그인 완료

---

## 1. Supabase 셋업 (5분)

1. [supabase.com](https://supabase.com) → 새 프로젝트 생성
2. **SQL Editor**에서 `scripts/setup.sql` 전체 실행
   - 모든 테이블, 인덱스, RLS 정책이 한 번에 생성됨
3. **Settings → API**에서 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. **Settings → Database**에서 복사:
   - Connection string → `DATABASE_URL`

## 2. 채팅 (Supabase Realtime)

별도 셋업 불필요 — Supabase 프로젝트의 Realtime 기능을 사용합니다.
마이그레이션(`supabase/migrations/20260524000000_chat_messages_realtime.sql`)이
`h_chat_messages` 테이블을 `supabase_realtime` publication에 자동 등록합니다.

`bunx supabase db push` 또는 Supabase Dashboard → SQL Editor에서 실행하세요.

## 3. 카카오맵 API (3분)

1. [developers.kakao.com](https://developers.kakao.com) → 앱 등록
2. **지도 API** 활성화
3. **JavaScript 키** 복사 → `NEXT_PUBLIC_KAKAO_MAP_KEY`

## 4. 토스페이먼츠 (5분)

1. [developers.tosspayments.com](https://developers.tosspayments.com) → 가입
2. 테스트 키 복사 (초기엔 테스트 모드):
   - `TOSS_PAYMENTS_SECRET_KEY`
   - `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`

## 5. Gemini AI (선택, 3분)

1. [aistudio.google.com](https://aistudio.google.com) → API 키 발급
2. `GEMINI_API_KEY` 설정
3. 모델: `gemini-2.0-flash` (기본값)

## 6. Vercel 환경변수 설정

### 방법 A: 스크립트 사용
```bash
# .env.local에 값 채우기
cp .env.example .env.local
# 값 입력 후:
set -a; source .env.local; set +a
./scripts/vercel-env-setup.sh
```

### 방법 B: Vercel 대시보드
1. [vercel.com](https://vercel.com) → 프로젝트 → Settings → Environment Variables
2. `.env.example` 참고하여 수동 입력

## 7. 배포

### 자동 배포 (권장)
```bash
# GitHub 연동 후 push만 하면 자동 배포
git push origin main
```

### 수동 배포
```bash
# Preview 배포
npm run deploy:preview

# Production 배포
npm run deploy
```

---

## 환경변수 목록

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role 키 |
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `NEXT_PUBLIC_SITE_URL` | ⬜ | 사이트 URL (SEO/OG) |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | ⬜ | 카카오맵 JavaScript 키 |
| `TOSS_PAYMENTS_SECRET_KEY` | ⬜ | 토스페이먼츠 시크릿 키 |
| `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | ⬜ | 토스페이먼츠 클라이언트 키 |
| `GEMINI_API_KEY` | ⬜ | Gemini AI API 키 |
| `ADMIN_EMAILS` | ⬜ | 관리자 이메일 (콤마 구분) |

> 💡 선택 항목이 없어도 빌드/배포는 정상 동작합니다 (lazy init 적용됨).

---

## 트러블슈팅

### 빌드 실패
- 환경변수 없이도 빌드가 통과하도록 설계됨
- `placeholder` fallback이 적용되어 있음

### DB 마이그레이션
```bash
# Drizzle로 스키마 변경 시
bun run db:generate
bun run db:migrate
```

### 로컬 개발
```bash
cp .env.example .env.local
# 값 채우기
bun dev
```
