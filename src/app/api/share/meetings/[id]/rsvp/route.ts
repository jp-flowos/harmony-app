import { and, desc, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clubMeetings, meetingParticipants, meetingRsvps } from "@/db/schema";
import {
  errorResponse,
  notFoundError,
  serverError,
  successResponse,
  validationError,
} from "@/lib/api-response";

const RSVP_CAP = 200;

const RsvpSchema = z.object({
  guestName: z.string().trim().min(1, "이름을 입력해주세요").max(20, "이름은 20자까지 가능해요"),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[0-9-]{8,13}$/, "전화번호 형식이 올바르지 않아요")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["joined", "declined"]),
});

// POST /api/share/meetings/[id]/rsvp - 비로그인 게스트 참석 응답 (공개)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = RsvpSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }

  try {
    const [meeting] = await db
      .select({ id: clubMeetings.id, date: clubMeetings.date, max: clubMeetings.maxParticipants })
      .from(clubMeetings)
      .where(eq(clubMeetings.id, id))
      .limit(1);
    if (!meeting) return notFoundError("초대장을 찾을 수 없어요");
    if (meeting.date < new Date()) {
      return errorResponse("MEETING_PAST", "이미 지난 모임이에요", 409);
    }

    // 같은 번호 + 같은 이름의 기존 응답이 있으면 새 행 대신 업데이트 (동일인 마음 바꾸기 허용)
    const phoneDigits = parsed.data.guestPhone?.replace(/-/g, "");
    if (phoneDigits) {
      const [existing] = await db
        .select({ id: meetingRsvps.id, status: meetingRsvps.status })
        .from(meetingRsvps)
        .where(
          and(
            eq(meetingRsvps.meetingId, id),
            eq(meetingRsvps.guestName, parsed.data.guestName),
            sql`replace(${meetingRsvps.guestPhone}, '-', '') = ${phoneDigits}`
          )
        )
        .orderBy(desc(meetingRsvps.createdAt))
        .limit(1);

      if (existing) {
        if (parsed.data.status === "joined" && existing.status !== "joined") {
          const [{ joinedCount }] = await db
            .select({
              joinedCount: sql<number>`
                (SELECT count(*) FROM ${meetingParticipants}
                  WHERE ${meetingParticipants.meetingId} = ${id}
                    AND ${meetingParticipants.status} = 'joined')::int
                + (SELECT count(*) FROM ${meetingRsvps}
                    WHERE ${meetingRsvps.meetingId} = ${id}
                      AND ${meetingRsvps.status} = 'joined')::int
              `,
            })
            .from(clubMeetings)
            .where(eq(clubMeetings.id, id));
          if (joinedCount >= (meeting.max ?? 20)) {
            return errorResponse("MEETING_FULL", "모임 정원이 가득 찼어요", 409);
          }
        }

        await db
          .update(meetingRsvps)
          .set({ status: parsed.data.status })
          .where(eq(meetingRsvps.id, existing.id));

        return successResponse({
          id: existing.id,
          guestName: parsed.data.guestName,
          status: parsed.data.status,
          updated: true,
        });
      }
    }

    const [{ rsvpCount }] = await db
      .select({ rsvpCount: sql<number>`count(*)::int` })
      .from(meetingRsvps)
      .where(eq(meetingRsvps.meetingId, id));
    if (rsvpCount >= RSVP_CAP) {
      return errorResponse("RSVP_CAP", "응답이 너무 많아요. 총무님께 직접 말씀해주세요", 409);
    }

    if (parsed.data.status === "joined") {
      const [{ joinedCount }] = await db
        .select({
          joinedCount: sql<number>`
            (SELECT count(*) FROM ${meetingParticipants}
              WHERE ${meetingParticipants.meetingId} = ${id}
                AND ${meetingParticipants.status} = 'joined')::int
            + (SELECT count(*) FROM ${meetingRsvps}
                WHERE ${meetingRsvps.meetingId} = ${id}
                  AND ${meetingRsvps.status} = 'joined')::int
          `,
        })
        .from(clubMeetings)
        .where(eq(clubMeetings.id, id));
      if (joinedCount >= (meeting.max ?? 20)) {
        return errorResponse("MEETING_FULL", "모임 정원이 가득 찼어요", 409);
      }
    }

    const rsvpId = crypto.randomUUID();
    await db.insert(meetingRsvps).values({
      id: rsvpId,
      meetingId: id,
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone ?? null,
      status: parsed.data.status,
    });

    return successResponse(
      { id: rsvpId, guestName: parsed.data.guestName, status: parsed.data.status },
      201
    );
  } catch (err) {
    console.error("[share rsvp POST]", err);
    return serverError();
  }
}
