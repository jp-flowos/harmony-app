import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";
import { generateFortune, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const zodiac = searchParams.get("zodiac") as ZodiacAnimal | null;

  if (zodiac && !ZODIAC_ANIMALS.includes(zodiac)) {
    return errorResponse("유효하지 않은 띠입니다");
  }

  if (zodiac) {
    return jsonResponse(generateFortune(date, zodiac));
  }

  // Return all zodiac fortunes
  const fortunes = ZODIAC_ANIMALS.map((z) => generateFortune(date, z));
  return jsonResponse(fortunes);
}
