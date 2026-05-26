import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { infoContents } from "@/db/schema";
import { errorResponse as legacyErrorResponse, jsonResponse } from "@/lib/api-utils";
import { serverError, successResponse, validationError } from "@/lib/api-response";

const CATEGORIES = ["health", "finance", "travel", "hobby", "gov"] as const;
const QuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().min(1).max(100).optional(),
});

// GET /api/info - 정보 콘텐츠 목록 (페이지네이션·카테고리·검색)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    category: sp.get("category") ?? undefined,
    page: sp.get("page") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "잘못된 쿼리 파라미터입니다");
  }
  const { category, page, limit, q } = parsed.data;

  const whereParts = [
    category ? eq(infoContents.category, category) : undefined,
    q ? or(ilike(infoContents.title, `%${q}%`), ilike(infoContents.content, `%${q}%`)) : undefined,
  ].filter(Boolean);
  const whereClause = whereParts.length ? and(...whereParts) : undefined;

  try {
    const [contents, totalRow] = await Promise.all([
      db
        .select()
        .from(infoContents)
        .where(whereClause)
        .orderBy(desc(infoContents.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(infoContents).where(whereClause),
    ]);

    return successResponse({
      contents,
      pagination: { page, limit, total: totalRow[0]?.value ?? 0 },
      filters: { category: category ?? null, q: q ?? null },
    });
  } catch (err) {
    console.error("[info GET]", err);
    return serverError();
  }
}

// POST /api/info - 콘텐츠 작성 (관리자)
// Task 4에서 admin-only + DB INSERT로 교체 예정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, content, tags, summaryBox } = body as {
      category?: string;
      title?: string;
      content?: string;
      tags?: string[];
      summaryBox?: string;
    };
    if (!category || !title || !content) {
      return legacyErrorResponse("필수 항목을 입력해주세요");
    }
    const article = {
      id: crypto.randomUUID(),
      category,
      title,
      content,
      summaryBox: summaryBox ?? "",
      tags: tags ?? [],
      viewCount: 0,
      likeCount: 0,
      createdAt: new Date().toISOString(),
    };
    return jsonResponse(article, 201);
  } catch {
    return legacyErrorResponse("잘못된 요청입니다");
  }
}
