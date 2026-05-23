import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/meetings/[id]/reviews - 모임 후기 목록
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");

  // TODO: DB query meetingReviews
  return jsonResponse({
    meetingId: id,
    reviews: [],
    pagination: { page, total: 0 },
  });
}

// POST /api/meetings/[id]/reviews - 후기 작성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { rating, content, imageUrls } = body as {
      rating?: number;
      content?: string;
      imageUrls?: string[];
    };

    if (!rating || !content) {
      return errorResponse("별점과 내용을 입력해주세요");
    }

    if (rating < 1 || rating > 5) {
      return errorResponse("별점은 1~5 사이여야 합니다");
    }

    const review = {
      id: crypto.randomUUID(),
      meetingId: id,
      rating,
      content,
      imageUrls: imageUrls ?? [],
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(review, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
