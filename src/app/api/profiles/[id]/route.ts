import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/profiles/[id] - 프로필 조회
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: DB query
  return jsonResponse({ id, message: "프로필 조회 (TODO)" });
}

// PATCH /api/profiles/[id] - 프로필 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    // TODO: Auth check + DB update
    return jsonResponse({ id, ...body, updated: true });
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
