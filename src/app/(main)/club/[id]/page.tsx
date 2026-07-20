import { and, asc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { clubMeetings, clubMembers, clubs, meetingParticipants, meetingRsvps } from "@/db/schema";
import { requireUser } from "@/lib/auth-session";
import { formatMeetingDate } from "@/lib/format-date";
import { ClubDetailClient } from "./ClubDetailClient";

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [club] = await db.select().from(clubs).where(eq(clubs.id, id)).limit(1);
  if (!club) notFound();

  const [membership] = await db
    .select({ role: clubMembers.role, status: clubMembers.status })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
    .limit(1);

  const [{ memberCount }] = await db
    .select({ memberCount: sql<number>`count(*)::int` })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.status, "active")));

  const myRole = membership?.status === "active" ? (membership.role ?? "member") : null;

  const meetingRows = await db
    .select({
      id: clubMeetings.id,
      title: clubMeetings.title,
      date: clubMeetings.date,
      location: clubMeetings.location,
      maxParticipants: clubMeetings.maxParticipants,
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

  return (
    <ClubDetailClient
      club={{
        id: club.id,
        name: club.name,
        category: club.category,
        region: club.region,
        description: club.description,
        memberCount,
      }}
      meetings={meetingRows.map((m) => ({
        id: m.id,
        title: m.title,
        dateLabel: formatMeetingDate(m.date),
        location: m.location,
        joinedCount: m.joinedCount,
        maxParticipants: m.maxParticipants ?? 20,
      }))}
      canCreateMeeting={myRole === "owner" || myRole === "admin"}
      myRole={myRole}
    />
  );
}
