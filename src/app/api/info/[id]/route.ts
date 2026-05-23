import type { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-utils";

// GET /api/info/[id] - 콘텐츠 상세
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: DB query + viewCount increment
  return jsonResponse({ id, message: "콘텐츠 상세 (TODO)" });
}
