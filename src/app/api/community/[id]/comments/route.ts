import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

const commentsStore: PostComment[] = [];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jsonResponse(commentsStore.filter((c) => c.postId === id));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const content = body.content as string | undefined;
  if (!content) return errorResponse("content is required");

  const comment: PostComment = {
    id: crypto.randomUUID(),
    postId: id,
    userId: "anonymous",
    content,
    createdAt: new Date().toISOString(),
  };
  commentsStore.push(comment);
  return jsonResponse(comment, 201);
}
