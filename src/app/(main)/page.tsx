import {
  ArrowRight,
  CaretRight,
  ChatCircleDots,
  Eye,
  Fire,
  Hand,
  Heart,
  MagnifyingGlass,
  Mountains,
  Newspaper,
  PaintBrush,
  Sparkle,
  Star,
  UserCirclePlus,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateFortune, getZodiacEmoji, ZODIAC_ANIMALS } from "@/lib/fortune";

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const popularClubs = [
  { id: "1", name: "서울 등산 모임", category: "등산", members: 45, coverEmoji: "⛰️", views: 320 },
  { id: "2", name: "골프 친구들", category: "골프", members: 32, coverEmoji: "⛳", views: 280 },
  { id: "3", name: "독서 클럽", category: "독서", members: 28, coverEmoji: "📚", views: 195 },
];

const recommendedInfos = [
  { id: "1", title: "봄철 건강 관리 가이드", category: "건강", views: 520 },
  { id: "2", title: "2026 정부 지원금 총정리", category: "정부지원", views: 1200 },
  { id: "3", title: "시니어를 위한 스마트폰 활용법", category: "정보", views: 890 },
];

const popularPosts = [
  { id: "1", title: "봄 등산 코스 추천합니다", author: "산사랑", likes: 24, comments: 8 },
  { id: "2", title: "퇴직 후 재테크 팁 공유", author: "현명한투자", likes: 18, comments: 12 },
  { id: "3", title: "제주도 3박4일 여행 후기", author: "여행가", likes: 31, comments: 15 },
];

const fortuneScoreStars = [1, 2, 3, 4, 5] as const;

const personalRecommendations = [
  {
    id: "r1",
    name: "서울 등산 모임",
    category: "등산",
    reason: "관심 취미와 일치",
    members: 45,
    icon: Mountains,
  },
  {
    id: "r2",
    name: "골프 친구들",
    category: "골프",
    reason: "같은 지역 · 인기 모임",
    members: 32,
    icon: Sparkle,
  },
  {
    id: "r3",
    name: "서울 독서 모임",
    category: "독서",
    reason: "비슷한 취미 회원들이 활동 중",
    members: 28,
    icon: PaintBrush,
  },
];

