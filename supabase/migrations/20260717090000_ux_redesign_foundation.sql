-- UX redesign foundation (Phase 0).
-- Adds club filter columns (sido/sigungu, coords, activity days, meeting type, age range),
-- profile identity columns (name, phone) for find-id, consent + auth-attempt tables,
-- and the h-avatars storage bucket with owner-scoped write policies.
--
-- Schema-qualified DDL (si_mvp.*) — no search_path dependency.
-- Re-running ALTER TABLE ADD COLUMN without IF NOT EXISTS will error on second apply;
-- this is intentional to surface unexpected re-apply (repo convention).

-- 1) club filter enums
CREATE TYPE si_mvp.h_meeting_type AS ENUM ('regular', 'flash', 'social', 'study');
CREATE TYPE si_mvp.h_age_range AS ENUM ('all', '50s', '60s', '70plus');

-- 2) h_clubs filter columns (lat/lng는 반경 필터 후속 대비 선반영 — v1 미사용)
ALTER TABLE si_mvp.h_clubs ADD COLUMN sido text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN sigungu text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN lat text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN lng text;
ALTER TABLE si_mvp.h_clubs ADD COLUMN activity_days text[] NOT NULL DEFAULT '{}';
ALTER TABLE si_mvp.h_clubs ADD COLUMN meeting_type si_mvp.h_meeting_type;
ALTER TABLE si_mvp.h_clubs ADD COLUMN age_range si_mvp.h_age_range NOT NULL DEFAULT 'all';
CREATE INDEX h_idx_clubs_sido_sigungu ON si_mvp.h_clubs (sido, sigungu);
-- (category 인덱스는 20260523084811 원본 스키마에 이미 존재)

-- 3) 기존 region 값이 시/도 단독 표기인 클럽은 sido 백필
UPDATE si_mvp.h_clubs
SET sido = region
WHERE region IN ('서울','경기','인천','부산','대구','대전','광주','울산','세종',
                 '강원','충북','충남','전북','전남','경북','경남','제주');

-- 4) h_profiles identity columns (아이디 찾기용 — Phase 3에서 수집 시작)
ALTER TABLE si_mvp.h_profiles ADD COLUMN name text;
ALTER TABLE si_mvp.h_profiles ADD COLUMN phone text;
CREATE INDEX h_idx_profiles_phone ON si_mvp.h_profiles (phone);

-- 5) 약관 동의 이력 (Phase 3 회원가입에서 기록)
CREATE TABLE si_mvp.h_user_consents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES si_mvp.h_profiles(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  version text NOT NULL,
  agreed_at timestamptz DEFAULT now()
);
CREATE INDEX h_idx_user_consents_user ON si_mvp.h_user_consents (user_id);
ALTER TABLE si_mvp.h_user_consents ENABLE ROW LEVEL SECURITY;

-- 6) 인증 시도 로그 (find-id rate limit용, Phase 3에서 사용)
CREATE TABLE si_mvp.h_auth_attempts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX h_idx_auth_attempts_ip_action ON si_mvp.h_auth_attempts (ip, action, created_at);
ALTER TABLE si_mvp.h_auth_attempts ENABLE ROW LEVEL SECURITY;

-- 7) 프로필 사진용 스토리지 버킷 (Phase 4에서 사용, 공유 Supabase라 h- 접두사)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('h-avatars', 'h-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY h_avatars_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'h-avatars');
CREATE POLICY h_avatars_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'h-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY h_avatars_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'h-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY h_avatars_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'h-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
