import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMeetings, clubMembers, meetingParticipants, meetingRsvps } from "@/db/schema";
import {
  errorResponse,
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const JoinSchema = z.object({ action: z.enum(["join", "cancel"]) });

// POST /api/clubs/[id]/meetings/[mid]/join - 회원 참석/취소 토글
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const { id, mid } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const parsed = JoinSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError();

  try {
    const [meeting] = await db
      .select({ id: clubMeetings.id, date: clubMeetings.date, max: clubMeetings.maxParticipants })
      .from(clubMeetings)
      .where(and(eq(clubMeetings.id, mid), eq(clubMeetings.clubId, id)))
      .limit(1);
    if (!meeting) return notFoundError("모임을 찾을 수 없습니다");
    if (meeting.date < new Date()) {
      return errorResponse("MEETING_PAST", "이미 지난 모임이에요", 409);
    }

    const [membership] = await db
      .select({ role: clubMembers.role })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
      .limit(1);
    if (!membership) return forbiddenError("클럽 회원만 참석할 수 있어요");

    if (parsed.data.action === "join") {
      const [{ count }] = await db
        .select({
          count: sql<number>`
            (SELECT count(*) FROM ${meetingParticipants}
              WHERE ${meetingParticipants.meetingId} = ${mid}
                AND ${meetingParticipants.status} = 'joined')::int
            + (SELECT count(*) FROM ${meetingRsvps}
                WHERE ${meetingRsvps.meetingId} = ${mid}
                  AND ${meetingRsvps.status} = 'joined')::int
          `,
        })
        .from(clubMeetings)
        .where(eq(clubMeetings.id, mid));
      if (count >= (meeting.max ?? 20)) {
        return errorResponse("MEETING_FULL", "모임 정원이 가득 찼어요", 409);
      }
    }

    const status = parsed.data.action === "join" ? ("joined" as const) : ("cancelled" as const);
    await db
      .insert(meetingParticipants)
      .values({ meetingId: mid, userId: user.id, status })
      .onConflictDoUpdate({
        target: [meetingParticipants.meetingId, meetingParticipants.userId],
        set: { status },
      });

    return successResponse({ status });
  } catch (err) {
    console.error("[meeting join POST]", err);
    return serverError();
  }
}