export default function HomePage() {
  const today = getToday();
  const previewZodiac = ZODIAC_ANIMALS[new Date().getDay() % ZODIAC_ANIMALS.length];
  const fortune = generateFortune(today, previewZodiac);

  return (
    <div className="space-y-7 p-5 pb-6">
      {/* Welcome header */}
      <header className="flex items-start justify-between pt-3">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-1 text-coral-500">
            <Hand size={32} weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-mocha-900 tracking-tight leading-snug">
              안녕하세요!
            </h1>
            <p className="mt-1 text-lg text-mocha-700">오늘도 즐거운 하루 보내세요</p>
          </div>
        </div>
        <Link href="/search" aria-label="검색">
          <Button variant="ghost" size="icon" className="rounded-full">
            <MagnifyingGlass size={26} weight="bold" className="text-mocha-800" />
          </Button>
        </Link>
      </header>

      {/* Onboarding banner */}
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

      {/* Fortune preview */}
      <Link href="/fortune" className="block">
        <Card className="border-sage-200 bg-gradient-to-br from-sage-50 to-cream-100 transition-all hover:shadow-soft">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-soft">
              {getZodiacEmoji(fortune.zodiac)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-mocha-900">
                  {fortune.zodiac}띠 오늘의 운세
                </span>
              </div>
              <div
                role="img"
                aria-label={`${fortune.score}점 만점에 5점`}
                className="mt-1 flex gap-0.5"
              >
                {fortuneScoreStars.map((star) => (
                  <Star
                    key={star}
                    size={18}
                    weight={star <= fortune.score ? "fill" : "regular"}
                    className={
                      star <= fortune.score ? "text-[var(--color-warning)]" : "text-mocha-200"
                    }
                  />
                ))}
              </div>
              <p className="mt-1.5 text-base text-mocha-700 line-clamp-1">{fortune.general}</p>
            </div>
            <CaretRight size={24} weight="bold" className="text-mocha-500 shrink-0" />
          </CardContent>
        </Card>
      </Link>

      {/* Personalized recommendations */}
      <Section
        icon={<UserCirclePlus size={26} weight="duotone" className="text-coral-600" />}
        title="나를 위한 추천"
        href="/club"
      >
        <div className="space-y-3">
          {personalRecommendations.map((rec) => {
            const Icon = rec.icon;
            return (
              <Link key={rec.id} href={`/club/${rec.id}`} className="block">
                <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-50">
                      <Icon size={28} weight="duotone" className="text-coral-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-extrabold text-mocha-900 truncate">{rec.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="default">{rec.category}</Badge>
                        <span className="text-sm font-semibold text-coral-700">{rec.reason}</span>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-base font-semibold text-mocha-700">
                      <UsersThree size={18} weight="duotone" />
                      {rec.members}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Popular clubs (horizontal scroll) */}
      <Section
        icon={<Fire size={26} weight="duotone" className="text-[var(--color-danger)]" />}
        title="인기 모임"
        href="/club"
        hint="옆으로 넘겨보세요"
      >
        <div className="-mx-5 overflow-x-auto pb-2">
          <div className="flex gap-3 px-5">
            {popularClubs.map((club) => (
              <Link key={club.id} href={`/club/${club.id}`} className="min-w-[180px] block">
                <Card className="transition-all hover:shadow-warm h-full">
                  <CardContent className="flex h-full flex-col items-center gap-2 p-5 text-center">
                    <div className="text-5xl mb-1">{club.coverEmoji}</div>
                    <h3 className="text-lg font-extrabold text-mocha-900 leading-snug">
                      {club.name}
                    </h3>
                    <Badge variant="default">{club.category}</Badge>
                    <div className="mt-2 flex w-full items-center justify-center gap-3 border-t border-mocha-100 pt-3 text-base font-semibold text-mocha-700">
                      <span className="flex items-center gap-1">
                        <UsersThree size={16} weight="duotone" />
                        {club.members}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={16} weight="duotone" />
                        {club.views}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* Recommended info */}
      <Section
        icon={<Newspaper size={26} weight="duotone" className="text-sage-700" />}
        title="추천 정보"
        href="/info"
      >
        <div className="space-y-3">
          {recommendedInfos.map((info) => (
            <Link key={info.id} href={`/info/${info.id}`} className="block">
              <Card className="transition-all hover:border-sage-200 hover:shadow-soft">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <Badge variant="secondary" className="mb-1.5">
                      {info.category}
                    </Badge>
                    <h3 className="text-lg font-bold text-mocha-900 leading-snug">{info.title}</h3>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-base font-semibold text-mocha-700">
                    <Eye size={18} weight="duotone" />
                    {info.views}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* Community */}
      <Section
        icon={<ChatCircleDots size={26} weight="duotone" className="text-coral-600" />}
        title="커뮤니티"
        href="/community"
      >
        <div className="space-y-3">
          {popularPosts.map((post) => (
            <Link key={post.id} href={`/community/${post.id}`} className="block">
              <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-mocha-900 leading-snug">{post.title}</h3>
                  <div className="mt-3 flex items-center justify-between text-base">
                    <span className="font-semibold text-mocha-700">{post.author}</span>
                    <div className="flex items-center gap-4 text-mocha-700">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Heart size={18} weight="duotone" className="text-coral-500" />
                        {post.likes}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <ChatCircleDots size={18} weight="duotone" className="text-sage-600" />
                        {post.comments}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
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
  href: string;
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
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-base font-bold text-coral-700 hover:text-coral-800"
        >
          더보기
          <ArrowRight size={18} weight="bold" />
        </Link>
      </div>
      {hint && <p className="text-sm text-mocha-500">{hint}</p>}
      {children}
    </section>
  );
}
