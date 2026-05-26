import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { infoComments, profiles } from "@/db/schema";
import { errorResponse as legacyErrorResponse, jsonResponse } from "@/lib/api-utils";
import { serverError, successResponse } from "@/lib/api-response";

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

// POST /api/info/[id]/comments - 댓글 작성 (Task 6에서 교체 예정)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { content } = body as { content?: string };
    if (!content) return legacyErrorResponse("댓글 내용을 입력해주세요");
    const comment = {
      id: crypto.randomUUID(),
      contentId: id,
      content,
      createdAt: new Date().toISOString(),
    };
    return jsonResponse(comment, 201);
  } catch {
    return legacyErrorResponse("잘못된 요청입니다");
  }
}
