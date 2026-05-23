"use client";

import {
  Bell,
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
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const profileData = {
  nickname: "활기찬시니어",
  region: "서울",
  bio: "등산과 독서를 좋아합니다",
  activityScore: 85,
  clubs: 3,
  posts: 12,
  meetings: 8,
  reviews: 5,
  isPremium: false,
};

const badges = [
  { type: "실명인증", verified: true },
  { type: "활동인증", verified: true },
  { type: "얼굴인증", verified: false },
  { type: "후기인증", verified: false },
];

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
    date: "2024-03-15",
    status: "upcoming" as const,
  },
  {
    id: "m2",
    title: "2월 독서 모임",
    clubName: "독서 클럽",
    date: "2024-02-20",
    status: "completed" as const,
  },
];

const myReviews = [
  {
    id: "r1",
    meetingTitle: "2월 산행",
    rating: 5,
    content: "최고의 산행이었습니다!",
    date: "2024-02-18",
  },
  {
    id: "r2",
    meetingTitle: "1월 독서 모임",
    rating: 4,
    content: "유익한 시간이었어요",
    date: "2024-01-20",
  },
];

const myFavorites = [
  { id: "f1", name: "북한산 둘레길", type: "장소" },
  { id: "f2", name: "서울 등산 모임", type: "클럽" },
];

const ratingStars = [1, 2, 3, 4, 5] as const;

export default function MyPage() {
  const [notifications, setNotifications] = useState({
    chat: true,
    meeting: true,
    club: false,
    marketing: false,
  });

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">{profileData.nickname[0]}</AvatarFallback>
              </Avatar>
              <Link
                href="/mypage/edit"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md"
              >
                <PencilSimple size={14} />
              </Link>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{profileData.nickname}</h2>
                {profileData.isPremium && (
                  <Badge className="bg-orange-500 text-white">
                    <Crown size={12} weight="fill" className="mr-1" />
                    프리미엄
                  </Badge>
                )}
              </div>
              <p className="text-base text-gray-500">
                {profileData.region} · {profileData.bio}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge variant="success">
                  <ShieldCheck size={14} className="mr-1" /> 인증됨
                </Badge>
                <Badge variant="secondary">활동점수 {profileData.activityScore}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3 rounded-xl bg-gray-50 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{profileData.clubs}</p>
              <p className="text-xs text-gray-500">클럽</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{profileData.posts}</p>
              <p className="text-xs text-gray-500">게시글</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{profileData.meetings}</p>
              <p className="text-xs text-gray-500">모임</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{profileData.reviews}</p>
              <p className="text-xs text-gray-500">후기</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">인증 뱃지</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge.type} variant={badge.verified ? "success" : "outline"}>
              {badge.verified ? "✓" : "○"} {badge.type}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Activity Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="clubs">
            <TabsList>
              <TabsTrigger value="clubs">내 클럽</TabsTrigger>
              <TabsTrigger value="meetings">참여 모임</TabsTrigger>
              <TabsTrigger value="reviews">작성 후기</TabsTrigger>
              <TabsTrigger value="favorites">찜 목록</TabsTrigger>
            </TabsList>

            <TabsContent value="clubs" className="space-y-2 mt-3">
              {myClubs.map((club) => (
                <Link key={club.id} href={`/club/${club.id}`}>
                  <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50">
                    <span className="text-2xl">{club.emoji}</span>
                    <div className="flex-1">
                      <p className="text-base font-medium text-gray-900">{club.name}</p>
                      <p className="text-sm text-gray-400">멤버 {club.members}명</p>
                    </div>
                    <CaretRight size={20} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="meetings" className="space-y-2 mt-3">
              {myMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center gap-3 rounded-xl p-3">
                  <CalendarDots
                    size={24}
                    className={meeting.status === "upcoming" ? "text-orange-500" : "text-gray-400"}
                  />
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-900">{meeting.title}</p>
                    <p className="text-sm text-gray-400">
                      {meeting.clubName} · {meeting.date}
                    </p>
                  </div>
                  <Badge variant={meeting.status === "upcoming" ? "default" : "secondary"}>
                    {meeting.status === "upcoming" ? "예정" : "완료"}
                  </Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-2 mt-3">
              {myReviews.map((review) => (
                <div key={review.id} className="rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-900">{review.meetingTitle}</p>
                    <div className="flex">
                      {ratingStars.slice(0, review.rating).map((star) => (
                        <Star
                          key={`star-${review.id}-${star}`}
                          size={14}
                          weight="fill"
                          className="text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{review.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{review.date}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-2 mt-3">
              {myFavorites.map((fav) => (
                <div key={fav.id} className="flex items-center gap-3 rounded-xl p-3">
                  <Heart size={20} className="text-red-400" weight="fill" />
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-900">{fav.name}</p>
                    <p className="text-sm text-gray-400">{fav.type}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell size={20} /> 알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "chat" as const, label: "채팅 알림", desc: "새 메시지 알림" },
            { key: "meeting" as const, label: "모임 알림", desc: "모임 일정 리마인더" },
            { key: "club" as const, label: "클럽 알림", desc: "클럽 새 글/공지" },
            { key: "marketing" as const, label: "마케팅 알림", desc: "이벤트 및 혜택 안내" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <Label className="text-base">{item.label}</Label>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
              <Switch
                checked={notifications[item.key]}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, [item.key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Menu */}
      <Card>
        <CardContent className="p-0">
          {(
            [
              { label: "프로필 수정", icon: UserCircle, href: "/mypage/edit" },
              { label: "구독 관리", icon: Crown, href: "/subscribe" },
              { label: "설정", icon: Gear, href: "/mypage/settings" },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-base text-gray-700 hover:bg-gray-50 last:border-0"
              >
                <Icon size={24} className="text-gray-400" />
                <span className="flex-1 text-left">{item.label}</span>
                <CaretRight size={20} className="text-gray-300" />
              </Link>
            );
          })}
          <button
            type="button"
            className="flex w-full items-center gap-3 px-5 py-4 text-base text-red-500 hover:bg-red-50"
          >
            <SignOut size={24} />
            <span>로그아웃</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
