import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMembers, clubPosts, clubs } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// 공지 이미지는 클럽 전용 버킷이 없어 h-avatars 버킷을 재사용한다(공개 URL 형태 검증).
const AVATARS_PUBLIC_PREFIX = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  ""
)}/storage/v1/object/public/h-avatars/`;

// create/update 공용 — 폼은 항상 전체 필드를 보낸다(PATCH도 전체 치환).
export const NoticeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요")
    .max(100, "제목은 100자까지 입력할 수 있어요"),
  content: z
    .string()
    .trim()
    .min(1, "내용을 입력해주세요")
    .max(2000, "내용은 2000자까지 입력할 수 있어요"),
  isPinned: z.boolean().default(false),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "게시일을 선택해주세요"),
  imageUrl: z
    .string()
    .url("사진 주소가 올바르지 않아요")
    .max(500, "사진 주소가 너무 길어요")
    .refine((v) => v.startsWith(AVATARS_PUBLIC_PREFIX), "사진 주소가 올바르지 않아요")
    .nullable()
    .optional(),
});

// 사용자가 지정한 게시일(YYYY-MM-DD)을 KST 자정 기준 instant로 저장한다.
export function publishedAtToDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+09:00`);
}

// active 멤버의 역할을 반환(아니면 null). 공지 등록/수정=owner/admin, 삭제=owner 판정에 공용.
export async function loadActiveMemberRole(
  clubId: string,
  userId: string
): Promise<"owner" | "admin" | "member" | null> {
  const [membership] = await db
    .select({ role: clubMembers.role, status: clubMembers.status })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)))
    .limit(1);
  if (!membership || membership.status !== "active") return null;
  return membership.role ?? "member";
}

// POST /api/clubs/[id]/notices - 공지 등록 (owner/admin만)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = NoticeInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, id)).limit(1);
    if (!club) return notFoundError("클럽을 찾을 수 없습니다");

    const role = await loadActiveMemberRole(id, user.id);
    if (role !== "owner" && role !== "admin") {
      return forbiddenError("공지 등록은 모임장/운영진만 할 수 있어요");
    }

    const { title, content, isPinned, publishedAt, imageUrl } = parsed.data;
    const [created] = await db
      .insert(clubPosts)
      .values({
        id: crypto.randomUUID(),
        clubId: id,
        userId: user.id,
        type: "notice",
        title,
        content,
        isPinned,
        publishedAt: publishedAtToDate(publishedAt),
        imageUrls: imageUrl ? [imageUrl] : [],
      })
      .returning({ id: clubPosts.id });

    return successResponse(created, 201);
  } catch (err) {
    console.error("[notices POST]", err);
    return serverError();
  }
}
