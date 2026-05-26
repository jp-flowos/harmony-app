import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { infoContents } from "@/db/schema";
import { notFoundError, serverError, successResponse } from "@/lib/api-response";

// GET /api/info/[id] - 콘텐츠 상세 + viewCount 원자적 증가 (best-effort)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [row] = await db.select().from(infoContents).where(eq(infoContents.id, id)).limit(1);
    if (!row) return notFoundError("콘텐츠를 찾을 수 없습니다");

    db.update(infoContents)
      .set({ viewCount: sql`${infoContents.viewCount} + 1` })
      .where(eq(infoContents.id, id))
      .catch((err) => console.error("[info GET viewCount]", err));

    return successResponse(row);
  } catch (err) {
    console.error("[info GET id]", err);
    return serverError();
  }
}
