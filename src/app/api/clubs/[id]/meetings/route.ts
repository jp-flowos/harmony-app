import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// GET /api/clubs/[id]/meetings - 정기모임 목록
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: DB query
  return jsonResponse({ clubId: id, meetings: [] });
}

// POST /api/clubs/[id]/meetings - 정기모임 생성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { title, date, location, maxParticipants, description } = body as {
      title?: string;
      date?: string;
      location?: string;
      maxParticipants?: number;
      description?: string;
    };

    if (!title || !date || !location) {
      return errorResponse("필수 항목을 입력해주세요");
    }

    const meeting = {
      id: crypto.randomUUID(),
      clubId: id,
      title,
      date,
      location,
      maxParticipants: maxParticipants ?? 20,
      currentCount: 0,
      description: description ?? "",
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(meeting, 201);
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}
