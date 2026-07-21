import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { clubPosts } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMemberRole, NoticeInputSchema, publishedAtToDate } from "../route";

// 수정/삭제 대상이 이 클럽의 공지(type='notice')가 맞는지 검증.
async function loadClubNotice(postId: string, clubId: string) {
  const [post] = await db
    .select({ clubId: clubPosts.clubId, type: clubPosts.type })
    .from(clubPosts)
    .where(eq(clubPosts.id, postId))
    .limit(1);
  if (!post || post.clubId !== clubId || post.type !== "notice") return null;
  return post;
}

// PATCH /api/clubs/[id]/notices/[postId] - 공지 수정 (owner/admin, 대상은 이 클럽의 공지)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { id, postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = NoticeInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const role = await loadActiveMemberRole(id, user.id);
    if (role !== "owner" && role !== "admin") {
      return forbiddenError("공지 수정은 모임장/운영진만 할 수 있어요");
    }

    const notice = await loadClubNotice(postId, id);
    if (!notice) return notFoundError("공지를 찾을 수 없습니다");

    const { title, content, isPinned, publishedAt, imageUrl } = parsed.data;
    const [updated] = await db
      .update(clubPosts)
      .set({
        title,
        content,
        isPinned,
        publishedAt: publishedAtToDate(publishedAt),
        imageUrls: imageUrl ? [imageUrl] : [],
        updatedAt: new Date(),
      })
      .where(eq(clubPosts.id, postId))
      .returning({ id: clubPosts.id });

    return successResponse(updated);
  } catch (err) {
    console.error("[notices PATCH]", err);
    return serverError();
  }
}

// DELETE /api/clubs/[id]/notices/[postId] - 공지 삭제 (owner만)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { id, postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const role = await loadActiveMemberRole(id, user.id);
    if (role !== "owner") {
      return forbiddenError("공지 삭제는 모임장만 할 수 있어요");
    }

    const notice = await loadClubNotice(postId, id);
    if (!notice) return notFoundError("공지를 찾을 수 없습니다");

    await db.delete(clubPosts).where(eq(clubPosts.id, postId));
    return successResponse({ ok: true });
  } catch (err) {
    console.error("[notices DELETE]", err);
    return serverError();
  }
}
