import {
  ArrowRight,
  CaretRight,
  ChatCircleDots,
  Eye,
  Fire,
  Heart,
  Megaphone,
  Newspaper,
  Sparkle,
  UserCirclePlus,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { MeetingCard } from "@/components/home/meeting-card";
import { MeetingHero } from "@/components/home/meeting-hero";
import { SearchEntry } from "@/components/home/search-entry";
import { KakaoShareButton } from "@/components/onboarding/KakaoShareButton";
import { NotificationOptInCard } from "@/components/onboarding/NotificationOptInCard";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { clubs, hobbies, profiles, userHobbies } from "@/db/schema";
import { categoryEmoji } from "@/lib/club-emoji";
import { kstDateString, relativeTimeLabel } from "@/lib/format-date";
import {
  generateFortune,
  getZodiacEmoji,
  getZodiacFromBirthYear,
  ZODIAC_ANIMALS,
} from "@/lib/fortune";
import {
  getHealthOneLiner,
  getMyClubNotices,
  getMyClubs,
  getMyNextMeetings,
  getPopularCommunityPosts,
  getPopularUpcomingMeetings,
  getRecommendedInfos,
  INFO_CATEGORY_LABELS,
} from "@/lib/queries/home";
import { scoreClubs } from "@/lib/recommendation";
import { createClient } from "@/lib/supabase/server";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showCarousel = false;
  let showShareButton = false;
  let myRegion: string | null = null;
  let myBirthYear: number | null = null;
  let myNickname: string | null = null;
  let myAvatarUrl: string | null = null;
  let myHobbies: string[] = [];
  if (user) {
    const [me] = await db
      .select({
        createdAt: profiles.createdAt,
        region: profiles.region,
        birthYear: profiles.birthYear,
        nickname: profiles.nickname,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (me?.createdAt) {
      const age = Date.now() - me.createdAt.getTime();
      showCarousel = age < SEVEN_DAYS_MS;
      showShareButton = age < ONE_DAY_MS;
    }
    myRegion = me?.region ?? null;
    myBirthYear = me?.birthYear ?? null;
    myNickname = me?.nickname ?? null;
    myAvatarUrl = me?.avatarUrl ?? null;

    const hobbyRows = await db
      .select({ category: hobbies.category })
      .from(userHobbies)
      .innerJoin(hobbies, eq(userHobbies.hobbyId, hobbies.id))
      .where(eq(userHobbies.userId, user.id));
    myHobbies = hobbyRows.map((h) => h.category);
  }

  const [nextMeetings, myClubs, notices, popularMeetings, infos, posts, health] = await Promise.all(
    [
      user ? getMyNextMeetings(user.id) : Promise.resolve([]),
      user ? getMyClubs(user.id) : Promise.resolve([]),
      user ? getMyClubNotices(user.id) : Promise.resolve([]),
      getPopularUpcomingMeetings(),
      getRecommendedInfos(),
      getPopularCommunityPosts(),
      getHealthOneLiner(kstDateString()),
    ]
  );

  // 개인화 추천 클럽 (기존 로직 유지 — 콘텐츠 기반, 협업 필터는 members 비워 스킵)
  const candidateClubs = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      category: clubs.category,
      region: clubs.region,
      memberCount: clubs.memberCount,
    })
    .from(clubs)
    .orderBy(desc(clubs.memberCount))
    .limit(20);

  let recommendedClubs: {
    id: string;
    name: string;
    category: string;
    reason: string;
    memberCount: number;
  }[] = [];
  if (user) {
    const scored = scoreClubs(
      { id: user.id, region: myRegion ?? "", birthYear: myBirthYear, hobbies: myHobbies },
      candidateClubs.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        region: c.region,
        memberCount: c.memberCount ?? 0,
        members: [],
      }))
    );
    const byId = new Map(candidateClubs.map((c) => [c.id, c]));
    recommendedClubs = scored.slice(0, 3).flatMap((s) => {
      const c = byId.get(s.id);
      if (!c) return [];
      return [
        {
          id: c.id,
          name: c.name,
          category: c.category,
          reason: s.reasons[0] ?? "추천 모임",
          memberCount: c.memberCount ?? 0,
        },
      ];
    });
  }
  if (recommendedClubs.length === 0) {
    recommendedClubs = candidateClubs.slice(0, 3).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      reason: "지금 인기 있는 모임",
      memberCount: c.memberCount ?? 0,
    }));
  }

  const today = kstDateString();
  const zodiac = myBirthYear
    ? getZodiacFromBirthYear(myBirthYear)
    : ZODIAC_ANIMALS[new Date().getDay() % ZODIAC_ANIMALS.length];
  const fortune = generateFortune(today, zodiac);

  return (
    <div className="space-y-7 p-5 pb-6">
      {/* 헤더: 로고 + 프로필 아바타 (시안의 알림 종은 알림 페이지 부재로 미노출 — 스펙 §10) */}
      <header className="flex items-center justify-between pt-3">
        <BrandMark size="sm" />
        <Link href="/mypage" aria-label="내 정보">
          <Avatar className="h-11 w-11 ring-2 ring-coral-100">
            {myAvatarUrl ? <AvatarImage src={myAvatarUrl} alt="" /> : null}
            <AvatarFallback className="text-base">
              {myNickname ? myNickname.slice(0, 1) : "🙂"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </header>

      <SearchEntry />

      {/* 프로필 완성 배너 (기존 유지 — 검색바 아래·히어로 위) */}
      <Link href="/mypage/edit" className="block">
        <Card className="border-coral-200 bg-gradient-to-br from-coral-50 to-cream-100 transition-all hover:shadow-warm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-soft">
              <Sparkle size={28} weight="fill" className="text-coral-500" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-extrabold text-mocha-900 leading-snug">
                프로필을 완성해보세요
              </p>
              <p className="mt-0.5 text-base text-mocha-700">
                나에게 맞는 모임을 더 잘 추천받을 수 있어요
              </p>
            </div>
            <CaretRight size={24} weight="bold" className="text-coral-600 shrink-0" />
          </CardContent>
        </Card>
      </Link>

      {/* 내 다음 모임 히어로 / 없으면 클럽 둘러보기 CTA */}
      {nextMeetings.length > 0 ? (
        <MeetingHero meetings={nextMeetings} />
      ) : (
        <Link href="/club" className="block">
          <Card className="border-coral-100 bg-gradient-to-br from-cream-50 to-coral-50 transition-all hover:shadow-warm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-soft">
                🤝
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-coral-700">내 다음 모임</p>
                <p className="mt-0.5 text-lg font-extrabold text-mocha-900 leading-snug">
                  아직 예정된 모임이 없어요
                </p>
                <p className="mt-0.5 text-base text-mocha-700">
                  관심사에 맞는 클럽에서 첫 모임을 찾아보세요
                </p>
              </div>
              <CaretRight size={24} weight="bold" className="text-coral-600 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* 내 클럽 (가입한 클럽 실데이터 — 없으면 섹션 숨김) */}
      {myClubs.length > 0 && (
        <Section
          icon={<UsersThree size={26} weight="duotone" className="text-coral-600" />}
          title="내 클럽"
          href="/club?tab=mine"
        >
          <div className="-mx-5 overflow-x-auto pb-2">
            <div className="flex gap-3 px-5">
              {myClubs.map((club) => (
                <Link key={club.id} href={`/club/${club.id}`} className="block w-40 shrink-0">
                  <Card className="h-full transition-all hover:border-coral-200 hover:shadow-soft">
                    <CardContent className="flex flex-col gap-2 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-50 text-2xl">
                        {categoryEmoji(club.category)}
                      </div>
                      <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-extrabold text-mocha-900 leading-snug">
                        {club.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-mocha-600">
                        <UsersThree size={16} weight="duotone" />
                        {club.memberCount}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* 클럽 공지 (내 가입 클럽의 notice 실데이터 — 없으면 섹션 숨김) */}
      {notices.length > 0 && (
        <Section
          icon={<Megaphone size={26} weight="duotone" className="text-coral-600" />}
          title="클럽 공지"
        >
          <div className="space-y-3">
            {notices.map((notice) => (
              <Link key={notice.id} href={`/club/${notice.clubId}`} className="block">
                <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{notice.clubName}</Badge>
                      <span className="text-sm font-semibold text-mocha-500">
                        {relativeTimeLabel(notice.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-base font-medium text-mocha-800 leading-snug">
                      {notice.title ?? notice.content}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 신규 유저 위젯 (기존 W1 장치 — 히어로 아래 유지) */}
      {showCarousel && <OnboardingCarousel />}
      {showShareButton && <KakaoShareButton />}
      {showCarousel && <NotificationOptInCard />}

      {/* 오늘의 운세 · 건강 한 줄 (2열) */}
      <section aria-label="오늘의 운세와 건강 한 줄" className="grid grid-cols-2 gap-3">
        <Link href={`/fortune?zodiac=${encodeURIComponent(fortune.zodiac)}`} className="block">
          <Card className="h-full border-sage-200 bg-gradient-to-br from-sage-50 to-cream-100 transition-all hover:shadow-soft">
            <CardContent className="space-y-1.5 p-4">
              <p className="flex items-center gap-1 text-sm font-extrabold text-coral-700">
                <span aria-hidden="true" className="text-base">
                  {getZodiacEmoji(fortune.zodiac)}
                </span>
                오늘의 운세
              </p>
              <p className="line-clamp-2 text-base font-semibold text-mocha-800">
                {fortune.general}
              </p>
              <p className="text-sm font-bold text-coral-700">자세히 보기 ›</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={health.href} className="block">
          <Card className="h-full border-sage-200 bg-gradient-to-br from-cream-50 to-sage-50 transition-all hover:shadow-soft">
            <CardContent className="space-y-1.5 p-4">
              <p className="flex items-center gap-1 text-sm font-extrabold text-sage-700">
                <span aria-hidden="true" className="text-base">
                  💧
                </span>
                건강 한 줄
              </p>
              <p className="line-clamp-2 text-base font-semibold text-mocha-800">{health.text}</p>
              <p className="text-sm font-bold text-sage-700">자세히 보기 ›</p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* 추천 콘텐츠 (실데이터) */}
      {infos.length > 0 && (
        <Section
          icon={<Newspaper size={26} weight="duotone" className="text-sage-700" />}
          title="추천 콘텐츠"
          href="/info"
        >
          <div className="space-y-3">
            {infos.map((info) => (
              <Link key={info.id} href={`/info/${info.id}`} className="block">
                <Card className="transition-all hover:border-sage-200 hover:shadow-soft">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <Badge variant="secondary" className="mb-1.5">
                        {INFO_CATEGORY_LABELS[info.category]}
                      </Badge>
                      <h3 className="text-lg font-bold text-mocha-900 leading-snug">
                        {info.title}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-base font-semibold text-mocha-700">
                      <span className="inline-flex items-center gap-1">
                        <Eye size={18} weight="duotone" />
                        {info.viewCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart size={18} weight="duotone" className="text-coral-500" />
                        {info.likeCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 인기 모임 (모임 단위, 가로 스크롤) */}
      {popularMeetings.length > 0 && (
        <Section
          icon={<Fire size={26} weight="duotone" className="text-[var(--color-danger)]" />}
          title="인기 모임"
          href="/club"
          hint="옆으로 넘겨보세요"
        >
          <div className="-mx-5 overflow-x-auto pb-2">
            <div className="flex gap-3 px-5">
              {popularMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* 나를 위한 추천 (기존 유지 — 인기 모임 아래) */}
      {recommendedClubs.length > 0 && (
        <Section
          icon={<UserCirclePlus size={26} weight="duotone" className="text-coral-600" />}
          title="나를 위한 추천"
          href="/club"
        >
          <div className="space-y-3">
            {recommendedClubs.map((rec) => (
              <Link key={rec.id} href={`/club/${rec.id}`} className="block">
                <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-50 text-3xl">
                      {categoryEmoji(rec.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-extrabold text-mocha-900">{rec.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="default">{rec.category}</Badge>
                        <span className="text-sm font-semibold text-coral-700">{rec.reason}</span>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-base font-semibold text-mocha-700">
                      <UsersThree size={18} weight="duotone" />
                      {rec.memberCount}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 커뮤니티 인기글 (실데이터) */}
      {posts.length > 0 && (
        <Section
          icon={<ChatCircleDots size={26} weight="duotone" className="text-coral-600" />}
          title="커뮤니티 인기글"
          href="/community"
        >
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/community/${post.id}`} className="block">
                <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-bold text-mocha-900 leading-snug">{post.title}</h3>
                    <div className="mt-3 flex items-center justify-between text-base">
                      <span className="font-semibold text-mocha-700">
                        {post.nickname} · {relativeTimeLabel(post.createdAt)}
                      </span>
                      <div className="flex items-center gap-4 text-mocha-700">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Heart size={18} weight="duotone" className="text-coral-500" />
                          {post.likeCount}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <ChatCircleDots size={18} weight="duotone" className="text-sage-600" />
                          {post.commentCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  href,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-mocha-900 tracking-tight">
          <span className="self-center">{icon}</span>
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-base font-bold text-coral-700 hover:text-coral-800"
          >
            더보기
            <ArrowRight size={18} weight="bold" />
          </Link>
        )}
      </div>
      {hint && <p className="text-sm text-mocha-500">{hint}</p>}
      {children}
    </section>
  );
}
