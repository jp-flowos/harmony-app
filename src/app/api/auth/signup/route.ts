import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { profiles, userConsents } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { CONSENT_VERSION, isValidPhone, normalizePhone } from "@/lib/auth-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[가-힣]{2,10}$/, "이름은 한글 2~10자로 입력해주세요"),
  phone: z.string().transform(normalizePhone).refine(isValidPhone, "휴대폰 번호가 올바르지 않아요"),
  email: z.email("이메일 형식이 올바르지 않아요"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 해요")
    .max(72, "비밀번호는 72자 이내로 입력해주세요"),
  agreeTerms: z.literal(true, "이용약관 동의가 필요해요"),
  agreePrivacy: z.literal(true, "개인정보 처리방침 동의가 필요해요"),
});

// POST /api/auth/signup — 이메일 가입 (프로필 스텁 + 약관 동의 기록까지 원자 처리)
export async function POST(request: NextRequest) {
  const parsed = SignupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  const { name, phone, email, password } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, nickname: name } },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return errorResponse(
          "ALREADY_REGISTERED",
          "이미 가입된 이메일이에요. 로그인해주세요.",
          409
        );
      }
      console.error("[auth/signup] signUp failed", error);
      return errorResponse("SIGNUP_FAILED", "가입에 실패했어요. 잠시 후 다시 시도해주세요.", 400);
    }
    if (!data.user) {
      return errorResponse("SIGNUP_FAILED", "가입에 실패했어요. 잠시 후 다시 시도해주세요.", 400);
    }

    const userId = data.user.id;
    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(profiles)
          .values({ id: userId, nickname: name, name, phone })
          .onConflictDoUpdate({
            target: profiles.id,
            set: { name, phone, updatedAt: new Date() },
          });
        await tx.insert(userConsents).values([
          { userId, consentType: "terms", version: CONSENT_VERSION },
          { userId, consentType: "privacy", version: CONSENT_VERSION },
        ]);
      });
    } catch (txErr) {
      console.error("[auth/signup] profile/consent tx failed, compensating", txErr);
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(userId);
      } catch (delErr) {
        console.error("[auth/signup] compensation deleteUser failed", delErr);
      }
      return serverError();
    }

    // 이메일 확인이 켜진 프로젝트면 session이 없다 — 클라이언트가 안내 문구로 분기
    return successResponse({ needsEmailConfirm: !data.session }, 201);
  } catch (err) {
    console.error("[auth/signup]", err);
    return serverError();
  }
}
