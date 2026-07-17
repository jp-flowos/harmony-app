-- Phase 4: h_hobbies 카테고리를 시안 6개 대분류로 재편 (스펙 §4.1 이월분).
-- hobby id/name은 불변 — h_user_hobbies FK 보존, category 문자열만 교체.
-- 소비처: 온보딩 StepHobby 그룹핑(이번 Phase에서 6분류 2단 UI로 교체).
-- 홈 추천(scoreClubs)은 hobbies.category와 club.category(취미명)를 비교하는 경로가
-- 재편 전에도 매치 불가(dead path)임을 확인 — 이 재편으로 동작 변화 없음.
UPDATE si_mvp.h_hobbies SET category = CASE id
  WHEN 'hb_hiking'      THEN '운동/스포츠'
  WHEN 'hb_golf'        THEN '운동/스포츠'
  WHEN 'hb_swim'        THEN '운동/스포츠'
  WHEN 'hb_yoga'        THEN '운동/스포츠'
  WHEN 'hb_badminton'   THEN '운동/스포츠'
  WHEN 'hb_tabletennis' THEN '운동/스포츠'
  WHEN 'hb_walking'     THEN '운동/스포츠'
  WHEN 'hb_dance'       THEN '운동/스포츠'
  WHEN 'hb_art'         THEN '예술/공예'
  WHEN 'hb_calligraphy' THEN '예술/공예'
  WHEN 'hb_photo'       THEN '예술/공예'
  WHEN 'hb_movie'       THEN '예술/공예'
  WHEN 'hb_cooking'     THEN '요리/맛집'
  WHEN 'hb_music'       THEN '음악/악기'
  WHEN 'hb_instrument'  THEN '음악/악기'
  WHEN 'hb_travel'      THEN '여행/아웃도어'
  WHEN 'hb_fishing'     THEN '여행/아웃도어'
  WHEN 'hb_gardening'   THEN '여행/아웃도어'
  WHEN 'hb_reading'     THEN '독서/자기계발'
  WHEN 'hb_baduk'       THEN '독서/자기계발'
  WHEN 'hb_language'    THEN '독서/자기계발'
  WHEN 'hb_computer'    THEN '독서/자기계발'
  WHEN 'hb_history'     THEN '독서/자기계발'
  ELSE category
END;
