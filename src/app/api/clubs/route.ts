import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/clubs - 클럽 목록
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const region = searchParams.get("region");
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  // TODO: DB query with filters
  return jsonResponse({
    clubs: [],
    pagination: { page, limit, total: 0 },
    filters: { category, region },
  });
}

// POST /api/clubs - 클럽 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, region, description, joinType } = body as {
      name?: string;
      category?: string;
      region?: string;
      description?: string;
      joinType?: string;
    };

    if (!name || !category || !region || !description) {
      return errorResponse("필수 항목을 입력해주세요");
    }

    // TODO: Auth check + DB insert
    const club = {
      id: crypto.randomUUID(),
      name,
      category,
      region,
      description,
      joinType: joinType ?? "open",
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(club, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
