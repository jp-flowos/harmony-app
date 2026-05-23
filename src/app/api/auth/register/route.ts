import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const { userId, nickname } = await request.json();

    if (!userId || !nickname) {
      return NextResponse.json({ error: "userId와 nickname이 필요합니다." }, { status: 400 });
    }

    await db
      .insert(profiles)
      .values({
        id: userId,
        nickname,
        region: "서울",
      })
      .onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile creation error:", error);
    return NextResponse.json({ error: "프로필 생성 실패" }, { status: 500 });
  }
}
