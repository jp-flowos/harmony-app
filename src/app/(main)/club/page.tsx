import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  CLUB_TABS,
  type ClubFilters,
  type ClubTab,
  parseClubFilters,
} from "@/lib/club-filters";
import { queryClubs } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";
import { ClubListClient } from "./ClubListClient";

export default async function ClubListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: ClubTab = (CLUB_TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as ClubTab)
    : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myRegion: { sido: string | null; sigungu: string | null } = { sido: null, sigungu: null };
  if (user) {
    const [me] = await db
      .select({ sido: profiles.sido, sigungu: profiles.sigungu })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (me) myRegion = me;
  }

  // 칩/시트에 보여줄 필터는 URL의 명시적 파라미터만. 탭 프리셋은 쿼리에만 합성한다.
  const urlFilters = parseClubFilters(params);
  let effective: ClubFilters = urlFilters;
  if (tab === "popular") effective = { ...effective, sort: "popular" };
  if (tab === "mine") effective = { ...effective, scope: "mine" };
  if (tab === "nearby" && myRegion.sido) {
    effective = { ...effective, sido: myRegion.sido, sigungu: myRegion.sigungu ?? undefined };
  }

  const nearbyUnavailable = tab === "nearby" && !myRegion.sido;
  const clubList = nearbyUnavailable ? [] : await queryClubs(effective, user?.id);

  return (
    <ClubListClient
      clubs={clubList}
      filters={urlFilters}
      tab={tab}
      nearbyUnavailable={nearbyUnavailable}
      isLoggedIn={!!user}
    />
  );
}
