import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clubMeetings,
  clubMembers,
  clubPosts,
  clubs,
  communityPosts,
  infoContents,
  meetingParticipants,
  profiles,
} from "@/db/schema";

export type HomeMeeting = {
  id: string;
  clubId: string;
  title: string;
  date: Date;
  location: string;
  clubName: string;
  category: string;
  coverImage: string | null;
};

export type PopularMeeting = HomeMeeting & {
  joinedCount: number;
  maxParticipants: number;
  participantAvatars: (string | null)[];
};

export type HomeInfo = {
  id: string;
  title: string;
  category: "health" | "finance" | "travel" | "hobby" | "gov";
  viewCount: number;
  likeCount: number;
};

export type HomePost = {
  id: string;
  title: string;
  nickname: string;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
};

export type HealthOneLiner = { text: string; href: string };

export const INFO_CATEGORY_LABELS: Record<HomeInfo["category"], string> = {
  health: "건강",
  finance: "금융",
  travel: "여행",
  hobby: "취미",
  gov: "정부지원",
};

// h_info_contents에 건강 글이 없을 때 일자 로테이션 폴백 (시안 "건강 한 줄")
const HEALTH_TIPS = [
  "물을 자주 마시는 습관이 피로 회복에 큰 도움이 됩니다.",
  "가벼운 스트레칭으로 하루를 시작해보세요.",
  "하루 30분 걷기가 심혈관 건강을 지켜줍니다.",
  "제철 채소를 식단에 더하면 면역력에 좋습니다.",
  "취침 1시간 전에는 휴대폰을 내려놓아 보세요.",
  "따뜻한 차 한 잔이 소화와 숙면을 돕습니다.",
  "손 씻기만 잘해도 감염병 대부분을 예방할 수 있습니다.",
];

const HERO_LIMIT = 3;
const POPULAR_LIMIT = 5;
const LIST_LIMIT = 3;
const MY_CLUB_LIMIT = 6;
const AVATAR_LIMIT = 3;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getMyNextMeetings(
  userId: string,
  limit = HERO_LIMIT
): Promise<HomeMeeting[]> {
  const rows = await db
    .select({
      id: clubMeetings.id,
      clubId: clubMeetings.clubId,
      title: clubMeetings.title,
      date: clubMeetings.date,
      location: clubMeetings.location,
      clubName: clubs.name,
      category: clubs.category,
      coverImage: clubs.coverImage,
    })
    .from(meetingParticipants)
    .innerJoin(clubMeetings, eq(meetingParticipants.meetingId, clubMeetings.id))
    .innerJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(
      and(
        eq(meetingParticipants.userId, userId),
        eq(meetingParticipants.status, "joined"),
        gte(clubMeetings.date, new Date())
      )
    )
    .orderBy(clubMeetings.date)
    .limit(limit);
  return rows.map((r) => ({ ...r, clubId: r.clubId ?? "" }));
}

export type HomeMyClub = {
  id: string;
  name: string;
  category: string;
  memberCount: number;
};

// 내가 가입한(active) 클럽 — 최근 가입순. 홈 "내 클럽" 섹션 (실데이터, 없으면 섹션 숨김)
export async function getMyClubs(userId: string, limit = MY_CLUB_LIMIT): Promise<HomeMyClub[]> {
  const rows = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      category: clubs.category,
      memberCount: clubs.memberCount,
    })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
    .where(and(eq(clubMembers.userId, userId), eq(clubMembers.status, "active")))
    .orderBy(desc(clubMembers.joinedAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, memberCount: r.memberCount ?? 0 }));
}

export type HomeNotice = {
  id: string;
  clubId: string;
  clubName: string;
  title: string | null;
  content: string;
  createdAt: Date;
};

// 내가 가입한 클럽의 공지(notice)글 — 홈 "클럽 공지" 섹션. 클럽 상세와 동일하게 중요 먼저·최신 게시일순.
export async function getMyClubNotices(userId: string, limit = LIST_LIMIT): Promise<HomeNotice[]> {
  const rows = await db
    .select({
      id: clubPosts.id,
      clubId: clubPosts.clubId,
      clubName: clubs.name,
      title: clubPosts.title,
      content: clubPosts.content,
      createdAt: clubPosts.createdAt,
    })
    .from(clubPosts)
    .innerJoin(
      clubMembers,
      and(
        eq(clubMembers.clubId, clubPosts.clubId),
        eq(clubMembers.userId, userId),
        eq(clubMembers.status, "active")
      )
    )
    .innerJoin(clubs, eq(clubPosts.clubId, clubs.id))
    // is_hidden 이 명시적 NULL 로 들어온 공지도 숨김 처리하지 않도록 IS NOT TRUE 로 판정
    .where(and(eq(clubPosts.type, "notice"), sql`${clubPosts.isHidden} is not true`))
    .orderBy(desc(clubPosts.isPinned), desc(clubPosts.publishedAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    clubId: r.clubId ?? "",
    clubName: r.clubName ?? "클럽",
    createdAt: r.createdAt ?? new Date(),
  }));
}

