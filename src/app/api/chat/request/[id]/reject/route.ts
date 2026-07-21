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
import { createClient } from "@/lib/supabase/server";

// POST /api/chat/request/[id]/reject - 받은 요청 거절
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [req] = await db
      .select({ toUser: chatRequests.toUser })
      .from(chatRequests)
      .where(eq(chatRequests.id, id))
      .limit(1);
    if (!req) return notFoundError("채팅 요청을 찾을 수 없어요");
    if (req.toUser !== user.id) return forbiddenError("거절 권한이 없어요");

    await db
      .update(chatRequests)
      .set({ status: "rejected" })
      .where(and(eq(chatRequests.id, id), eq(chatRequests.status, "pending")));
    return successResponse({ rejected: true });
  } catch (err) {
    console.error("[chat/request reject]", err);
    return serverError();
  }
}
