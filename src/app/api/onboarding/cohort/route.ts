import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { serverError, successResponse, unauthorizedError } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatJoinedAgo(createdAt: Date | null): string {
  if (!createdAt) return "최근 시작";

  const days = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / DAY_MS));

  if (days === 0) return "오늘 시작";
  if (days === 1) return "어제 시작";
  return `${days}일 전 시작`;
}

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
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!me?.sido) {
      return successResponse({ peers: [] });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);
    const recentPeers = await db
      .select({
        nickname: profiles.nickname,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.sido, me.sido),
          ne(profiles.id, user.id),
          gte(profiles.createdAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(profiles.createdAt))
      .limit(5);

    return successResponse({
      peers: recentPeers.map((peer) => ({
        nickname: peer.nickname,
        joinedAgo: formatJoinedAgo(peer.createdAt),
      })),
    });
  } catch (err) {
    console.error("[onboarding/cohort] failed", err);
    return serverError();
  }
}
