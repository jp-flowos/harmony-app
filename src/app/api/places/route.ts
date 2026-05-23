import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/places - 장소 목록
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") ?? "5000"; // meters

  // TODO: DB query with geo filter
  return jsonResponse({
    places: [],
    filters: { category, lat, lng, radius },
  });
}

// POST /api/places - 사용자 추천 장소 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, lat, lng, description } = body as {
      name?: string;
      category?: string;
      lat?: string;
      lng?: string;
      description?: string;
    };

    if (!name || !category || !lat || !lng) {
      return errorResponse("필수 항목을 입력해주세요");
    }

    const place = {
      id: crypto.randomUUID(),
      name,
      category,
      lat,
      lng,
      description: description ?? "",
      dataSource: "user",
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(place, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
