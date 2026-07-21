import { MapPin, Prohibit, SealCheck, UserMinus, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UserProfileActions } from "@/components/user/UserProfileActions";
import { db } from "@/db";
import { clubMembers, clubs, hobbies, profiles, userHobbies } from "@/db/schema";
import { requireUser } from "@/lib/auth-session";
import { getBlockRelation } from "@/lib/blocks";
import { categoryEmoji } from "@/lib/club-emoji";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser();

  // #6 본인 프로필 → 마이페이지로 분기
  if (id === viewer.id) redirect("/mypage");

  // 안전 projection — 인증정보(phone/name/birthYear/email)는 절대 select 하지 않는다.
  const [profile] = await db
    .select({
      id: profiles.id,
      nickname: profiles.nickname,
      region: profiles.region,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      isVerified: profiles.isVerified,
    })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  // #4 프로필 부재(탈퇴 등) → 안내
  if (!profile) return <NoticeState icon="withdrawn" title="탈퇴한 사용자입니다" />;

  // #5 차단 관계 → 프로필/채팅 접근 제한
  const rel = await getBlockRelation(viewer.id, id);
  if (rel.blockedByThem && !rel.iBlocked) {
    // 상대가 나를 차단 — 차단 사실은 드러내지 않는 중립 안내
    return <NoticeState icon="unavailable" title="프로필을 볼 수 없습니다" />;
  }
  if (rel.iBlocked) {
    // 내가 차단 — 상세 미표시 + 해제 경로 제공
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ProfileAvatar nickname={profile.nickname} avatarUrl={profile.avatarUrl} size="lg" />
            <p className="text-lg font-bold text-mocha-900">차단한 사용자입니다</p>
            <p className="text-base text-mocha-500">
              차단을 해제하면 프로필과 채팅을 다시 볼 수 있어요
            </p>
            <div className="w-full max-w-xs">
              <UserProfileActions targetId={id} nickname={profile.nickname} mode="blocked-by-me" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 정상 — 취미 + 공통 클럽 로드
  const hobbyRows = await db
    .select({ name: hobbies.name })
    .from(userHobbies)
    .innerJoin(hobbies, eq(userHobbies.hobbyId, hobbies.id))
    .where(eq(userHobbies.userId, id));
  const hobbyNames = hobbyRows.map((h) => h.name);

  // 공통 참여 클럽 — 뷰어와 대상이 모두 active 멤버인 클럽 (교집합)
  const [viewerClubIds, targetClubs] = await Promise.all([
    db
      .select({ clubId: clubMembers.clubId })
      .from(clubMembers)
      .where(and(eq(clubMembers.userId, viewer.id), eq(clubMembers.status, "active"))),
    db
      .select({ id: clubs.id, name: clubs.name, category: clubs.category })
      .from(clubMembers)
      .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
      .where(and(eq(clubMembers.userId, id), eq(clubMembers.status, "active"))),
  ]);
  const viewerSet = new Set(viewerClubIds.map((r) => r.clubId));
  const commonClubs = targetClubs.filter((c) => viewerSet.has(c.id));

  return (
    <div className="space-y-4 p-4">
      {/* 프로필 헤더 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <ProfileAvatar nickname={profile.nickname} avatarUrl={profile.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-mocha-900">{profile.nickname}</h1>
                {profile.isVerified && (
                  <Badge className="gap-1">
                    <SealCheck size={14} weight="fill" /> 인증됨
                  </Badge>
                )}
              </div>
              {profile.region && (
                <p className="mt-1 flex items-center gap-1 text-base text-mocha-500">
                  <MapPin size={16} weight="duotone" />
                  {profile.region}
                </p>
              )}
              {profile.bio && (
                <p className="mt-2 whitespace-pre-wrap text-base text-mocha-700">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <UserProfileActions targetId={id} nickname={profile.nickname} mode="normal" />
          </div>
        </CardContent>
      </Card>

      {/* 관심 취미 */}
      {hobbyNames.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-mocha-900">관심 취미</h2>
          <div className="flex flex-wrap gap-2">
            {hobbyNames.map((name) => (
              <Badge key={name} variant="secondary" className="px-3 py-1 text-base">
                {name}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* 공통 참여 클럽 */}
      {commonClubs.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-mocha-900">
            <UsersThree size={22} weight="duotone" className="text-coral-600" />
            공통 참여 클럽
          </h2>
          <div className="space-y-2">
            {commonClubs.map((club) => (
              <Link key={club.id} href={`/club/${club.id}`} className="block">
                <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral-50 text-2xl">
                      {categoryEmoji(club.category)}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-base font-bold text-mocha-900">
                      {club.name}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProfileAvatar({
  nickname,
  avatarUrl,
  size,
}: {
  nickname: string;
  avatarUrl: string | null;
  size: "lg";
}) {
  return (
    <Avatar className={size === "lg" ? "h-20 w-20" : "h-12 w-12"}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="text-2xl">{nickname.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
}

function NoticeState({ icon, title }: { icon: "withdrawn" | "unavailable"; title: string }) {
  return (
    <div className="p-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-mocha-400">
            {icon === "withdrawn" ? (
              <UserMinus size={32} weight="duotone" />
            ) : (
              <Prohibit size={32} weight="duotone" />
            )}
          </div>
          <p className="text-lg font-bold text-mocha-900">{title}</p>
        </CardContent>
      </Card>
    </div>
  );
}
