import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// POST /api/reports - 신고
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetType, targetId, reason } = body as {
      targetType?: string;
      targetId?: string;
      reason?: string;
    };

    if (!targetType || !targetId || !reason) {
      return errorResponse("필수 항목을 입력해주세요");
    }

    // TODO: Auth check + DB insert reports
    const report = {
      id: crypto.randomUUID(),
      targetType,
      targetId,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(report, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
