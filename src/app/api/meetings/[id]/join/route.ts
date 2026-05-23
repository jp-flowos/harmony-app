import type { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-utils";

// POST /api/meetings/[id]/join - 모임 참여
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: Auth check + capacity check + DB insert
  return jsonResponse(
    {
      meetingId: id,
      joined: true,
      joinedAt: new Date().toISOString(),
    },
    201
  );
}

// DELETE /api/meetings/[id]/join - 모임 참여 취소
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: Auth check + DB update status to cancelled
  return jsonResponse({ meetingId: id, cancelled: true });
}
