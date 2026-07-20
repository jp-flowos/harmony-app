# 🎵 하모니 (Harmony) — 액티브 시니어 라이프 플랫폼

> 취미·정보 기반 55~70세 시니어를 위한 클럽 활동 플랫폼

## 📋 주요 기능

### Phase 1: 핵심 기능
- ✅ UI 컴포넌트 시스템 (Button, Card, Badge, Dialog, Tabs, Avatar 등)
- ✅ 인증 (휴대폰 SMS 인증 로그인/온보딩) — Supabase Auth
- ✅ 클럽 관리 (생성/가입/탈퇴/게시판)
- ✅ 채팅 (클럽 채팅, 1:1 채팅 요청) — Supabase Realtime
- ✅ 지도 (주변 시니어 친화 장소)
- ✅ 마이페이지 (프로필 편집, 설정)
- ✅ API Routes (RESTful)

### Phase 2: 서비스 확장
- ✅ 카카오맵 통합 (장소 검색, 모임 장소 표시)
- ✅ 1:1 채팅 시스템 (요청/수락 플로우)
- ✅ 모임 후기 시스템 (별점, 사진)
- ✅ 토스페이먼츠 구독 결제 (프리미엄)
- ✅ 정보 콘텐츠 (건강/재테크/여행/취미/정부지원)

### Phase 3: 커뮤니티 & 콘텐츠
- ✅ 운세 기능 (띠별 일일 운세, 건강운/금전운)
- ✅ 커뮤니티 게시판 (카테고리별, 좋아요, 댓글)
- ✅ 푸시 알림 인프라 (VAPID Web Push)
- ✅ SEO 최적화 (메타태그, sitemap, robots.txt)
- ✅ 관리자 대시보드 (신고처리, 콘텐츠관리, 구독현황, 운세편집)

### Phase 4: 추천 알고리즘 & 안정화
- ✅ **개인화 추천 알고리즘** — 취미/지역/나이 기반 스코어링 + 협업 필터링
- ✅ **통합 검색** — 클럽/모임/정보글/커뮤니티 탭별 검색, 최근 검색어
- ✅ **소셜 기능** — 팔로우/팔로잉, 사용자 공개 프로필, 활동 피드
- ✅ **Gemini AI 연동** — 운세/정보 콘텐츠 자동 생성 (관리자 트리거)
- ✅ **성능 최적화** — Skeleton UI, Suspense, 이미지 최적화
- ✅ **에러 처리** — 전역 에러 바운더리, 404, 로딩, 빈 상태 컴포넌트
- ✅ **API 표준화** — 통일된 성공/에러 응답 포맷
- ✅ **Vercel 배포 준비** — vercel.json, .env.example, 보안 헤더

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript (strict) |
| UI | React 19 + Tailwind CSS v4 + Radix UI |
| 아이콘 | Phosphor Icons |
| 인증 | Supabase Auth + SSR |
| DB | PostgreSQL (Supabase) + Drizzle ORM |
| 채팅 | Supabase Realtime (`postgres_changes`) |
| 결제 | 토스페이먼츠 |
| 지도 | 카카오맵 |
| AI | Google Gemini API |
| 패키지 | bun |
| 배포 | Vercel |

## 🚀 시작하기

### 사전 요구사항
- [Bun](https://bun.sh/) v1.0+
- [Node.js](https://nodejs.org/) v20+

### 설치

```bash
git clone https://github.com/your-repo/harmony-app.git
cd harmony-app
bun install
```

### 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 파일에 실제 값 입력
```

### 개발 서버

```bash
bun run dev
```

### 빌드

```bash
bun run build
```

### DB 마이그레이션

```bash
# Drizzle ORM 마이그레이션
bun run db:generate
bun run db:migrate

# Phase 4 추가 테이블 (수동)
psql $DATABASE_URL -f scripts/migrate-phase4.sql
```

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/          # 인증 (휴대폰 SMS 인증 로그인/온보딩)
│   ├── (main)/          # 메인 레이아웃
│   │   ├── chat/        # 채팅
│   │   ├── club/        # 클럽/모임
│   │   ├── community/   # 커뮤니티
│   │   ├── fortune/     # 운세
│   │   ├── info/        # 정보 콘텐츠
│   │   ├── map/         # 지도
│   │   ├── mypage/      # 마이페이지
│   │   ├── search/      # 통합 검색
│   │   ├── subscribe/   # 구독
│   │   └── users/[id]/  # 사용자 프로필
│   ├── admin/           # 관리자 대시보드
│   ├── api/             # API Routes
│   │   ├── admin/generate/    # AI 콘텐츠 생성
│   │   ├── chat/              # 채팅 API
│   │   ├── clubs/             # 클럽 API
│   │   ├── community/         # 커뮤니티 API
│   │   ├── fortune/           # 운세 API
│   │   ├── info/              # 정보 API
│   │   ├── meetings/          # 모임 API
│   │   ├── notifications/     # 알림 API
│   │   ├── payments/          # 결제 API
│   │   ├── recommendations/   # 추천 API
│   │   ├── search/            # 검색 API
│   │   └── users/             # 사용자/소셜 API
│   ├── error.tsx        # 전역 에러 바운더리
│   ├── not-found.tsx    # 404 페이지
│   └── loading.tsx      # 전역 로딩
├── components/
│   ├── ui/              # 재사용 UI 컴포넌트
│   ├── chat/            # 채팅 컴포넌트
│   ├── layout/          # 레이아웃 (BottomNav)
│   └── map/             # 카카오맵
├── db/
│   └── schema/          # Drizzle ORM 스키마
├── lib/
│   ├── api-response.ts  # API 응답 표준화
│   ├── api-utils.ts     # API 유틸리티
│   ├── fortune.ts       # 운세 생성 엔진
│   ├── gemini.ts        # Gemini AI 연동
│   ├── notifications.ts # 푸시 알림
│   ├── premium.ts       # 프리미엄 기능
│   ├── recommendation.ts# 추천 알고리즘
│   ├── utils.ts         # 공통 유틸
│   ├── chat/            # Supabase Realtime 채팅 클라이언트
│   └── supabase/        # Supabase 클라이언트
└── scripts/
    └── migrate-phase4.sql
```

## 📝 라이선스

MIT
