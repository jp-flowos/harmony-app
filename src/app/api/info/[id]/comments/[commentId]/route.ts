import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { infoComments } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/info/[id]/comments/[commentId] - 본인 댓글만 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [existing] = await db
      .select({ userId: infoComments.userId })
      .from(infoComments)
      .where(and(eq(infoComments.id, commentId), eq(infoComments.contentId, id)))
      .limit(1);
    if (!existing) return notFoundError("댓글을 찾을 수 없습니다");
    if (existing.userId !== user.id) {
      return forbiddenError("본인이 작성한 댓글만 삭제할 수 있습니다");
    }

    await db.delete(infoComments).where(eq(infoComments.id, commentId));
    return successResponse({ deleted: true, id: commentId });
  } catch (err) {
    console.error("[info comment DELETE]", err);
    return serverError();
  }
}
