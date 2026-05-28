-- Senior onboarding hardening (Phase 1).
-- Adds profile preference columns (font_scale, voice guide, sido/sigungu, kakao share),
-- relaxes region NOT NULL for gradual migration, extends verification badge enum with
-- 'first_meeting', and seeds the hobbies master list.
--
-- Schema-qualified DDL (si_mvp.*) — no search_path dependency.
-- Idempotent-safe: enum uses IF NOT EXISTS, hobbies seed uses ON CONFLICT DO NOTHING.
-- Re-running ALTER TABLE ADD COLUMN without IF NOT EXISTS will error on second apply;
-- this is intentional to surface unexpected re-apply during the controlled rollout.

-- 1) profiles 컬럼 추가
ALTER TABLE si_mvp.h_profiles ADD COLUMN font_scale text NOT NULL DEFAULT 'lg';
ALTER TABLE si_mvp.h_profiles ADD COLUMN prefers_voice_guide boolean NOT NULL DEFAULT false;
ALTER TABLE si_mvp.h_profiles ADD COLUMN sido text;
ALTER TABLE si_mvp.h_profiles ADD COLUMN sigungu text;
ALTER TABLE si_mvp.h_profiles ADD COLUMN kakao_share_done_at timestamptz;

-- 2) region은 점진 마이그레이션을 위해 nullable로 변경
ALTER TABLE si_mvp.h_profiles ALTER COLUMN region DROP NOT NULL;

-- 3) verification_badges enum에 first_meeting 추가
ALTER TYPE si_mvp.h_verification_type ADD VALUE IF NOT EXISTS 'first_meeting';

-- 4) hobbies 마스터 시드 (23개)
INSERT INTO si_mvp.h_hobbies (id, name, category, icon) VALUES
  ('hb_hiking',   '등산',   '운동', 'mountain'),
  ('hb_golf',     '골프',   '운동', 'golf'),
  ('hb_swim',     '수영',   '운동', 'wave'),
  ('hb_yoga',     '요가',   '운동', 'yoga'),
  ('hb_badminton','배드민턴','운동', 'racket'),
  ('hb_tabletennis','탁구', '운동', 'racket'),
  ('hb_walking',  '걷기',   '운동', 'footprints'),
  ('hb_reading',  '독서',   '문화', 'book'),
  ('hb_movie',    '영화',   '문화', 'film'),
  ('hb_music',    '음악감상','문화', 'music'),
  ('hb_art',      '미술',   '문화', 'palette'),
  ('hb_photo',    '사진',   '문화', 'camera'),
  ('hb_calligraphy','서예', '문화', 'pen'),
  ('hb_cooking',  '요리',   '생활', 'pot'),
  ('hb_gardening','원예',   '생활', 'plant'),
  ('hb_travel',   '여행',   '생활', 'suitcase'),
  ('hb_fishing',  '낚시',   '생활', 'fish'),
  ('hb_baduk',    '바둑',   '생활', 'circle'),
  ('hb_dance',    '댄스',   '생활', 'dance'),
  ('hb_language', '외국어', '교육', 'globe'),
  ('hb_computer', '컴퓨터', '교육', 'laptop'),
  ('hb_instrument','악기연주','교육', 'guitar'),
  ('hb_history',  '역사탐방','교육', 'castle')
ON CONFLICT (id) DO NOTHING;
