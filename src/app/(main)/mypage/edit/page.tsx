import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "./EditProfileForm";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) redirect("/onboarding");

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-3">
        <Link
          href="/mypage"
          aria-label="뒤로 가기"
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200"
        >
          <ArrowLeft size={24} weight="bold" />
        </Link>
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">프로필 수정</h1>
      </div>

      <EditProfileForm
        userId={user.id}
        initial={{
          nickname: profile.nickname,
          region: profile.region,
          bio: profile.bio ?? "",
        }}
      />
    </div>
  );
}
