import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import {
  errorResponse,
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// 활성 회원 수를 truth에서 재계산해 clubs.memberCount에 반영 (onboarding/recommendation 소비처용)
const activeMemberCount = (clubId: string) =>
  sql<number>`(SELECT count(*)::int FROM ${clubMembers}
    WHERE ${clubMembers.clubId} = ${clubId} AND ${clubMembers.status} = 'active')`;

// POST /api/clubs/[id]/join - 클럽 가입
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [club] = await db
      .select({ id: clubs.id, joinType: clubs.joinType })
      .from(clubs)
      .where(eq(clubs.id, id))
      .limit(1);
    if (!club) return notFoundError("클럽을 찾을 수 없습니다");

    // 기존 멤버십을 approval 게이트보다 먼저 확인 — 이미 가입된 회원은 멱등 처리
    const [existing] = await db
      .select({ status: clubMembers.status })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (existing?.status === "banned") {
      return forbiddenError("가입할 수 없는 클럽이에요");
    }
    if (existing) {
      return successResponse({ joined: true });
    }

    // 신규 가입에만 승인제 게이트 적용
    if (club.joinType === "approval") {
      return errorResponse("APPROVAL_REQUIRED", "승인제 클럽은 아직 준비 중이에요", 409);
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(clubMembers)
        .values({ clubId: id, userId: user.id, role: "member", status: "active" })
        .onConflictDoNothing();
      await tx
        .update(clubs)
        .set({ memberCount: activeMemberCount(id) })
        .where(eq(clubs.id, id));
    });

    return successResponse({ joined: true }, 201);
  } catch (err) {
    console.error("[club join POST]", err);
    return serverError();
  }
}

// DELETE /api/clubs/[id]/join - 클럽 탈퇴
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [membership] = await db
      .select({ role: clubMembers.role, status: clubMembers.status })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (!membership) return notFoundError("가입 내역이 없어요");
    if (membership.status === "banned") {
      // ban 기록 삭제 방지 — 탈퇴로 ban을 지우고 재가입하는 경로 차단
      return forbiddenError("처리할 수 없는 요청이에요");
    }
    if (membership.role === "owner") {
      return errorResponse("OWNER_CANNOT_LEAVE", "모임장은 탈퇴할 수 없어요", 409);
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(clubMembers)
        .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)));
      await tx
        .update(clubs)
        .set({ memberCount: activeMemberCount(id) })
        .where(eq(clubs.id, id));
    });

    return successResponse({ left: true });
  } catch (err) {
    console.error("[club join DELETE]", err);
    return serverError();
  }
}
