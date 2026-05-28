import { and, count, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { serverError, successResponse, unauthorizedError } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

type RegionScope = "sigungu" | "sido" | "national";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorizedError();

    const [me] = await db
      .select({
        sido: profiles.sido,
        sigungu: profiles.sigungu,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!me?.sido) {
      return successResponse({
        regionMemberCount: 0,
        regionLabel: "전국",
        peerSamples: [],
      });
    }

    let regionLabel: string;
    let regionScope: RegionScope;
    let regionMemberCount: number;
    let selectedSigungu: string | null = null;

    if (me.sigungu) {
      regionLabel = `${me.sido} ${me.sigungu}`;
      regionScope = "sigungu";
      selectedSigungu = me.sigungu;
      [{ value: regionMemberCount }] = await db
        .select({ value: count() })
        .from(profiles)
        .where(and(eq(profiles.sido, me.sido), eq(profiles.sigungu, me.sigungu)));

      if (regionMemberCount < 10) {
        regionLabel = me.sido;
        regionScope = "sido";
        [{ value: regionMemberCount }] = await db
          .select({ value: count() })
          .from(profiles)
          .where(eq(profiles.sido, me.sido));
      }
    } else {
      regionLabel = me.sido;
      regionScope = "sido";
      [{ value: regionMemberCount }] = await db
        .select({ value: count() })
        .from(profiles)
        .where(eq(profiles.sido, me.sido));
    }

    if (regionMemberCount < 10) {
      regionLabel = "전국";
      regionScope = "national";
      [{ value: regionMemberCount }] = await db.select({ value: count() }).from(profiles);
    }

    const peerBaseConditions = [ne(profiles.id, user.id), isNotNull(profiles.nickname)];
    const peerScopeConditions =
      regionScope === "sigungu" && selectedSigungu
        ? [eq(profiles.sido, me.sido), eq(profiles.sigungu, selectedSigungu)]
        : regionScope === "sido"
          ? [eq(profiles.sido, me.sido)]
          : [];

    const peerSamples = await db
      .select({ nickname: profiles.nickname })
      .from(profiles)
      .where(and(...peerBaseConditions, ...peerScopeConditions))
      .limit(3);

    return successResponse({
      regionMemberCount,
      regionLabel,
      peerSamples,
    });
  } catch (err) {
    console.error("[onboarding/welcome] failed", err);
    return serverError();
  }
}
