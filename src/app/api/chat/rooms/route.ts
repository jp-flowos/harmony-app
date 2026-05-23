import type { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-utils";

// GET /api/chat/rooms - 채팅방 목록
export async function GET(_request: NextRequest) {
  // TODO: Auth check + DB query chatRooms + chatRoomMembers
  return jsonResponse({ rooms: [] });
}
