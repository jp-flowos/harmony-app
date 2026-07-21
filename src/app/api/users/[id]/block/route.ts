import { and, eq, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { blocks, chatRequests, profiles } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// POST /api/users/[id]/block - 차단
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();
  if (user.id === targetId) return forbiddenError("자기 자신을 차단할 수 없어요");

  try {
    const [target] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, targetId))
      .limit(1);
    if (!target) return notFoundError("사용자를 찾을 수 없습니다");

    await db
      .insert(blocks)
      .values({ blockerId: user.id, blockedId: targetId })
      .onConflictDoNothing();

    // 차단 시 두 사람 사이의 대기 중(pending) 채팅 요청을 정리한다.
    await db
      .delete(chatRequests)
      .where(
        and(
          eq(chatRequests.status, "pending"),
          or(
            and(eq(chatRequests.fromUser, user.id), eq(chatRequests.toUser, targetId)),
            and(eq(chatRequests.fromUser, targetId), eq(chatRequests.toUser, user.id))
          )
        )
      );

    return successResponse({ blocked: true });
  } catch (err) {
    console.error("[block POST]", err);
    return serverError();
  }
}

// DELETE /api/users/[id]/block - 차단 해제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, targetId)));
    return successResponse({ blocked: false });
  } catch (err) {
    console.error("[block DELETE]", err);
    return serverError();
  }
}
