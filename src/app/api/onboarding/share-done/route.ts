import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { serverError, successResponse, unauthorizedError } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return unauthorizedError();

  try {
    await db.update(profiles).set({ kakaoShareDoneAt: new Date() }).where(eq(profiles.id, user.id));
    return successResponse({ ok: true });
  } catch (err) {
    console.error("[onboarding/share-done] failed", err);
    return serverError();
  }
}
