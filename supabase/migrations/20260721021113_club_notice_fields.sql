-- 클럽 공지(notice) 필드 추가: h_club_posts를 공지 등록/수정/삭제에 맞게 확장한다.
-- h_club_posts는 게시판/공지 공용 테이블이며 type='notice' 행만 공지로 취급한다.
-- Schema-qualified DDL (si_mvp.*) — search_path 비의존, 타입은 timestamptz로 통일.
-- 재적용 안전을 위해 IF NOT EXISTS 사용(신규 컬럼/인덱스만 추가, 기존 데이터 보존).

-- 1) 공지 표시용 컬럼
--    title       공지 제목 (신규 공지는 항상 채워짐, 기존 행은 NULL 허용)
--    is_pinned   중요 공지 여부 (상단 고정 정렬)
--    published_at 사용자 지정 게시일 (정렬·표시 기준, 기본 now())
ALTER TABLE si_mvp.h_club_posts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE si_mvp.h_club_posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE si_mvp.h_club_posts ADD COLUMN IF NOT EXISTS published_at timestamptz NOT NULL DEFAULT now();

-- 2) 기존 공지의 게시일을 작성일로 백필 (정렬 기준을 과거 데이터에도 일관 적용)
UPDATE si_mvp.h_club_posts SET published_at = created_at WHERE created_at IS NOT NULL;

-- 3) 공지 탭 조회 정렬(중요 먼저 → 최신 게시일) 대응 부분 인덱스
CREATE INDEX IF NOT EXISTS h_idx_club_posts_notice
  ON si_mvp.h_club_posts (club_id, is_pinned DESC, published_at DESC)
  WHERE type = 'notice';
