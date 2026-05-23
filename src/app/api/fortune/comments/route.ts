import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

interface FortuneComment {
  id: string;
  fortuneKey: string;
  userId: string;
  nickname: string;
  comment: string;
  createdAt: string;
}

// In-memory placeholder (would use DB in production)
const comments: FortuneComment[] = [];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fortuneKey = searchParams.get("fortuneKey");
  if (!fortuneKey) return errorResponse("fortuneKey is required");

  const filtered = comments.filter((c) => c.fortuneKey === fortuneKey);
  return jsonResponse(filtered);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const fortuneKey = body.fortuneKey as string | undefined;
  const comment = body.comment as string | undefined;

  if (!fortuneKey || !comment) {
    return errorResponse("fortuneKey and comment are required");
  }

  const newComment: FortuneComment = {
    id: crypto.randomUUID(),
    fortuneKey,
    userId: "anonymous",
    nickname: "익명",
    comment,
    createdAt: new Date().toISOString(),
  };
  comments.push(newComment);
  return jsonResponse(newComment, 201);
}
