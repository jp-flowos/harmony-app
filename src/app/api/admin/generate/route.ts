import type { NextRequest } from "next/server";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { generateFortuneContent, generateInfoDraft, isGeminiAvailable } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    // In production: verify admin role from session
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
      return successResponse({
        type: "fortune",
        zodiac,
        date,
        generated: fortune,
      });
    }

    if (type === "info") {
      const { topic, category } = body;
      if (!topic || !category) {
        return validationError("topic과 category를 입력해주세요");
      }

      const draft = await generateInfoDraft(topic, category);
      return successResponse({
        type: "info",
        generated: draft,
      });
    }

    return validationError("type은 fortune 또는 info만 가능합니다");
  } catch (err) {
    console.error("[admin/generate]", err);
    return serverError();
  }
}
