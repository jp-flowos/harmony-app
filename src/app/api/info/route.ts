import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/info - 정보 콘텐츠 목록
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const search = searchParams.get("q");

  // TODO: DB query infoContents
  return jsonResponse({
    contents: [],
    pagination: { page, limit, total: 0 },
    filters: { category, search },
  });
}

// POST /api/info - 콘텐츠 작성 (관리자)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, content, tags, summaryBox } = body as {
      category?: string;
      title?: string;
      content?: string;
      tags?: string[];
      summaryBox?: string;
    };

    if (!category || !title || !content) {
      return errorResponse("필수 항목을 입력해주세요");
    }

    const article = {
      id: crypto.randomUUID(),
      category,
      title,
      content,
      summaryBox: summaryBox ?? "",
      tags: tags ?? [],
      viewCount: 0,
      likeCount: 0,
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(article, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
