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
import { REGIONS } from "@/lib/regions";
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

const CreateClubSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "클럽 이름은 2자 이상이어야 해요")
      .max(30, "클럽 이름은 30자 이내로 입력해주세요"),
    category: z
      .string()
      .trim()
      .min(1, "카테고리를 선택해주세요")
      .max(20, "카테고리가 올바르지 않아요"),
    description: z
      .string()
      .trim()
      .min(1, "클럽 소개를 입력해주세요")
      .max(500, "클럽 소개는 500자 이내로 입력해주세요"),
    sido: z
      .string()
      .trim()
      .min(1, "시/도를 선택해주세요")
      .max(10, "올바른 시/도가 아니에요")
      .refine((v) => Object.hasOwn(REGIONS, v), "올바른 시/도가 아니에요"),
    sigungu: z
      .string()
      .trim()
      .min(1, "시/군/구가 올바르지 않아요")
      .max(20, "시/군/구가 올바르지 않아요")
      .optional(),
    activityDays: z
      .array(
        z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "활동 요일이 올바르지 않아요")
      )
      .max(7, "활동 요일 선택이 올바르지 않아요")
      .default([]),
    meetingType: z
      .enum(["regular", "flash", "social", "study"], "모임 유형이 올바르지 않아요")
      .optional(),
    ageRange: z.enum(["all", "50s", "60s", "70plus"], "연령대가 올바르지 않아요").default("all"),
    joinType: z.enum(["open", "approval"], "가입 방식이 올바르지 않아요").default("open"),
  })
  .superRefine((data, ctx) => {
    const sigunguList = REGIONS[data.sido] ?? [];
    if (sigunguList.length > 0 && !data.sigungu) {
      ctx.addIssue({ code: "custom", message: "시/군/구를 선택해주세요" });
    }
    if (data.sigungu && sigunguList.length > 0 && !sigunguList.includes(data.sigungu)) {
      ctx.addIssue({ code: "custom", message: "올바른 시/군/구가 아니에요" });
    }
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

  const { sido, sigungu, activityDays, meetingType, ageRange, ...rest } = parsed.data;
  const region = sigungu ? `${sido} ${sigungu}` : sido;

  try {
    const clubId = crypto.randomUUID();
    const created = await db.transaction(async (tx) => {
      const [club] = await tx
        .insert(clubs)
        .values({
          id: clubId,
          ...rest,
          region,
          sido,
          sigungu: sigungu ?? null,
          activityDays,
          meetingType: meetingType ?? null,
          ageRange,
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
