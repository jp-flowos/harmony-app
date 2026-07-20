import {
  CalendarDots,
  CaretRight,
  Crown,
  Gear,
  Heart,
  PencilSimple,
  ShieldCheck,
  SignOut,
  Star,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth-session";
import { NotificationSettings } from "./NotificationSettings";

// Mock data — to be replaced when respective domains are wired (Phase 3+):
//   myClubs   ← join h_club_members on user_id
//   myMeetings← join h_meeting_participants on user_id
//   myReviews ← h_meeting_reviews where user_id = me
//   myFavorites ← (no favorites table yet — needs schema)
//   badges    ← h_verification_badges where user_id = me
const myClubs = [
  { id: "1", name: "서울 등산 모임", emoji: "⛰️", members: 45 },
  { id: "2", name: "골프 친구들", emoji: "⛳", members: 32 },
  { id: "3", name: "독서 클럽", emoji: "📚", members: 28 },
];
const myMeetings = [
  {
    id: "m1",
    title: "3월 정기 산행",
    clubName: "서울 등산 모임",
    date: "2026-06-15",
    status: "upcoming" as const,
  },
  {
    id: "m2",
    title: "2월 독서 모임",
    clubName: "독서 클럽",
    date: "2026-04-20",
    status: "completed" as const,
  },
];
const myReviews = [
  {
    id: "r1",
    meetingTitle: "2월 산행",
    rating: 5,
    content: "최고의 산행이었습니다!",
    date: "2026-04-18",
  },
  {
    id: "r2",
    meetingTitle: "1월 독서 모임",
    rating: 4,
    content: "유익한 시간이었어요",
    date: "2026-03-20",
  },
];
const myFavorites = [
  { id: "f1", name: "북한산 둘레길", type: "장소" },
  { id: "f2", name: "서울 등산 모임", type: "클럽" },
];
const badges = [
  { type: "실명인증", verified: true },
  { type: "활동인증", verified: true },
  { type: "얼굴인증", verified: false },
  { type: "후기인증", verified: false },
];
const ratingStars = [1, 2, 3, 4, 5] as const;

// Phase 3: query counts from h_club_members, h_club_posts, h_meeting_participants, h_meeting_reviews
const STATS = [
  { key: "clubs", label: "클럽", value: 0 },
  { key: "posts", label: "게시글", value: 0 },
  { key: "meetings", label: "모임", value: 0 },
  { key: "reviews", label: "후기", value: 0 },
];

const MENU_ITEMS = [
  { label: "프로필 수정", icon: UserCircle, href: "/mypage/edit" },
  { label: "구독 관리", icon: Crown, href: "/subscribe" },
  { label: "설정", icon: Gear, href: "/mypage/settings" },
] as const;

export default async function MyPage() {
  const user = await requireUser();

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) redirect("/onboarding");

  const initial = profile.nickname.charAt(0);
  const isPremium = profile.subscriptionTier === "premium";

  return (
    <div className="space-y-5 p-5">
      <h1 className="pt-2 text-3xl font-extrabold text-mocha-900 tracking-tight">내 정보</h1>

      <Card className="overflow-hidden border-coral-100 bg-gradient-to-br from-coral-50 to-cream-100">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-white">
                <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
              </Avatar>
              <Link
                href="/mypage/edit"
                aria-label="프로필 수정"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-coral-500 text-white shadow-warm transition-all hover:bg-coral-600 active:scale-95"
              >
                <PencilSimple size={16} weight="bold" />
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-mocha-900 tracking-tight">
                  {profile.nickname}
                </h2>
                {isPremium && (
                  <Badge className="bg-coral-500 text-white">
                    <Crown size={14} weight="fill" className="mr-1" />
                    프리미엄
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-base text-mocha-700">
                {profile.region}
                {profile.bio ? ` · ${profile.bio}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.isVerified && (
                  <Badge variant="success">
                    <ShieldCheck size={16} weight="bold" className="mr-1" />
                    인증됨
                  </Badge>
                )}
                <Badge variant="cream">활동점수 {profile.activityScore ?? 0}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-white p-4 shadow-soft">
            {STATS.map((stat) => (
              <div key={stat.key} className="text-center">
                <p className="text-2xl font-extrabold text-coral-600">{stat.value}</p>
                <p className="mt-0.5 text-sm font-semibold text-mocha-700">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">인증 뱃지</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge
              key={badge.type}
              variant={badge.verified ? "success" : "outline"}
              className="text-base"
            >
              <span aria-hidden="true" className="mr-1">
                {badge.verified ? "✓" : "○"}
              </span>
              {badge.type}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <Tabs defaultValue="clubs">
            <TabsList>
              <TabsTrigger value="clubs">내 클럽</TabsTrigger>
              <TabsTrigger value="meetings">참여 모임</TabsTrigger>
              <TabsTrigger value="reviews">작성 후기</TabsTrigger>
              <TabsTrigger value="favorites">찜 목록</TabsTrigger>
            </TabsList>

            <TabsContent value="clubs" className="space-y-2">
              {myClubs.map((club) => (
                <Link key={club.id} href={`/club/${club.id}`} className="block">
                  <div className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-cream-100 active:bg-cream-200">
                    <span aria-hidden="true" className="text-3xl">
                      {club.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-mocha-900 truncate">{club.name}</p>
                      <p className="text-base text-mocha-700">멤버 {club.members}명</p>
                    </div>
                    <CaretRight size={22} weight="bold" className="text-mocha-400" />
                  </div>
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="meetings" className="space-y-2">
              {myMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center gap-3 rounded-2xl p-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      meeting.status === "upcoming" ? "bg-coral-50" : "bg-mocha-100"
                    }`}
                  >
                    <CalendarDots
                      size={26}
                      weight="duotone"
                      className={
                        meeting.status === "upcoming" ? "text-coral-600" : "text-mocha-500"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-mocha-900 truncate">{meeting.title}</p>
                    <p className="text-base text-mocha-700 truncate">
                      {meeting.clubName} · {meeting.date}
                    </p>
                  </div>
                  <Badge variant={meeting.status === "upcoming" ? "default" : "secondary"}>
                    {meeting.status === "upcoming" ? "예정" : "완료"}
                  </Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-3">
              {myReviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-mocha-100 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-bold text-mocha-900">{review.meetingTitle}</p>
                    <div role="img" aria-label={`${review.rating}점 만점에 5점`} className="flex">
                      {ratingStars.map((star) => (
                        <Star
                          key={`star-${review.id}-${star}`}
                          size={18}
                          weight={star <= review.rating ? "fill" : "regular"}
                          className={
                            star <= review.rating ? "text-[var(--color-warning)]" : "text-mocha-200"
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-base text-mocha-800 leading-relaxed">{review.content}</p>
                  <p className="mt-2 text-sm font-medium text-mocha-500">{review.date}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-2">
              {myFavorites.map((fav) => (
                <div key={fav.id} className="flex items-center gap-3 rounded-2xl p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral-50">
                    <Heart size={24} weight="fill" className="text-coral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-mocha-900 truncate">{fav.name}</p>
                    <p className="text-base text-mocha-700">{fav.type}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <NotificationSettings />

      <Card>
        <CardContent className="p-0">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex w-full items-center gap-4 border-b border-mocha-100 px-6 py-5 text-lg font-semibold text-mocha-900 transition-colors hover:bg-cream-100 active:bg-cream-200"
              >
                <Icon size={26} weight="duotone" className="text-coral-600" />
                <span className="flex-1 text-left">{item.label}</span>
                <CaretRight size={22} weight="bold" className="text-mocha-400" />
              </Link>
            );
          })}
          {/* Link가 아니라 form POST — Link면 프리페치만으로 세션이 지워진다 */}
          <form action="/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-4 px-6 py-5 text-lg font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-bg)]"
            >
              <SignOut size={26} weight="bold" />
              <span>로그아웃</span>
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
