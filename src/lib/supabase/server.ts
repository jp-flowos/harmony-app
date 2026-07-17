import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { KEEP_SIGNIN_COOKIE, shouldPersist, stripPersistence } from "@/lib/supabase/cookie-policy";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            const persist = shouldPersist(cookieStore.get(KEEP_SIGNIN_COOKIE)?.value);
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, persist ? options : stripPersistence(options));
            }
          } catch {
            // Server component can't set cookies
          }
        },
      },
    }
  );
}
