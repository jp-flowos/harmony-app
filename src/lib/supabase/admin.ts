import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service-role 클라이언트 — find-id처럼 auth admin 조회가 필요한 서버 라우트 전용.
// 절대 응답에 원본 이메일/전화번호를 그대로 싣지 말 것 (스펙 §9).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase service-role environment variables");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
