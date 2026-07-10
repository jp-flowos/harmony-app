import { eq } from "drizzle-orm";
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
import { errorResponse, jsonResponse } from "@/lib/api-utils";
import { createClient } from "@/lib/supabase/server";

// GET /api/clubs - 클럽 목록
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const region = searchParams.get("region");
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  // TODO: DB query with filters
  return jsonResponse({
    clubs: [],
    pagination: { page, limit, total: 0 },
    filters: { category, region },
  });
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
    await db.insert(clubs).values({
      id: clubId,
      ...parsed.data,
      ownerId: user.id,
      memberCount: 1,
    });
    await db.insert(clubMembers).values({ clubId, userId: user.id, role: "owner" });

    const [created] = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
    return successResponse(created, 201);
  } catch (err) {
    console.error("[clubs POST]", err);
    return serverError();
  }
}
