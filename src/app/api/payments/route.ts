import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

// POST /api/payments - 결제 준비 (토스페이먼츠)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body as { type?: string };

    if (type === "ready") {
      // 결제 준비
      const orderId = `HARMONY-${Date.now()}`;
      return jsonResponse({
        orderId,
        amount: 39000,
        orderName: "하모니 프리미엄 월간 구독",
        successUrl: `${request.nextUrl.origin}/subscribe?success=true`,
        failUrl: `${request.nextUrl.origin}/subscribe?success=false`,
      });
    }

    if (type === "confirm") {
      const { paymentKey, orderId, amount } = body as {
        paymentKey?: string;
        orderId?: string;
        amount?: number;
      };

      if (!paymentKey || !orderId || !amount) {
        return errorResponse("결제 정보가 부족합니다");
      }

      // TODO: 토스페이먼츠 API로 결제 승인 요청
      // const secretKey = process.env.TOSS_SECRET_KEY;
      // if (!secretKey) return errorResponse("결제 설정이 완료되지 않았습니다", 500);

      return jsonResponse({
        subscriptionId: crypto.randomUUID(),
        status: "active",
        amount,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return errorResponse("지원하지 않는 요청 타입입니다");
  } catch {
    return errorResponse("잘못된 요청입니다");
  }
}

// GET /api/payments - 구독 상태 조회
export async function GET() {
  // TODO: Auth check + DB query subscriptions
  return jsonResponse({
    subscription: null,
    isPremium: false,
  });
}
