import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST 전용. GET으로 두면 Next.js Link 프리페치(`GET /logout?_rsc=...`)나 브라우저
// 프리로드가 사용자 클릭 없이 세션을 지운다 — 마이페이지의 로그아웃 링크가 뷰포트에
// 들어오는 것만으로 로그아웃되던 버그의 원인.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303: 리다이렉트를 GET으로 따라가게 한다 (기본 307이면 /login으로 POST가 재전송됨)
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
