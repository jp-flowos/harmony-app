import { and, count, eq, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts, profiles } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { isValidPhone, maskEmail, normalizePhone } from "@/lib/auth-utils";
import { createAdminClient } from "@/lib/supabase/admin";

const FindIdSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(10, "이름이 올바르지 않아요"),
  phone: z.string().transform(normalizePhone).refine(isValidPhone, "휴대폰 번호가 올바르지 않아요"),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// POST /api/auth/find-id — 이름+휴대폰으로 마스킹된 이메일 조회 (스펙 §7.3)
export async function POST(request: NextRequest) {
  const parsed = FindIdSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const ip = clientIp(request);
    await db.insert(authAttempts).values({ ip, action: "find_id" });
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const [attempts] = await db
      .select({ value: count() })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.ip, ip),
          eq(authAttempts.action, "find_id"),
          gte(authAttempts.createdAt, windowStart)
        )
      );
    if ((attempts?.value ?? 0) > MAX_ATTEMPTS) {
      return errorResponse("RATE_LIMITED", "시도가 너무 많아요. 잠시 후 다시 시도해주세요.", 429);
    }

    const { name, phone } = parsed.data;
    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.name, name), eq(profiles.phone, phone)))
      .limit(1);

    // 불일치 시 어느 필드가 틀렸는지 노출하지 않음 (계정 열거 방지)
    if (!profile) return successResponse({ found: false as const });

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(profile.id);
    if (error || !data.user?.email) {
      console.error("[auth/find-id] admin lookup failed", error);
      return successResponse({ found: false as const });
    }
    if (data.user.app_metadata?.provider === "kakao") {
      return successResponse({ found: true as const, provider: "kakao" as const });
    }
    return successResponse({ found: true as const, maskedEmail: maskEmail(data.user.email) });
  } catch (err) {
    console.error("[auth/find-id]", err);
    return serverError();
  }
}
