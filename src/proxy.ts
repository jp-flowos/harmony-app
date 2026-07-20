import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { KEEP_SIGNIN_COOKIE, shouldPersist, stripPersistence } from "@/lib/supabase/cookie-policy";

const publicPaths = [
  "/login",
  "/logout",
  "/register",
  "/onboarding",
  "/api/auth",
  "/find-id",
  "/find-password",
  "/reset-password",
  "/terms",
  "/privacy",
  // PWA + offline shell — must be reachable without a session
  "/offline",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon",
  "/apple-icon",
  "/icon-maskable",
  // 공개 공유 페이지 — trailing slash 필수 ("/s"는 /search, /subscribe까지 매칭됨)
  "/s/",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 인증 체크 안 함
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        const persist = shouldPersist(request.cookies.get(KEEP_SIGNIN_COOKIE)?.value);
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, persist ? options : stripPersistence(options));
        }
      },
    },
  });

  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (err) {
    // 인증 쿠키가 손상되면(청크 유실 등) 디코딩 단계에서 throw한다.
    // 그대로 두면 모든 페이지가 500이 되어 로그인 화면조차 못 가므로,
    // 쿠키를 지우고 로그인으로 보내 사용자가 스스로 회복할 수 있게 한다.
    console.error("[proxy] getUser threw, clearing auth cookies:", err);
    if (pathname.startsWith("/api/")) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const reset = NextResponse.redirect(url);
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) reset.cookies.delete(cookie.name);
    }
    return reset;
  }

  // 비로그인 사용자는 로그인으로
  if (!user && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
