import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { chatRequests } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { getBlockRelation, isBlockedEitherWay } from "@/lib/blocks";
import { findOrCreatePrivateRoom } from "@/lib/chat/rooms";
import { isChatRequestActionable } from "@/lib/queries/chat-requests";
import { createClient } from "@/lib/supabase/server";

// POST /api/chat/request/[id]/accept - 받은 요청 수락 → private 방 승격
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [req] = await db
      .select({
        id: chatRequests.id,
        fromUser: chatRequests.fromUser,
        toUser: chatRequests.toUser,
        status: chatRequests.status,
        expiresAt: chatRequests.expiresAt,
      })
      .from(chatRequests)
      .where(eq(chatRequests.id, id))
      .limit(1);
    if (!req || !req.fromUser) return notFoundError("채팅 요청을 찾을 수 없어요");
    if (req.toUser !== user.id) return forbiddenError("수락 권한이 없어요");
    if (!isChatRequestActionable(req.status, req.expiresAt, new Date())) {
      return forbiddenError("이미 처리되었거나 만료된 요청이에요");
    }

    const rel = await getBlockRelation(user.id, req.fromUser);
    if (isBlockedEitherWay(rel)) return forbiddenError("차단 관계에서는 채팅할 수 없어요");

    const fromUser = req.fromUser;
    const roomId = await db.transaction(async (tx) => {
      const rid = await findOrCreatePrivateRoom(tx, fromUser, user.id);
      await tx
        .update(chatRequests)
        .set({ status: "accepted" })
        .where(and(eq(chatRequests.id, id), eq(chatRequests.status, "pending")));
      return rid;
    });

    return successResponse({ roomId });
  } catch (err) {
    console.error("[chat/request accept]", err);
    return serverError();
  }
}
