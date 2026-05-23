"use client";

import {
  CalendarDots,
  ChatCircle,
  Heart,
  MapPin,
  UserMinus,
  UserPlus,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { use, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

// Mock user profiles
const mockProfiles: Record<
  string,
  {
    id: string;
    nickname: string;
    region: string;
    bio: string;
    hobbies: string[];
    clubCount: number;
    reviewCount: number;
    isVerified: boolean;
    joinedDate: string;
    activities: Array<{ id: string; type: string; title: string; date: string }>;
  }
> = {
  user1: {
    id: "user1",
    nickname: "산사랑",
    region: "서울 강남구",
    bio: "등산과 골프를 좋아하는 60대입니다. 함께 활동할 친구를 찾아요!",
    hobbies: ["등산", "골프", "독서"],
    clubCount: 3,
    reviewCount: 12,
    isVerified: true,
    joinedDate: "2024-01-15",
    activities: [
      { id: "a1", type: "모임 참여", title: "북한산 봄맞이 등산", date: "2024-03-01" },
      { id: "a2", type: "후기 작성", title: "서울 등산 모임 후기", date: "2024-02-28" },
      { id: "a3", type: "클럽 가입", title: "골프 친구들", date: "2024-02-20" },
    ],
  },
  user2: {
    id: "user2",
    nickname: "여행가",
    region: "부산 해운대구",
    bio: "퇴직 후 여행과 사진에 빠졌습니다. 전국 방방곡곡 함께 다녀요.",
    hobbies: ["여행", "사진", "요리"],
    clubCount: 5,
    reviewCount: 24,
    isVerified: true,
    joinedDate: "2024-02-01",
    activities: [
      { id: "a1", type: "후기 작성", title: "제주도 3박4일 여행 후기", date: "2024-03-02" },
      { id: "a2", type: "모임 참여", title: "부산 사진 동호회", date: "2024-02-25" },
    ],
  },
};

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [isFollowing, setIsFollowing] = useState(false);

  const profile = mockProfiles[id];

  if (!profile) {
    return (
      <div className="p-4">
        <EmptyState
          icon="users"
          title="사용자를 찾을 수 없습니다"
          description="존재하지 않는 프로필입니다"
          action={
            <Link href="/">
              <Button variant="outline">홈으로</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const handleFollowToggle = () => {
    setIsFollowing((prev) => !prev);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-orange-100 text-orange-600">
                {profile.nickname[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{profile.nickname}</h1>
                {profile.isVerified && <Badge className="bg-blue-100 text-blue-700">인증됨</Badge>}
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin size={14} />
                {profile.region}
              </div>
              <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{profile.clubCount}</p>
              <p className="text-xs text-gray-500">클럽</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{profile.reviewCount}</p>
              <p className="text-xs text-gray-500">후기</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{profile.activities.length}</p>
              <p className="text-xs text-gray-500">활동</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleFollowToggle}
              variant={isFollowing ? "outline" : "default"}
              className="flex-1"
            >
              {isFollowing ? (
                <>
                  <UserMinus size={16} className="mr-1" />
                  팔로잉
                </>
              ) : (
                <>
                  <UserPlus size={16} className="mr-1" />
                  팔로우
                </>
              )}
            </Button>
            <Link href="/chat" className="flex-1">
              <Button variant="outline" className="w-full">
                <ChatCircle size={16} className="mr-1" />
                메시지
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Hobbies */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">관심 취미</h2>
        <div className="flex flex-wrap gap-2">
          {profile.hobbies.map((hobby) => (
            <Badge key={hobby} variant="secondary" className="px-3 py-1">
              {hobby}
            </Badge>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">최근 활동</h2>
        <div className="space-y-2">
          {profile.activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  {activity.type === "모임 참여" && (
                    <UsersThree size={18} className="text-blue-500" />
                  )}
                  {activity.type === "후기 작성" && <Heart size={18} className="text-red-500" />}
                  {activity.type === "클럽 가입" && (
                    <UsersThree size={18} className="text-orange-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <CalendarDots size={10} /> {activity.date}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Joined Date */}
        <p className="mt-4 text-center text-xs text-gray-400">{profile.joinedDate} 가입</p>
      </section>
    </div>
  );
}
