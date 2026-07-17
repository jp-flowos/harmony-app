-- Phase 3 security gate: h_profiles PII(name/phone)를 PostgREST 노출에서 제거.
-- 배경: profiles_select 정책이 USING(true)이고 anon/authenticated에 컬럼 SELECT grant가 있어
-- Phase 3에서 실제 휴대폰 수집을 시작하기 전에 반드시 차단해야 함 (Phase 0-1 최종 리뷰 게이트).
-- 방식: 테이블 grant 전체 회수 후 name/phone을 제외한 컬럼만 명시적으로 재부여 —
-- 기존 grant가 테이블 단위든 컬럼 단위든 결과가 결정적이다.
-- 주의: 이후 h_profiles에 컬럼을 추가하면 anon/authenticated에는 자동 노출되지 않는다(의도됨).

REVOKE SELECT ON si_mvp.h_profiles FROM anon, authenticated;

GRANT SELECT (id, nickname, birth_year, region, sido, sigungu, font_scale,
  prefers_voice_guide, kakao_share_done_at, bio, avatar_url, photo_urls,
  is_verified, subscription_tier, activity_score, created_at, updated_at)
  ON si_mvp.h_profiles TO anon, authenticated;
