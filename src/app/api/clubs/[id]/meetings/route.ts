import { and, asc, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMeetings, clubMembers, clubs, meetingParticipants, meetingRsvps } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const CreateMeetingSchema = z.object({
  title: z.string().trim().min(2, "모임 이름은 2자 이상이어야 해요").max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 선택해주세요"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "시간을 선택해주세요"),
  location: z.string().trim().min(1, "장소를 입력해주세요").max(100),
  maxParticipants: z.number().int().min(2).max(200).default(20),
  description: z.string().trim().max(500).optional(),
});

// GET /api/clubs/[id]/meetings - 정기모임 목록 (참석 인원은 라이브 계산)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const rows = await db
      .select({
        id: clubMeetings.id,
        title: clubMeetings.title,
        date: clubMeetings.date,
        location: clubMeetings.location,
        maxParticipants: clubMeetings.maxParticipants,
        description: clubMeetings.description,
        joinedCount: sql<number>`
          (SELECT count(*) FROM ${meetingParticipants}
            WHERE ${meetingParticipants.meetingId} = ${clubMeetings.id}
              AND ${meetingParticipants.status} = 'joined')::int
          + (SELECT count(*) FROM ${meetingRsvps}
              WHERE ${meetingRsvps.meetingId} = ${clubMeetings.id}
                AND ${meetingRsvps.status} = 'joined')::int
        `,
      })
      .from(clubMeetings)
      .where(eq(clubMeetings.clubId, id))
      .orderBy(asc(clubMeetings.date));

    return successResponse({ meetings: rows });
  } catch (err) {
    console.error("[meetings GET]", err);
    return serverError();
  }
}

// POST /api/clubs/[id]/meetings - 정기모임 생성 (owner/admin만)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = CreateMeetingSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, id)).limit(1);
    if (!club) return notFoundError("클럽을 찾을 수 없습니다");

    const [membership] = await db
      .select({ role: clubMembers.role })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (!membership || membership.role === "member") {
      return forbiddenError("모임 만들기는 모임장/운영진만 할 수 있어요");
    }

    const { title, date, time, location, maxParticipants, description } = parsed.data;
    const [created] = await db
      .insert(clubMeetings)
      .values({
        id: crypto.randomUUID(),
        clubId: id,
        title,
        date: new Date(`${date}T${time}:00+09:00`),
        location,
        maxParticipants,
        description: description ?? null,
      })
      .returning();

    return successResponse(created, 201);
  } catch (err) {
    console.error("[meetings POST]", err);
    return serverError();
  }
}
