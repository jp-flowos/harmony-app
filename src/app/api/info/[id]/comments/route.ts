import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { infoComments, infoContents, profiles } from "@/db/schema";
import {
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const CreateCommentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

// GET /api/info/[id]/comments - 댓글 목록 (작성자 nickname/avatar JOIN)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rows = await db
      .select({
        id: infoComments.id,
        contentId: infoComments.contentId,
        userId: infoComments.userId,
        content: infoComments.content,
        createdAt: infoComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(infoComments)
      .leftJoin(profiles, eq(infoComments.userId, profiles.id))
      .where(eq(infoComments.contentId, id))
      .orderBy(asc(infoComments.createdAt));

    return successResponse({ contentId: id, comments: rows });
  } catch (err) {
    console.error("[info comments GET]", err);
    return serverError();
  }
}

// POST /api/info/[id]/comments - 댓글 작성 (로그인 필수)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = CreateCommentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "댓글 내용이 올바르지 않습니다");
  }

  try {
    const [content] = await db
      .select({ id: infoContents.id })
      .from(infoContents)
      .where(eq(infoContents.id, id))
      .limit(1);
    if (!content) return notFoundError("콘텐츠를 찾을 수 없습니다");

    const commentId = crypto.randomUUID();
    await db.insert(infoComments).values({
      id: commentId,
      contentId: id,
      userId: user.id,
      content: parsed.data.content,
    });

    const [created] = await db
      .select({
        id: infoComments.id,
        contentId: infoComments.contentId,
        userId: infoComments.userId,
        content: infoComments.content,
        createdAt: infoComments.createdAt,
        authorNickname: profiles.nickname,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(infoComments)
      .leftJoin(profiles, eq(infoComments.userId, profiles.id))
      .where(eq(infoComments.id, commentId))
      .limit(1);

    return successResponse(created, 201);
  } catch (err) {
    console.error("[info comments POST]", err);
    return serverError();
  }
}
