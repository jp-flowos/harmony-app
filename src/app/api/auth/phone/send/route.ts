import { createHmac } from "node:crypto";
import { and, count, desc, eq, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { otpFailureMessage } from "@/lib/auth-errors";
import { toE164KR } from "@/lib/auth-utils";
import { POLICY_WINDOW_MS, decideSend } from "@/lib/otp-policy";
import { createClient } from "@/lib/supabase/server";

const SendSchema = z.object({ phone: z.string().min(1) });

function clientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// 번호를 원문으로 저장하지 않는다 — 저엔트로피 입력이라 서버 시크릿 HMAC을 쓴다 (find-id와 동일).
function phoneKey(e164: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "harmony-dev-secret";
  return createHmac("sha256", secret).update(`otp:${e164}`).digest("hex").slice(0, 32);
}

async function countSince(key: string, action: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.ip, key),
        eq(authAttempts.action, action),
        gte(authAttempts.createdAt, since)
      )
    );
  return row?.value ?? 0;
}

// POST /api/auth/phone/send — 인증번호 발송.
// 정책은 Supabase 호출 앞단에서 강제한다. Supabase 내장 제한은 번호/IP 차원으로 나뉘지 않는다.
export async function POST(request: NextRequest) {
  const parsed = SendSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(otpFailureMessage("invalid_phone"));
  }

  const e164 = toE164KR(parsed.data.phone);
  if (!e164) {
    return validationError(otpFailureMessage("invalid_phone"));
  }

  try {
    const ip = clientIp(request);
    const key = phoneKey(e164);
    const since = new Date(Date.now() - POLICY_WINDOW_MS);

    const [sentTodayForPhone, sentTodayForIp, lastRow] = await Promise.all([
      countSince(key, "otp_send_target", since),
      countSince(ip, "otp_send", since),
      db
        .select({ createdAt: authAttempts.createdAt })
        .from(authAttempts)
        .where(and(eq(authAttempts.ip, key), eq(authAttempts.action, "otp_send_target")))
        .orderBy(desc(authAttempts.createdAt))
        .limit(1),
    ]);

    const decision = decideSend({
      now: Date.now(),
      lastSentAt: lastRow[0]?.createdAt ? new Date(lastRow[0].createdAt).getTime() : null,
      sentTodayForPhone,
      sentTodayForIp,
    });

    if (!decision.allowed) {
      const message =
        decision.reason === "resend_wait"
          ? otpFailureMessage("resend_wait", { retryAfterSec: decision.retryAfterSec })
          : otpFailureMessage("send_limit");
      return errorResponse(decision.reason.toUpperCase(), message, 429);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: true },
    });
    if (error) {
      console.error("[auth/phone/send] signInWithOtp failed", error.status, error.message);
      return errorResponse("SEND_FAILED", otpFailureMessage("unknown"), 502);
    }

    // 발송에 성공했을 때만 카운터를 올린다. 실패한 발송을 한도에 포함시키지 않는다.
    await db.insert(authAttempts).values([
      { ip: key, action: "otp_send_target" },
      { ip, action: "otp_send" },
    ]);
    // 새 인증번호를 받았으므로 이전 실패 기록을 초기화한다.
    await db
      .delete(authAttempts)
      .where(and(eq(authAttempts.ip, key), eq(authAttempts.action, "otp_fail_target")));

    return successResponse({ sent: true });
  } catch (err) {
    console.error("[auth/phone/send]", err);
    return serverError();
  }
}
