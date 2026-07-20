import type { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, serverError, successResponse } from "@/lib/api-response";
import { getSmsSender } from "@/lib/sms";
import { verifyStandardWebhook } from "@/lib/webhook-signature";

const HookPayloadSchema = z.object({
  user: z.object({ phone: z.string().min(1) }),
  sms: z.object({ otp: z.string().min(1) }),
});

// POST /api/auth/sms-hook — Supabase Send SMS Hook.
// Supabase가 OTP를 생성한 뒤 이 엔드포인트를 호출하고, 우리는 발송만 담당한다.
// 인증 없이 외부에서 호출되므로 서명 검증이 유일한 방어선이다.
export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_SMS_HOOK_SECRET;
  if (!secret) {
    console.error("[sms-hook] SUPABASE_SMS_HOOK_SECRET is not set");
    return serverError();
  }

  const raw = await request.text();
  const valid = verifyStandardWebhook({
    secret,
    id: request.headers.get("webhook-id") ?? "",
    timestamp: request.headers.get("webhook-timestamp") ?? "",
    signature: request.headers.get("webhook-signature") ?? "",
    payload: raw,
  });
  if (!valid) {
    console.error("[sms-hook] signature verification failed");
    return errorResponse("UNAUTHORIZED", "서명이 올바르지 않습니다", 401);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    console.error("[sms-hook] malformed JSON body");
    return errorResponse("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다", 400);
  }

  const parsed = HookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[sms-hook] unexpected payload shape");
    return errorResponse("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다", 400);
  }

  try {
    const { phone } = parsed.data.user;
    const { otp } = parsed.data.sms;
    await getSmsSender().send(phone, `[하모니] 인증번호 ${otp}를 입력해주세요. (3분 이내)`);
    return successResponse({ ok: true });
  } catch (err) {
    // 실패를 200으로 감추면 Supabase가 재시도하지 않는다 — 500으로 알린다.
    console.error("[sms-hook] send failed", err);
    return serverError();
  }
}
