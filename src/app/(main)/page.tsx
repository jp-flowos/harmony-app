import {
  Eye,
  Fire,
  MagnifyingGlass,
  Newspaper,
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

// Popular clubs (mock — would query by view count)
const popularClubs = [
  { id: "1", name: "서울 등산 모임", category: "등산", members: 45, coverEmoji: "⛰️", views: 320 },
  { id: "2", name: "골프 친구들", category: "골프", members: 32, coverEmoji: "⛳", views: 280 },
  { id: "3", name: "독서 클럽", category: "독서", members: 28, coverEmoji: "📚", views: 195 },
];

const recommendedInfos = [
  { id: "1", title: "봄철 건강 관리 가이드", category: "건강", views: 520 },
  { id: "2", title: "2024 정부 지원금 총정리", category: "정부지원", views: 1200 },
  { id: "3", title: "시니어를 위한 스마트폰 활용법", category: "정보", views: 890 },
];

const popularPosts = [
  { id: "1", title: "봄 등산 코스 추천합니다", author: "산사랑", likes: 24, comments: 8 },
  { id: "2", title: "퇴직 후 재테크 팁 공유", author: "현명한투자", likes: 18, comments: 12 },
  { id: "3", title: "제주도 3박4일 여행 후기", author: "여행가", likes: 31, comments: 15 },
];

const fortuneScoreStars = [1, 2, 3, 4, 5] as const;

// 개인화 추천 (mock — would come from /api/recommendations)
const personalRecommendations = [
  { id: "r1", name: "서울 등산 모임", category: "등산", reason: "관심 취미와 일치", members: 45 },
  { id: "r2", name: "골프 친구들", category: "골프", reason: "같은 지역 · 인기 모임", members: 32 },
  {
    id: "r3",
    name: "서울 독서 모임",
    category: "독서",
    reason: "비슷한 취미 회원들이 활동 중",
    members: 28,
  },
];

export default function HomePage() {
  const today = getToday();
  // Show a random zodiac fortune preview on home
  const previewZodiac = ZODIAC_ANIMALS[new Date().getDay() % ZODIAC_ANIMALS.length];
  const fortune = generateFortune(today, previewZodiac);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">안녕하세요! 👋</h1>
          <p className="mt-1 text-base text-gray-500">오늘도 즐거운 하루 보내세요</p>
        </div>
        <Link href="/search">
          <Button variant="ghost" size="icon" className="rounded-full">
            <MagnifyingGlass size={24} className="text-gray-600" />
          </Button>
        </Link>
      </div>

      {/* Onboarding Banner for new users */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <Sparkle size={32} weight="fill" className="text-orange-400" />
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900">
                하모니에 오신 것을 환영합니다!
              </p>
              <p className="mt-1 text-sm text-gray-600">프로필을 완성하고 관심 클럽을 찾아보세요</p>
            </div>
            <Link href="/mypage/edit">
              <Button size="sm" variant="outline">
                시작하기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Fortune Preview — Real Data */}
      <Link href="/fortune">
        <Card className="bg-gradient-to-r from-purple-50 to-orange-50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                {getZodiacEmoji(fortune.zodiac)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-900">
                    {fortune.zodiac}띠 오늘의 운세
                  </span>
                  <div className="flex gap-0.5">
                    {fortuneScoreStars.map((star) => (
                      <Star
                        key={star}
                        size={14}
                        weight={star <= fortune.score ? "fill" : "regular"}
                        className={star <= fortune.score ? "text-yellow-400" : "text-gray-300"}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-1">{fortune.general}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Personalized Recommendations */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserCirclePlus size={24} className="text-orange-500" />
            나를 위한 추천
          </h2>
          <Link href="/club" className="text-base text-orange-500 font-medium">
            더보기
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {personalRecommendations.map((rec) => (
            <Link key={rec.id} href={`/club/${rec.id}`}>
              <Card className="hover:shadow-md transition-shadow mb-2 border-orange-100">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-xl">
                    {rec.category === "등산" ? "⛰️" : rec.category === "골프" ? "⛳" : "📚"}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">{rec.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {rec.category}
                      </Badge>
                      <span className="text-xs text-orange-500">{rec.reason}</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-0.5 text-xs text-gray-400">
                    <UsersThree size={12} /> {rec.members}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Clubs (by views) */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Fire size={24} className="text-red-500" />
            인기 모임
          </h2>
          <Link href="/club" className="text-base text-orange-500 font-medium">
            전체보기
          </Link>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {popularClubs.map((club) => (
            <Link key={club.id} href={`/club/${club.id}`} className="min-w-[160px]">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-4xl mb-2">{club.coverEmoji}</div>
                  <h3 className="text-base font-semibold text-gray-900 truncate">{club.name}</h3>
                  <Badge variant="secondary" className="mt-2">
                    {club.category}
                  </Badge>
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <UsersThree size={12} /> {club.members}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Eye size={12} /> {club.views}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended Info Content */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper size={24} className="text-blue-500" />
            추천 정보
          </h2>
          <Link href="/info" className="text-base text-orange-500 font-medium">
            전체보기
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {recommendedInfos.map((info) => (
            <Link key={info.id} href={`/info/${info.id}`}>
              <Card className="hover:shadow-sm transition-shadow mb-2">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="mb-1">
                      {info.category}
                    </Badge>
                    <h3 className="text-base font-medium text-gray-900">{info.title}</h3>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Eye size={14} /> {info.views}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Community Posts */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">💬 커뮤니티</h2>
          <Link href="/community" className="text-base text-orange-500 font-medium">
            전체보기
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {popularPosts.map((post) => (
            <Link key={post.id} href={`/community/${post.id}`}>
              <Card className="hover:shadow-md transition-shadow mb-2">
                <CardContent className="p-4">
                  <h3 className="text-base font-semibold text-gray-900">{post.title}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-400">{post.author}</span>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
