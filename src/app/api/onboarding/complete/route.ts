import { eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import postgres from "postgres";
import { z } from "zod";
import { db } from "@/db";
import { hobbies, profiles, userConsents, userHobbies, verificationBadges } from "@/db/schema";
import {
  errorResponse,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { CONSENT_VERSION } from "@/lib/auth-utils";
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
  agreeTerms: z.literal(true, "이용약관 동의가 필요해요"),
  agreePrivacy: z.literal(true, "개인정보 처리방침 동의가 필요해요"),
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
        // auth.users.phone이 정본이다. 프로필은 가입 시점에 복사만 한다.
        ...(user.phone ? { phone: `+${user.phone.replace(/^\+/, "")}` } : {}),
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

      // 온보딩을 다시 완료해도 동의가 중복 적재되지 않도록 기존 버전 기록을 정리한다.
      await tx.delete(userConsents).where(eq(userConsents.userId, user.id));
      await tx.insert(userConsents).values([
        { userId: user.id, consentType: "terms", version: CONSENT_VERSION },
        { userId: user.id, consentType: "privacy", version: CONSENT_VERSION },
      ]);
    });

    return successResponse({ ok: true });
  } catch (err) {
    // h_profiles.phone에는 별도의 부분 유니크 인덱스(h_idx_profiles_phone_unique)가 있다.
    // upsert의 onConflictDoUpdate는 profiles.id 충돌만 다루므로, 이미 다른 프로필이
    // 선점한 번호로 들어오면 이 인덱스 위반(23505)이 conflict 절을 우회해 그대로 던져진다.
    // 여기서 잡지 않으면 사용자는 재시도해도 매번 같은 500을 보게 되어 진행이 막힌다.
    if (err instanceof postgres.PostgresError && err.code === "23505") {
      console.error("[onboarding/complete] phone collision", err.code, err.constraint_name);
      return errorResponse(
        "PHONE_ALREADY_LINKED",
        "이 휴대폰 번호는 이미 다른 계정에 연결되어 있어요. 고객센터로 문의해주세요.",
        409
      );
    }
    console.error("[onboarding/complete] failed", err);
    return serverError();
  }
}
