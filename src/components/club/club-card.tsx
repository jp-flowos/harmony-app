import { MapPin, UsersThree } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AvatarStack } from "@/components/club/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { categoryEmoji } from "@/lib/club-emoji";

export type ClubCardData = {
  id: string;
  name: string;
  category: string;
  region: string;
  sido?: string | null;
  sigungu?: string | null;
  description: string;
  memberCount: number;
  coverImage?: string | null;
  memberAvatars?: (string | null)[];
  extraMemberCount?: number;
};

// 시안의 "인기" 배지 기준 (스펙 §4.3)
const POPULAR_THRESHOLD = 20;

export function ClubCard({ club }: { club: ClubCardData }) {
  const regionLabel = club.sido ? [club.sido, club.sigungu].filter(Boolean).join(" ") : club.region;
  return (
    <Link href={`/club/${club.id}`} className="block">
      <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="flex items-center gap-4 p-4">
          {club.coverImage ? (
            // biome-ignore lint/performance/noImgElement: Supabase Storage 원격 이미지 — next/image remotePatterns 미구성이라 img 사용
            <img
              src={club.coverImage}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-3xl">
              {categoryEmoji(club.category)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {club.memberCount >= POPULAR_THRESHOLD && (
              <Badge variant="default" className="mb-1">
                인기
              </Badge>
            )}
            <h3 className="truncate text-lg font-extrabold tracking-tight text-mocha-900">
              {club.name}
            </h3>
            <p className="mt-0.5 truncate text-base text-mocha-700">{club.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-mocha-700">
                <MapPin size={14} weight="duotone" />
                {regionLabel}
              </span>
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-mocha-700">
                <UsersThree size={14} weight="duotone" />
                {club.memberCount}명
              </span>
              <Badge variant="secondary">{club.category}</Badge>
            </div>
          </div>
          <AvatarStack
            avatarUrls={club.memberAvatars ?? []}
            extraCount={club.extraMemberCount ?? 0}
            className="shrink-0"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
