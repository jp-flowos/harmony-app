import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { hobbies, profiles, userHobbies, verificationBadges } from "@/db/schema";
import {
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const CompleteOnboardingSchema = z.object({
  nickname: z.string().trim().min(1).max(20),
  sido: z.string().trim().min(1),
  sigungu: z.string().trim().max(20).nullable().optional(),
  hobbyId: z.string().trim().min(1),
  fontScale: z.enum(["sm", "md", "lg", "xl"]),
  prefersVoiceGuide: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorizedError();

    const parsed = CompleteOnboardingSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
    }

    const { nickname, sido, hobbyId, fontScale, prefersVoiceGuide } = parsed.data;
    const sigungu = parsed.data.sigungu || null;
    const region = sigungu ? `${sido} ${sigungu}` : sido;

    const [existingHobby] = await db
      .select({ id: hobbies.id })
      .from(hobbies)
      .where(eq(hobbies.id, hobbyId))
      .limit(1);

    if (!existingHobby) {
      return validationError("선택한 취미를 찾을 수 없습니다");
    }

    await db.transaction(async (tx) => {
      const [existingProfile] = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);

      const profileValues = {
        nickname,
        region,
        sido,
        sigungu,
        fontScale,
        prefersVoiceGuide,
      };

      if (existingProfile) {
        await tx
          .update(profiles)
          .set({
            ...profileValues,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, user.id));
      } else {
        await tx.insert(profiles).values({
          id: user.id,
          ...profileValues,
        });
      }

      await tx.delete(userHobbies).where(eq(userHobbies.userId, user.id));

      await tx.insert(userHobbies).values({ userId: user.id, hobbyId }).onConflictDoNothing();

      const [existingBadge] = await tx
        .select({ id: verificationBadges.id })
        .from(verificationBadges)
        .where(
          and(eq(verificationBadges.userId, user.id), eq(verificationBadges.type, "first_meeting"))
        )
        .limit(1);

      if (!existingBadge) {
        await tx.insert(verificationBadges).values({
          id: crypto.randomUUID(),
          userId: user.id,
          type: "first_meeting",
        });
      }
    });

    return successResponse({ ok: true });
  } catch (err) {
    console.error("[onboarding/complete] failed", err);
    return serverError();
  }
}
