import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/is-admin";
import {
  errorResponse,
  forbiddenError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { generateFortuneContent, generateInfoDraft, isGeminiAvailable } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await requireAdmin();
  if (!userId) return unauthorizedError();
  if (!isAdmin) return forbiddenError("관리자만 사용할 수 있습니다");

  try {
    const body = (await request.json()) as Record<string, string>;
    const { type } = body;

    if (!isGeminiAvailable()) {
      return errorResponse("GEMINI_UNAVAILABLE", "Gemini API가 설정되지 않았습니다", 503);
    }

    if (type === "fortune") {
      const { zodiac, date } = body;
      if (!zodiac || !date) {
        return validationError("zodiac과 date를 입력해주세요");
      }
      const fortune = await generateFortuneContent(zodiac, date);
      return successResponse({ type: "fortune", zodiac, date, generated: fortune });
    }

    if (type === "info") {
      const { topic, category } = body;
      if (!topic || !category) {
        return validationError("topic과 category를 입력해주세요");
      }
      const draft = await generateInfoDraft(topic, category);
      return successResponse({ type: "info", generated: draft });
    }

    return validationError("type은 fortune 또는 info만 가능합니다");
  } catch (err) {
    console.error("[admin/generate]", err);
    return serverError();
  }
}
