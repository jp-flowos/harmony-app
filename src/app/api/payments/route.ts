import { errorResponse } from "@/lib/api-response";

export async function POST() {
  return errorResponse("PAYMENTS_UNAVAILABLE", "결제 시스템이 아직 준비되지 않았습니다", 503);
}

export async function GET() {
  return errorResponse("PAYMENTS_UNAVAILABLE", "결제 시스템이 아직 준비되지 않았습니다", 503);
}
