import { and, count, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { serverError, successResponse, unauthorizedError } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

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

    let regionLabel = me.sido;
    let [{ value: regionMemberCount }] = await db
      .select({ value: count() })
      .from(profiles)
      .where(eq(profiles.sido, me.sido));

    if (me.sigungu) {
      regionLabel = `${me.sido} ${me.sigungu}`;
      [{ value: regionMemberCount }] = await db
        .select({ value: count() })
        .from(profiles)
        .where(and(eq(profiles.sido, me.sido), eq(profiles.sigungu, me.sigungu)));

      if (regionMemberCount < 10) {
        regionLabel = me.sido;
        [{ value: regionMemberCount }] = await db
          .select({ value: count() })
          .from(profiles)
          .where(eq(profiles.sido, me.sido));
      }
    }

    if (regionMemberCount < 10) {
      regionLabel = "전국";
      [{ value: regionMemberCount }] = await db.select({ value: count() }).from(profiles);
    }

    const peerSamples = await db
      .select({ nickname: profiles.nickname })
      .from(profiles)
      .where(
        and(eq(profiles.sido, me.sido), ne(profiles.id, user.id), isNotNull(profiles.nickname))
      )
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
