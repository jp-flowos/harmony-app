import "server-only";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import { CLUB_CATEGORIES, type ClubFilters, ETC_CATEGORY } from "@/lib/club-filters";

export type ClubListEntry = {
  id: string;
  name: string;
  category: string;
  region: string;
  sido: string | null;
  sigungu: string | null;
  description: string;
  memberCount: number;
  coverImage: string | null;
  memberAvatars: (string | null)[];
  extraMemberCount: number;
};

const LIST_LIMIT = 100;
const AVATAR_LIMIT = 3;

export async function queryClubs(filters: ClubFilters, userId?: string): Promise<ClubListEntry[]> {
  if (filters.scope === "mine" && !userId) return [];

  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const cond = or(
      ilike(clubs.name, like),
      ilike(clubs.description, like),
      ilike(clubs.category, like)
    );
    if (cond) conditions.push(cond);
  }
  if (filters.sido) conditions.push(eq(clubs.sido, filters.sido));
  if (filters.sigungu) conditions.push(eq(clubs.sigungu, filters.sigungu));

  if (filters.categories?.length) {
    const named = filters.categories.filter((c) => c !== ETC_CATEGORY);
    const parts: SQL[] = [];
    if (named.length > 0) parts.push(inArray(clubs.category, named));
    if (filters.categories.includes(ETC_CATEGORY)) {
      parts.push(notInArray(clubs.category, [...CLUB_CATEGORIES]));
    }
    const cond = parts.length === 1 ? parts[0] : or(...parts);
    if (cond) conditions.push(cond);
  }

  if (filters.days?.length) conditions.push(arrayOverlaps(clubs.activityDays, [...filters.days]));
  if (filters.meetingType) conditions.push(eq(clubs.meetingType, filters.meetingType));
  if (filters.ageRange) conditions.push(inArray(clubs.ageRange, [filters.ageRange, "all"]));

  if (filters.members === "lte5") conditions.push(lte(clubs.memberCount, 5));
  if (filters.members === "6to15") {
    conditions.push(gte(clubs.memberCount, 6), lte(clubs.memberCount, 15));
  }
  if (filters.members === "16to30") {
    conditions.push(gte(clubs.memberCount, 16), lte(clubs.memberCount, 30));
  }
  if (filters.members === "gte30") conditions.push(gte(clubs.memberCount, 30));

  let query = db
    .select({
      id: clubs.id,
      name: clubs.name,
      category: clubs.category,
      region: clubs.region,
      sido: clubs.sido,
      sigungu: clubs.sigungu,
      description: clubs.description,
      memberCount: clubs.memberCount,
      coverImage: clubs.coverImage,
    })
    .from(clubs)
    .$dynamic();

  if (filters.scope === "mine" && userId) {
    query = query.innerJoin(
      clubMembers,
      and(
        eq(clubMembers.clubId, clubs.id),
        eq(clubMembers.userId, userId),
        eq(clubMembers.status, "active")
      )
    );
  }

  const rows = await query
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(filters.sort === "popular" ? desc(clubs.memberCount) : desc(clubs.createdAt))
    .limit(LIST_LIMIT);

  // 클럽별 최근 활성 멤버 아바타 3명 (윈도우 함수로 한 번에)
  const avatarsByClub = new Map<string, (string | null)[]>();
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    const result = await db.execute(sql`
      select club_id, avatar_url
      from (
        select cm.club_id, p.avatar_url,
               row_number() over (partition by cm.club_id order by cm.joined_at desc) as rn
        from si_mvp.h_club_members cm
        join si_mvp.h_profiles p on p.id = cm.user_id
        where cm.status = 'active'
          and cm.club_id in (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `
          )})
      ) ranked
      where rn <= ${AVATAR_LIMIT}
    `);
    for (const row of result as unknown as { club_id: string; avatar_url: string | null }[]) {
      const list = avatarsByClub.get(row.club_id) ?? [];
      list.push(row.avatar_url);
      avatarsByClub.set(row.club_id, list);
    }
  }

  return rows.map((row) => {
    const memberAvatars = avatarsByClub.get(row.id) ?? [];
    const memberCount = row.memberCount ?? 0;
    return {
      ...row,
      memberCount,
      memberAvatars,
      extraMemberCount: Math.max(0, memberCount - memberAvatars.length),
    };
  });
}
