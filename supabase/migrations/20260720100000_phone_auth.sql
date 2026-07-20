-- 전화번호 인증 전환: h_profiles.phone을 auth.users.phone과 같은 E.164로 통일한다.
-- 형식이 두 개면 조회가 어긋나는 버그가 생긴다 (2026-07-20 이메일 공백 불일치 전례).
-- 기존 데이터는 1건(01012345678 형식)뿐이라 변환 부담이 없다.

-- 1) 기존 국내 번호를 E.164로 변환. 이미 +로 시작하면 건드리지 않는다.
UPDATE si_mvp.h_profiles
SET phone = '+82' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+%'
  AND regexp_replace(phone, '\D', '', 'g') ~ '^010\d{7,8}$';

-- 2) 변환 불가한 값은 NULL로 (형식이 깨진 레거시 데이터가 유니크 인덱스를 막지 않도록)
UPDATE si_mvp.h_profiles
SET phone = NULL
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+82%';

-- 3) 빈 문자열도 NULL로 통일 (부분 유니크 인덱스가 빈 문자열 중복을 허용하지 않도록)
UPDATE si_mvp.h_profiles SET phone = NULL WHERE phone = '';

-- 4) 같은 번호로 두 프로필이 생기지 않도록 보장.
--    auth.users.phone에는 이미 users_phone_key 유니크 인덱스가 있고, 이건 프로필 쪽 방어선이다.
CREATE UNIQUE INDEX IF NOT EXISTS h_idx_profiles_phone_unique
  ON si_mvp.h_profiles (phone)
  WHERE phone IS NOT NULL;
