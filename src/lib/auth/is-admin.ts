import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AdminCheckResult {
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
}

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, userId: null, email: null };
  }

  const adminSet = parseAdminEmails();
  const email = user.email?.toLowerCase() ?? null;
  const isAdmin = email !== null && adminSet.has(email);

  return { isAdmin, userId: user.id, email };
}
