import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clubMembers, clubs, hobbies, profiles, userHobbies } from "@/db/schema";
import { serverError, successResponse, unauthorizedError } from "@/lib/api-response";
import { type ClubForRecommendation, scoreClubs } from "@/lib/recommendation";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorizedError();

    const [me] = await db
      .select({ sido: profiles.sido, birthYear: profiles.birthYear })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!me?.sido) {
      return successResponse({ club: null });
    }

    const userHobbyRows = await db
      .select({ name: hobbies.name })
      .from(userHobbies)
      .innerJoin(hobbies, eq(userHobbies.hobbyId, hobbies.id))
      .where(eq(userHobbies.userId, user.id));
    const hobbyNames = userHobbyRows.map((hobby) => hobby.name);

    const allClubs = await db.select().from(clubs).orderBy(desc(clubs.createdAt)).limit(200);
    if (allClubs.length === 0) {
      return successResponse({ club: null });
    }

    const memberRows = await db
      .select({ clubId: clubMembers.clubId, userId: clubMembers.userId })
      .from(clubMembers)
      .where(
        and(
          inArray(
            clubMembers.clubId,
            allClubs.map((club) => club.id)
          ),
          eq(clubMembers.status, "active")
        )
      );

    const membersByClub = new Map<string, string[]>();
    for (const member of memberRows) {
      const members = membersByClub.get(member.clubId) ?? [];
      members.push(member.userId);
      membersByClub.set(member.clubId, members);
    }

    const clubsForScoring: ClubForRecommendation[] = allClubs.map((club) => ({
      id: club.id,
      name: club.name,
      category: club.category,
      region: club.region,
      memberCount: club.memberCount ?? 0,
      members: membersByClub.get(club.id) ?? [],
    }));

    const [top] = scoreClubs(
      {
        id: user.id,
        region: me.sido,
        birthYear: me.birthYear ?? null,
        hobbies: hobbyNames,
      },
      clubsForScoring
    );

    if (!top) {
      return successResponse({ club: null });
    }

    const club = allClubs.find((candidate) => candidate.id === top.id);
    if (!club) {
      return successResponse({ club: null });
    }

    return successResponse({
      club: {
        id: club.id,
        name: club.name,
        category: club.category,
        description: club.description,
        memberCount: club.memberCount ?? 0,
        reasons: top.reasons,
      },
    });
  } catch (err) {
    console.error("[onboarding/first-club] failed", err);
    return serverError();
  }
}
