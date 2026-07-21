import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { reports } from "@/db/schema";
import {
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const ReportSchema = z.object({
  targetType: z.enum(["user", "post", "comment", "chat"]),
  targetId: z.string().trim().min(1),
  reason: z.string().trim().min(1, "신고 사유를 선택해주세요").max(100),
  detail: z.string().trim().max(500).optional(),
});

// POST /api/reports - 신고 (auth + DB 기록)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = ReportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  const { targetType, targetId, reason, detail } = parsed.data;

  if (targetType === "user" && targetId === user.id) {
    return validationError("자기 자신은 신고할 수 없어요");
  }

  try {
    // 같은 대상에 대한 대기 중(pending) 신고 중복은 idempotent 처리(스팸 방지)
    const [dupe] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, user.id),
          eq(reports.targetType, targetType),
          eq(reports.targetId, targetId),
          eq(reports.status, "pending")
        )
      )
      .limit(1);
    if (dupe) return successResponse({ id: dupe.id, deduped: true });

    const composedReason = detail ? `${reason} - ${detail}` : reason;
    const [created] = await db
      .insert(reports)
      .values({
        id: crypto.randomUUID(),
        reporterId: user.id,
        targetType,
        targetId,
        reason: composedReason,
      })
      .returning({ id: reports.id });

    return successResponse(created, 201);
  } catch (err) {
    console.error("[reports POST]", err);
    return serverError();
  }
}
