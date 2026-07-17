import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import {
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { parseClubFilters } from "@/lib/club-filters";
import { queryClubs } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";

// GET /api/clubs - 클럽 목록 (검색/필터/정렬, /club 페이지와 동일한 queryClubs 사용)
export async function GET(request: NextRequest) {
  const filters = parseClubFilters(request.nextUrl.searchParams);
  try {
    let userId: string | undefined;
    if (filters.scope === "mine") {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return unauthorizedError();
      userId = user.id;
    }
    const result = await queryClubs(filters, userId);
    return successResponse({ clubs: result });
  } catch (err) {
    console.error("[clubs GET]", err);
    return serverError();
  }
}

const CreateClubSchema = z.object({
  name: z.string().trim().min(2, "클럽 이름은 2자 이상이어야 해요").max(30),
  category: z.string().trim().min(1, "카테고리를 선택해주세요").max(20),
  region: z.string().trim().min(1, "지역을 선택해주세요").max(20),
  description: z.string().trim().min(1, "클럽 소개를 입력해주세요").max(500),
  joinType: z.enum(["open", "approval"]).default("open"),
});

// POST /api/clubs - 클럽 생성 (생성자가 owner로 등록)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = CreateClubSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const clubId = crypto.randomUUID();
    const created = await db.transaction(async (tx) => {
      const [club] = await tx
        .insert(clubs)
        .values({
          id: clubId,
          ...parsed.data,
          ownerId: user.id,
          memberCount: 1,
        })
        .returning();
      await tx.insert(clubMembers).values({ clubId, userId: user.id, role: "owner" });
      return club;
    });

    return successResponse(created, 201);
  } catch (err) {
    console.error("[clubs POST]", err);
    return serverError();
  }
}
