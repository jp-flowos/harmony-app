import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/clubs/[id] - 클럽 상세
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: DB query
  return jsonResponse({ id, message: "클럽 상세 (TODO)" });
}

// PATCH /api/clubs/[id] - 클럽 수정
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

// DELETE /api/clubs/[id] - 클럽 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: Auth check + DB delete
  return jsonResponse({ id, deleted: true });
}
