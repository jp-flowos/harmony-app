import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/clubs/[id]/posts - 게시판 목록
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type"); // general, notice, review, photo
  const page = Number(searchParams.get("page") ?? "1");

  // TODO: DB query
  return jsonResponse({
    clubId: id,
    posts: [],
    pagination: { page, total: 0 },
    filter: { type },
  });
}

// POST /api/clubs/[id]/posts - 게시글 작성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { content, type, imageUrls } = body as {
      content?: string;
      type?: string;
      imageUrls?: string[];
    };

    if (!content) {
      return errorResponse("내용을 입력해주세요");
    }

    const post = {
      id: crypto.randomUUID(),
      clubId: id,
      content,
      type: type ?? "general",
      imageUrls: imageUrls ?? [],
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(post, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
