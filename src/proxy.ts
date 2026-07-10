import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const publicPaths = [
  "/login",
  "/logout",
  "/register",
  "/onboarding",
  "/api/auth",
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
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
