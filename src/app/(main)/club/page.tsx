import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { ClubListClient } from "./ClubListClient";

export default async function ClubListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allClubs = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      category: clubs.category,
      region: clubs.region,
      description: clubs.description,
      memberCount: clubs.memberCount,
    })
    .from(clubs)
    .orderBy(desc(clubs.memberCount))
    .limit(100);

  let myClubIds: string[] = [];
  if (user) {
    const rows = await db
      .select({ clubId: clubMembers.clubId })
      .from(clubMembers)
      .where(and(eq(clubMembers.userId, user.id), eq(clubMembers.status, "active")));
    myClubIds = rows.map((r) => r.clubId);
  }

  return <ClubListClient clubs={allClubs} myClubIds={myClubIds} />;
}
