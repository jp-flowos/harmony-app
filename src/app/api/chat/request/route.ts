import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// POST /api/chat/request - 1:1 채팅 요청
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toUserId } = body as { toUserId?: string };

    if (!toUserId) {
      return errorResponse("대상 사용자를 지정해주세요");
    }

    // TODO: Auth check + existing request check + DB insert chatRequests
    const chatRequest = {
      id: crypto.randomUUID(),
      toUserId,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return jsonResponse(chatRequest, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
