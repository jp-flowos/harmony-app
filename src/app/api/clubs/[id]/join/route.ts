import type { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-utils";

// POST /api/clubs/[id]/join - 클럽 가입
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: Auth check + DB insert clubMembers
  return jsonResponse(
    {
      clubId: id,
      joined: true,
      joinedAt: new Date().toISOString(),
    },
    201
  );
}

// DELETE /api/clubs/[id]/join - 클럽 탈퇴
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: Auth check + DB delete
  return jsonResponse({ clubId: id, left: true });
}
