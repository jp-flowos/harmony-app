import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  clubMeetings,
  clubMembers,
  clubs,
  meetingParticipants,
  meetingRsvps,
  profiles,
} from "@/db/schema";
import { requireUser } from "@/lib/auth-session";
import { formatMeetingDate } from "@/lib/format-date";
import { MeetingDetailClient } from "./MeetingDetailClient";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id, mid } = await params;
  const user = await requireUser();

  const [row] = await db
    .select({ meeting: clubMeetings, clubName: clubs.name })
    .from(clubMeetings)
    .leftJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(and(eq(clubMeetings.id, mid), eq(clubMeetings.clubId, id)))
    .limit(1);
  if (!row) notFound();
  const { meeting, clubName } = row;

  const [membership] = await db
    .select({ role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
    .limit(1);
  const isOwnerAdmin = membership?.role === "owner" || membership?.role === "admin";

  const participantRows = await db
    .select({
      userId: meetingParticipants.userId,
      status: meetingParticipants.status,
      nickname: profiles.nickname,
    })
    .from(meetingParticipants)
    .leftJoin(profiles, eq(meetingParticipants.userId, profiles.id))
    .where(eq(meetingParticipants.meetingId, mid));

  const guestRows = await db
    .select()
    .from(meetingRsvps)
    .where(eq(meetingRsvps.meetingId, mid))
    .orderBy(asc(meetingRsvps.createdAt));

  const participants = participantRows
    .filter((p) => p.status === "joined")
    .map((p) => ({ userId: p.userId, nickname: p.nickname ?? "회원" }));
  const guests = guestRows.map((g) => ({
    id: g.id,
    name: g.guestName,
    status: g.status,
    phone: isOwnerAdmin ? g.guestPhone : null,
  }));
  const joinedCount = participants.length + guests.filter((g) => g.status === "joined").length;

  return (
    <MeetingDetailClient
      clubId={id}
      meeting={{
        id: meeting.id,
        title: meeting.title,
        clubName: clubName ?? "하모니 모임",
        dateLabel: formatMeetingDate(meeting.date),
        location: meeting.location,
        description: meeting.description ?? "",
        maxParticipants: meeting.maxParticipants ?? 20,
        joinedCount,
      }}
      viewerJoined={participantRows.some((p) => p.userId === user.id && p.status === "joined")}
      participants={participants}
      guests={guests}
      isOwnerAdmin={isOwnerAdmin}
      isPast={meeting.date < new Date()}
    />
  );
}
