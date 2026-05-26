import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const UpdateProfileSchema = z.object({
  nickname: z.string().min(1).max(20).optional(),
  region: z.string().min(1).max(20).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    if (!row) return notFoundError("프로필을 찾을 수 없습니다");
    return successResponse(row);
  } catch (err) {
    console.error("[profiles GET]", err);
    return serverError();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();
  if (user.id !== id) return forbiddenError("본인의 프로필만 수정할 수 있습니다");

  const parsed = UpdateProfileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다");
  }
  if (Object.keys(parsed.data).length === 0) {
    return validationError("수정할 내용이 없습니다");
  }

  try {
    const [updated] = await db
      .update(profiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!updated) return notFoundError("프로필을 찾을 수 없습니다");
    return successResponse(updated);
  } catch (err) {
    console.error("[profiles PATCH]", err);
    return serverError();
  }
}