const joinedCountSql = sql<number>`(
  select count(*)::int
  from si_mvp.h_meeting_participants mp
  where mp.meeting_id = ${clubMeetings.id} and mp.status = 'joined'
)`;

export async function getPopularUpcomingMeetings(limit = POPULAR_LIMIT): Promise<PopularMeeting[]> {
  const rows = await db
    .select({
      id: clubMeetings.id,
      clubId: clubMeetings.clubId,
      title: clubMeetings.title,
      date: clubMeetings.date,
      location: clubMeetings.location,
      maxParticipants: clubMeetings.maxParticipants,
      clubName: clubs.name,
      category: clubs.category,
      coverImage: clubs.coverImage,
      joinedCount: joinedCountSql,
    })
    .from(clubMeetings)
    .innerJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(gte(clubMeetings.date, new Date()))
    .orderBy(desc(joinedCountSql), clubMeetings.date)
    .limit(limit);

  const ids = rows.map((r) => r.id);
  const avatarsByMeeting = new Map<string, (string | null)[]>();
  if (ids.length > 0) {
    const result = await db.execute(sql`
      select meeting_id, avatar_url
      from (
        select mp.meeting_id, p.avatar_url,
               row_number() over (partition by mp.meeting_id order by mp.joined_at desc) as rn
        from si_mvp.h_meeting_participants mp
        join si_mvp.h_profiles p on p.id = mp.user_id
        where mp.status = 'joined'
          and mp.meeting_id in (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `
          )})
      ) ranked
      where rn <= ${AVATAR_LIMIT}
    `);
    for (const row of result as unknown as { meeting_id: string; avatar_url: string | null }[]) {
      const list = avatarsByMeeting.get(row.meeting_id) ?? [];
      list.push(row.avatar_url);
      avatarsByMeeting.set(row.meeting_id, list);
    }
  }

  return rows.map((r) => ({
    ...r,
    clubId: r.clubId ?? "",
    maxParticipants: r.maxParticipants ?? 20,
    participantAvatars: avatarsByMeeting.get(r.id) ?? [],
  }));
}

export async function getRecommendedInfos(limit = LIST_LIMIT): Promise<HomeInfo[]> {
  const rows = await db
    .select({
      id: infoContents.id,
      title: infoContents.title,
      category: infoContents.category,
      viewCount: infoContents.viewCount,
      likeCount: infoContents.likeCount,
    })
    .from(infoContents)
    .orderBy(desc(infoContents.viewCount), desc(infoContents.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, viewCount: r.viewCount ?? 0, likeCount: r.likeCount ?? 0 }));
}

const popularitySql = sql<number>`${communityPosts.likeCount} + ${communityPosts.commentCount} * 2`;

export async function getPopularCommunityPosts(limit = LIST_LIMIT): Promise<HomePost[]> {
  const selection = {
    id: communityPosts.id,
    title: communityPosts.title,
    nickname: profiles.nickname,
    createdAt: communityPosts.createdAt,
    likeCount: communityPosts.likeCount,
    commentCount: communityPosts.commentCount,
  };
  const recent = await db
    .select(selection)
    .from(communityPosts)
    .leftJoin(profiles, eq(communityPosts.userId, profiles.id))
    .where(gte(communityPosts.createdAt, new Date(Date.now() - SEVEN_DAYS_MS)))
    .orderBy(desc(popularitySql), desc(communityPosts.createdAt))
    .limit(limit);
  // 최근 7일 글이 없으면 전체 최신 글로 폴백 (홈 섹션이 통째로 비어 보이지 않게)
  const rows =
    recent.length > 0
      ? recent
      : await db
          .select(selection)
          .from(communityPosts)
          .leftJoin(profiles, eq(communityPosts.userId, profiles.id))
          .orderBy(desc(communityPosts.createdAt))
          .limit(limit);
  return rows.map((r) => ({
    ...r,
    nickname: r.nickname ?? "하모니 회원",
    createdAt: r.createdAt ?? new Date(),
    likeCount: r.likeCount ?? 0,
    commentCount: r.commentCount ?? 0,
  }));
}

export async function getHealthOneLiner(todayKst: string): Promise<HealthOneLiner> {
  const [row] = await db
    .select({
      id: infoContents.id,
      title: infoContents.title,
      summaryBox: infoContents.summaryBox,
    })
    .from(infoContents)
    .where(eq(infoContents.category, "health"))
    .orderBy(desc(infoContents.createdAt))
    .limit(1);
  if (row) return { text: row.summaryBox?.trim() || row.title, href: `/info/${row.id}` };
  const dayIndex = Number(todayKst.slice(8, 10)) % HEALTH_TIPS.length;
  return { text: HEALTH_TIPS[dayIndex], href: "/info" };
}
