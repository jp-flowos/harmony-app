import { createHmac } from "node:crypto";
import { and, count, eq, gte, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { normalizeEmail } from "@/lib/auth-utils";

const HintSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email("이메일 형식이 올바르지 않아요")),
});

const WINDOW_MS = 10 * 60 * 1000;
// 로그인 실패마다 호출되므로 IP 한도는 find-id보다 여유를 둔다 (초과해도 일반 안내로 degrade).
// 특정 계정 열거를 실제로 묶는 것은 이메일 차원 한도다.
const MAX_IP_ATTEMPTS = 10;
const MAX_TARGET_ATTEMPTS = 5;

function clientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// 대상 차원 rate limit 키 — 저엔트로피 입력의 역산을 막기 위해 서버 시크릿 HMAC (find-id와 동일)
function targetKey(email: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "harmony-dev-secret";
  return createHmac("sha256", secret).update(`login_hint:${email}`).digest("hex").slice(0, 32);
}

async function overLimit(key: string, action: string, max: number): Promise<boolean> {
  await db.insert(authAttempts).values({ ip: key, action });
  const [attempts] = await db
    .select({ value: count() })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.ip, key),
        eq(authAttempts.action, action),
        gte(authAttempts.createdAt, new Date(Date.now() - WINDOW_MS))
      )
    );
  return (attempts?.value ?? 0) > max;
}

// POST /api/auth/login-hint — 비밀번호 로그인이 실패한 뒤에만 호출하는 사유 판별.
// 소셜 전용 계정(비밀번호 없음)일 때만 그 사실을 알려준다. 미가입/비밀번호 오류는
// 둘 다 provider: null 로 응답해 계정 열거를 막는다 (find-id 라우트와 동일한 정책).
export async function POST(request: NextRequest) {
  const parsed = HintSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  const { email } = parsed.data;

  try {
    if (await overLimit(clientIp(request), "login_hint", MAX_IP_ATTEMPTS)) {
      return errorResponse("RATE_LIMITED", "시도가 너무 많아요. 잠시 후 다시 시도해주세요.", 429);
    }
    if (await overLimit(targetKey(email), "login_hint_target", MAX_TARGET_ATTEMPTS)) {
      return errorResponse("RATE_LIMITED", "시도가 너무 많아요. 잠시 후 다시 시도해주세요.", 429);
    }

    // auth 스키마는 Drizzle 모델에 없어 raw SQL로 조회한다.
    // 판별 기준은 identity 구성 — email identity가 없고 kakao identity만 있으면
    // 비밀번호 로그인이 애초에 불가능한 계정이다. (비밀번호 해시 유무는 admin API로
    // 만든 계정에서 실제와 달라져 신뢰할 수 없다.)
    const rows = await db.execute<{ kakao_only: boolean }>(sql`
      select
        exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'kakao')
        and not exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email')
        as kakao_only
      from auth.users u
      where u.email = ${email} and u.deleted_at is null
      limit 1
    `);

    return successResponse({ provider: rows[0]?.kakao_only ? "kakao" : null });
  } catch (err) {
    console.error("[auth/login-hint]", err);
    return serverError();
  }
}
