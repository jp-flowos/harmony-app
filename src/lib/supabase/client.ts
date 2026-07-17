import { createBrowserClient } from "@supabase/ssr";
import { KEEP_SIGNIN_COOKIE, shouldPersist, stripPersistence } from "@/lib/supabase/cookie-policy";

function readCookie(name: string): string | undefined {
  const pair = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : undefined;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    {
      cookies: {
        getAll() {
          return document.cookie
            .split("; ")
            .filter(Boolean)
            .map((pair) => {
              const i = pair.indexOf("=");
              return { name: pair.slice(0, i), value: pair.slice(i + 1) };
            });
        },
        setAll(cookiesToSet) {
          const persist = shouldPersist(readCookie(KEEP_SIGNIN_COOKIE));
          for (const { name, value, options } of cookiesToSet) {
            const opts = persist ? options : stripPersistence(options);
            let str = `${name}=${value}; Path=${opts.path ?? "/"}`;
            if (typeof opts.maxAge === "number") str += `; Max-Age=${opts.maxAge}`;
            if (opts.expires) str += `; Expires=${new Date(opts.expires).toUTCString()}`;
            if (opts.sameSite) {
              str += `; SameSite=${typeof opts.sameSite === "string" ? opts.sameSite : "Lax"}`;
            }
            if (opts.secure) str += "; Secure";
            // biome-ignore lint/suspicious/noDocumentCookie: keep-signin 정책을 적용하려면 커스텀 어댑터의 직접 기록이 필요 (Cookie Store API는 Safari 미지원)
            document.cookie = str;
          }
        },
      },
    }
  );
}
