import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isAuthRejection } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

export class AuthLookupError extends Error {
  constructor(cause?: unknown) {
    super("사용자 정보를 확인하지 못했습니다");
    this.name = "AuthLookupError";
    this.cause = cause;
  }
}

// 인증이 필요한 서버 컴포넌트의 단일 진입점.
// 토큰이 실제로 무효할 때만 /login으로 보내고, Supabase 장애나 네트워크 오류는
// 던져서 error.tsx의 "다시 시도" UI가 받게 한다 — 단순 API 오류를 로그아웃으로
// 처리하면 로그인 상태인 사용자가 로그인 화면으로 튕긴다.
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !isAuthRejection(error)) {
    console.error("[auth] getUser failed (non-auth):", error.status, error.message);
    throw new AuthLookupError(error);
  }
  if (!user) redirect("/login");
  return user;
}
