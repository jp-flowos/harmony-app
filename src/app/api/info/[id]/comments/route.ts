import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/info/[id]/comments - 댓글 목록
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: DB query infoComments
  return jsonResponse({ contentId: id, comments: [] });
}

// POST /api/info/[id]/comments - 댓글 작성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { content } = body as { content?: string };

    if (!content) {
      return errorResponse("댓글 내용을 입력해주세요");
    }

    const comment = {
      id: crypto.randomUUID(),
      contentId: id,
      content,
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(comment, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
