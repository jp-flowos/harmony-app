import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { infoContents, profiles } from "@/db/schema";
import {
  forbiddenError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/is-admin";

const CATEGORIES = ["health", "finance", "travel", "hobby", "gov"] as const;

const QuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().min(1).max(100).optional(),
});

const CreateSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  summaryBox: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  author: z.string().trim().min(1).max(40).optional(),
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

// POST /api/info - 콘텐츠 작성 (관리자 전용)
export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await requireAdmin();
  if (!userId) return unauthorizedError();
  if (!isAdmin) return forbiddenError("관리자만 콘텐츠를 작성할 수 있습니다");

  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    let resolvedAuthor = parsed.data.author;
    if (!resolvedAuthor) {
      const [adminProfile] = await db
        .select({ nickname: profiles.nickname })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      resolvedAuthor = adminProfile?.nickname ?? "관리자";
    }

    const [inserted] = await db
      .insert(infoContents)
      .values({
        id: crypto.randomUUID(),
        category: parsed.data.category,
        title: parsed.data.title,
        content: parsed.data.content,
        summaryBox: parsed.data.summaryBox ?? null,
        tags: parsed.data.tags ?? [],
        author: resolvedAuthor,
        viewCount: 0,
        likeCount: 0,
      })
      .returning();

    return successResponse(inserted, 201);
  } catch (err) {
    console.error("[info POST]", err);
    return serverError();
  }
}
