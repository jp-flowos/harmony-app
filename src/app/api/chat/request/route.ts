import { and, eq, inArray, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { chatRequests, profiles } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { getBlockRelation, isBlockedEitherWay } from "@/lib/blocks";
import { createClient } from "@/lib/supabase/server";

const ChatRequestSchema = z.object({ toUserId: z.string().trim().min(1) });
const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

// POST /api/chat/request - 1:1 채팅 요청 (auth + 차단검사 + 중복방지 + DB 기록)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = ChatRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "대상 사용자를 지정해주세요");
  }
  const { toUserId } = parsed.data;
  if (toUserId === user.id) return validationError("자기 자신에게 채팅을 보낼 수 없어요");

  try {
    const [target] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, toUserId))
      .limit(1);
    if (!target) return notFoundError("사용자를 찾을 수 없습니다");

    // 차단 관계(양방향)면 채팅 요청 불가
    const rel = await getBlockRelation(user.id, toUserId);
    if (isBlockedEitherWay(rel)) {
      return forbiddenError("차단 관계에서는 채팅을 보낼 수 없어요");
    }

    // 이미 진행 중(pending/accepted)인 요청이 양방향으로 있으면 중복 생성 방지
    const [existing] = await db
      .select({ id: chatRequests.id, status: chatRequests.status })
      .from(chatRequests)
      .where(
        and(
          or(
            and(eq(chatRequests.fromUser, user.id), eq(chatRequests.toUser, toUserId)),
            and(eq(chatRequests.fromUser, toUserId), eq(chatRequests.toUser, user.id))
          ),
          inArray(chatRequests.status, ["pending", "accepted"])
        )
      )
      .limit(1);
    if (existing)
      return successResponse({ id: existing.id, status: existing.status, deduped: true });

    const [created] = await db
      .insert(chatRequests)
      .values({
        id: crypto.randomUUID(),
        fromUser: user.id,
        toUser: toUserId,
        status: "pending",
        expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
      })
      .returning({ id: chatRequests.id });

    return successResponse(created, 201);
  } catch (err) {
    console.error("[chat/request POST]", err);
    return serverError();
  }
}
