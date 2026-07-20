import { createHmac } from "node:crypto";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { classifyOtpError, otpFailureMessage } from "@/lib/auth-errors";
import { toE164KR } from "@/lib/auth-utils";
import { decideSend, POLICY_WINDOW_MS } from "@/lib/otp-policy";
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
//
// 카운터 행은 판정 전에 먼저 insert한다 (find-id와 동일한 insert-then-count 패턴).
// "먼저 카운트 → await signInWithOtp (~1초) → 나중에 insert" 순서였던 예전 코드는
// 그 1초 사이에 도착한 모든 동시 요청이 같은 pre-write 상태를 읽어 전부 통과했다
// (동일 번호 200개 동시 요청 → 200개 전부 sentTodayForPhone=0으로 읽고 200통 발송·과금).
// insert를 먼저 하면 동시 요청도 서로의 행을 카운트에서 보게 되어 경합이 막힌다.
//
// 원칙: "실제로 SMS가 발송된 경우에만 하루 한도를 소모한다." resend_wait/send_limit로
// 막히거나 signInWithOtp가 실패하면 SMS는 나가지 않았으므로, 방금 넣은 행을 즉시
// 환불(삭제)한다 — 그래도 카운트 시점에는 행이 DB에 남아 있었으므로 동시 요청끼리
// 서로를 볼 수 있어 위 경합 방지 효과는 그대로 유지된다.
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

    // 재전송 대기시간은 insert보다 먼저 읽는다 — insert 후에 읽으면 방금 넣은
    // 자기 자신의 행을 "직전 발송"으로 착각한다. 30초 대기 창은 경합 창(~1초)보다
    // 훨씬 커서 이 read가 먼저 실행돼도 안전하다.
    // 다만 이 read 자체는 여전히 레이스가 있다 — 같은 번호로 최초 요청이 동시에
    // 여러 개 들어오면 전부 lastSentAt=null을 읽어 함께 통과할 수 있다(버스트 발송).
    // 하지만 이 버스트는 하루 발송 한도(MAX_SENDS_PER_PHONE_PER_DAY)로 상한이 걸려
    // 있어 과금이 무한히 새는 구멍은 아니다.
    const lastRow = await db
      .select({ createdAt: authAttempts.createdAt })
      .from(authAttempts)
      .where(and(eq(authAttempts.ip, key), eq(authAttempts.action, "otp_send_target")))
      .orderBy(desc(authAttempts.createdAt))
      .limit(1);
    const lastSentAt = lastRow[0]?.createdAt ? new Date(lastRow[0].createdAt).getTime() : null;

    // 카운트보다 먼저 insert — 동시 요청들이 서로의 행을 카운트에서 보게 하기 위해서다.
    // 판정이 막히면 아래에서 이 행들을 환불(삭제)한다 — SMS가 나가지 않았으니 한도도
    // 소모되면 안 된다. insert 자체는 카운트가 끝날 때까지 유지되므로 경합 방지 효과는
    // 남아 있다: 행이 "얼마나 오래 존재하는지"가 아니라 "카운트 시점에 존재하는지"가 핵심이다.
    const inserted = await db
      .insert(authAttempts)
      .values([
        { ip: key, action: "otp_send_target" },
        { ip, action: "otp_send" },
      ])
      .returning({ id: authAttempts.id });
    const insertedIds = inserted.map((row) => row.id);

    const [sentTodayForPhoneRaw, sentTodayForIpRaw] = await Promise.all([
      countSince(key, "otp_send_target", since),
      countSince(ip, "otp_send", since),
    ]);
    // 방금 넣은 자기 자신의 예약 행이 카운트에 포함돼 있으므로 1을 빼서 넘긴다.
    // N번째 요청은 insert 후 count=N을 본다. 빼지 않으면 decideSend가
    // sentTodayForPhone >= 5에서 5번째 요청부터 막아버려(실질 한도 4) off-by-one이 생긴다.
    // count-1을 넘기면 5번째 요청은 4(<5, 허용), 6번째 요청은 5(>=5, 차단) — 하루 5회가 정확히 지켜진다.
    const sentTodayForPhone = sentTodayForPhoneRaw - 1;
    const sentTodayForIp = sentTodayForIpRaw - 1;

    const decision = decideSend({
      now: Date.now(),
      lastSentAt,
      sentTodayForPhone,
      sentTodayForIp,
    });

    if (!decision.allowed) {
      // 막힌 시도는 SMS가 나가지 않았으므로 방금 넣은 두 행을 환불한다.
      // 그렇지 않으면 30초 대기(resend_wait)에 걸려 반복 탭한 시니어 사용자가
      // 실제로는 한 통도 더 못 받았는데 하루 한도(send_limit)까지 소모해버린다.
      // 반드시 이 요청이 넣은 id로만 지운다 — (ip, action)으로 지우면 같은 순간
      // 들어온 다른 동시 요청의 행까지 함께 지워버린다.
      await db.delete(authAttempts).where(inArray(authAttempts.id, insertedIds));

      const message =
        decision.reason === "resend_wait"
          ? otpFailureMessage("resend_wait", { retryAfterSec: decision.retryAfterSec })
          : otpFailureMessage("send_limit");
      const response = errorResponse(decision.reason.toUpperCase(), message, 429);
      if (decision.reason === "resend_wait") {
        // 한국어 문장에 파묻힌 초 단위 숫자를 파싱하지 않고도 카운트다운 UI가 쓸 수 있게.
        response.headers.set("Retry-After", String(decision.retryAfterSec));
      }
      return response;
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: true },
    });
    if (error) {
      console.error("[auth/phone/send] signInWithOtp failed", error.status, error.message);
      // 발송 실패는 한도를 소모하면 안 된다 — 방금 넣은 두 행만 정확히 지운다.
      // (ip, action)으로 지우면 같은 순간 들어온 다른 요청의 행까지 함께 지워버리므로
      // 반드시 이 요청이 넣은 id로만 지운다.
      await db.delete(authAttempts).where(inArray(authAttempts.id, insertedIds));

      // classifyOtpError는 검증 화면(code_mismatch 등)까지 포괄하는 공용 분류기다.
      // 이 발송 엔드포인트에서는 아직 사용자가 인증번호를 입력하지도 않았으므로
      // "인증번호가 맞지 않아요" 같은 메시지가 나오면 안 된다 — send_limit만 그대로
      // 받고 나머지는 전부 unknown으로 묶는다.
      const classified = classifyOtpError(error);
      const reason = classified === "send_limit" ? "send_limit" : "unknown";
      const message = otpFailureMessage(reason);
      if (reason === "send_limit") {
        return errorResponse("SEND_LIMIT", message, 429);
      }
      return errorResponse("SEND_FAILED", message, 502);
    }

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
