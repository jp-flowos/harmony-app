import { and, asc, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  clubMeetings,
  clubMembers,
  clubPosts,
  clubs,
  meetingParticipants,
  meetingRsvps,
  profiles,
} from "@/db/schema";
import { requireUser } from "@/lib/auth-session";
import { formatMeetingDate } from "@/lib/format-date";
import { ClubDetailClient } from "./ClubDetailClient";

// 공지 게시일 표기 — 시니어 가독성 위해 "2026년 7월 21일" 형태
const NOTICE_DATE_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

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

  // 공지: type='notice' + 숨김 아님. 중요 공지 먼저, 그다음 최신 게시일순.
  const noticeRows = await db
    .select({
      id: clubPosts.id,
      title: clubPosts.title,
      content: clubPosts.content,
      imageUrls: clubPosts.imageUrls,
      isPinned: clubPosts.isPinned,
      publishedAt: clubPosts.publishedAt,
    })
    .from(clubPosts)
    .where(
      and(
        eq(clubPosts.clubId, id),
        eq(clubPosts.type, "notice"),
        sql`${clubPosts.isHidden} is not true`
      )
    )
    .orderBy(desc(clubPosts.isPinned), desc(clubPosts.publishedAt));

  // 멤버: 활성 멤버만. 모임장 → 운영진 → 멤버 순, 그다음 가입순. 각 항목은 프로필로 링크.
  const memberRows = await db
    .select({
      id: profiles.id,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      role: clubMembers.role,
    })
    .from(clubMembers)
    .innerJoin(profiles, eq(clubMembers.userId, profiles.id))
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.status, "active")))
    .orderBy(
      sql`case ${clubMembers.role} when 'owner' then 0 when 'admin' then 1 else 2 end`,
      asc(clubMembers.joinedAt)
    );

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
      notices={noticeRows.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        imageUrl: n.imageUrls?.[0] ?? null,
        isPinned: n.isPinned,
        dateLabel: NOTICE_DATE_FMT.format(n.publishedAt),
      }))}
      members={memberRows.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        avatarUrl: m.avatarUrl,
        role: m.role ?? "member",
      }))}
      canManageNotices={myRole === "owner" || myRole === "admin"}
      canDeleteNotices={myRole === "owner"}
      canCreateMeeting={myRole === "owner" || myRole === "admin"}
      myRole={myRole}
    />
  );
}
