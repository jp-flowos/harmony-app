import { eq, inArray } from "drizzle-orm";
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
  nickname: z
    .string()
    .trim()
    .regex(/^[가-힣a-zA-Z0-9]{2,7}$/, "닉네임 형식이 올바르지 않습니다"),
  sido: z.string().trim().min(1, "지역을 선택해주세요"),
  sigungu: z.string().trim().max(20, "시/군/구가 올바르지 않아요").nullable().optional(),
  hobbyIds: z
    .array(z.string().trim().min(1))
    .min(1, "취미를 선택해주세요")
    .max(3, "취미는 최대 3개까지 선택할 수 있어요"),
  fontScale: z.enum(["sm", "md", "lg", "xl"], "글자 크기 값이 올바르지 않아요"),
  prefersVoiceGuide: z.boolean({ error: "음성 안내 설정이 올바르지 않아요" }),
  avatarUrl: z
    .string()
    .url("사진 주소가 올바르지 않아요")
    .max(500, "사진 주소가 너무 길어요")
    .refine(
      (v) =>
        v.startsWith(
          `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "")}/storage/v1/object/public/h-avatars/`
        ),
      "사진 주소가 올바르지 않아요"
    )
    .nullable()
    .optional(),
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

    const { nickname, sido, hobbyIds, fontScale, prefersVoiceGuide } = parsed.data;
    const sigungu = parsed.data.sigungu || null;
    const avatarUrl = parsed.data.avatarUrl || null;
    const region = sigungu ? `${sido} ${sigungu}` : sido;
    const uniqueHobbyIds = [...new Set(hobbyIds)];

    const existingHobbies = await db
      .select({ id: hobbies.id })
      .from(hobbies)
      .where(inArray(hobbies.id, uniqueHobbyIds));

    if (existingHobbies.length !== uniqueHobbyIds.length) {
      return validationError("선택한 취미를 찾을 수 없습니다");
    }

    await db.transaction(async (tx) => {
      const profileValues = {
        nickname,
        region,
        sido,
        sigungu,
        fontScale,
        prefersVoiceGuide,
        ...(avatarUrl ? { avatarUrl } : {}),
      };

      await tx
        .insert(profiles)
        .values({
          id: user.id,
          ...profileValues,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            ...profileValues,
            updatedAt: new Date(),
          },
        });

      await tx.delete(userHobbies).where(eq(userHobbies.userId, user.id));

      await tx
        .insert(userHobbies)
        .values(uniqueHobbyIds.map((hobbyId) => ({ userId: user.id, hobbyId })))
        .onConflictDoNothing();

      await tx
        .insert(verificationBadges)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          type: "first_meeting",
        })
        .onConflictDoNothing();
    });

    return successResponse({ ok: true });
  } catch (err) {
    console.error("[onboarding/complete] failed", err);
    return serverError();
  }
}
