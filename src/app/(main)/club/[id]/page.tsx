"use client";

import { Bell, CalendarDots, ChatCircle, ImageSquare, MapPin, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const clubData = {
  name: "서울 등산 모임",
  category: "등산",
  region: "서울",
  members: 45,
  description: "매주 토요일 서울 근교 산행을 함께 하는 모임입니다. 초보자도 환영합니다!",
  emoji: "⛰️",
};

const notices = [
  { id: "1", content: "3월 정기모임: 3/15(토) 북한산 코스", date: "2024-03-01" },
  { id: "2", content: "신입 회원 환영합니다!", date: "2024-02-28" },
];

const posts = [
  {
    id: "1",
    author: "산사랑",
    content: "지난주 관악산 후기입니다 🏔️",
    likes: 12,
    comments: 3,
    date: "2024-03-02",
  },
  {
    id: "2",
    author: "등산매니아",
    content: "등산화 추천 부탁드려요",
    likes: 5,
    comments: 8,
    date: "2024-03-01",
  },
];

const meetings = [
  {
    id: "m1",
    title: "3월 정기 산행",
    date: "2024-03-15",
    location: "북한산 우이역",
    current: 12,
    max: 20,
  },
  { id: "m2", title: "4월 봄 산행", date: "2024-04-12", location: "도봉산", current: 5, max: 20 },
];

const members = [
  { id: "u1", nickname: "산사랑", role: "owner" as const },
  { id: "u2", nickname: "등산매니아", role: "admin" as const },
  { id: "u3", nickname: "건강한인생", role: "member" as const },
  { id: "u4", nickname: "행복한시니어", role: "member" as const },
];

const photoSlots = ["photo-1", "photo-2", "photo-3", "photo-4", "photo-5", "photo-6"] as const;

const roleLabels: Record<string, string> = { owner: "모임장", admin: "운영진", member: "멤버" };

export default function ClubDetailPage() {
  const params = useParams();
  const [joined, setJoined] = useState(false);

  return (
    <div className="space-y-4">
      {/* Club Header */}
      <div className="bg-gradient-to-b from-orange-100 to-white p-6 text-center">
        <div className="text-5xl mb-3">{clubData.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900">{clubData.name}</h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Badge>{clubData.category}</Badge>
          <Badge variant="secondary">{clubData.region}</Badge>
          <span className="text-sm text-gray-400">멤버 {clubData.members}명</span>
        </div>
        <p className="mt-3 text-base text-gray-600">{clubData.description}</p>
        <Button
          className="mt-4 w-full max-w-xs"
          size="lg"
          variant={joined ? "outline" : "default"}
          onClick={() => setJoined(!joined)}
        >
          {joined ? "가입됨 ✓" : "클럽 가입하기"}
        </Button>
      </div>

      {/* 지도에서 보기 — Phase 2 cross-link */}
      <div className="px-4">
        <Link href="/map" className="block">
          <Card className="transition-all hover:border-sage-200 hover:shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-50">
                <MapPin size={24} weight="duotone" className="text-sage-700" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-mocha-900">지도에서 보기</p>
                <p className="text-base text-mocha-700">모임 장소와 주변 정보를 확인해보세요</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="notice">
          <TabsList>
            <TabsTrigger value="notice">
              <Bell size={18} className="mr-1" /> 공지
            </TabsTrigger>
            <TabsTrigger value="board">게시판</TabsTrigger>
            <TabsTrigger value="meeting">
              <CalendarDots size={18} className="mr-1" /> 일정
            </TabsTrigger>
            <TabsTrigger value="photo">
              <ImageSquare size={18} className="mr-1" /> 사진
            </TabsTrigger>
            <TabsTrigger value="chat">
              <ChatCircle size={18} className="mr-1" /> 채팅
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users size={18} className="mr-1" /> 멤버
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notice" className="space-y-3">
            {notices.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <p className="text-base font-medium text-gray-900">{n.content}</p>
                  <p className="mt-1 text-sm text-gray-400">{n.date}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="board" className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">{post.author[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-base font-medium">{post.author}</span>
                    <span className="text-sm text-gray-400">{post.date}</span>
                  </div>
                  <p className="text-base text-gray-700">{post.content}</p>
                  <div className="mt-2 flex gap-3 text-sm text-gray-400">
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="meeting" className="space-y-3">
            {meetings.map((m) => (
              <Link key={m.id} href={`/club/${params.id}/meeting/${m.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{m.title}</h3>
                    <p className="mt-1 text-base text-gray-500">📅 {m.date}</p>
                    <p className="text-base text-gray-500">📍 {m.location}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        {m.current}/{m.max}명 참여
                      </span>
                      <Button size="sm">참여하기</Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="photo">
            <div className="grid grid-cols-3 gap-2">
              {photoSlots.map((photoId) => (
                <div
                  key={photoId}
                  className="aspect-square rounded-xl bg-gray-200 flex items-center justify-center text-2xl"
                >
                  📷
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <div className="py-8 text-center">
              <ChatCircle size={48} className="mx-auto text-gray-300" />
              <p className="mt-3 text-base text-gray-400">클럽 채팅방</p>
              <Button className="mt-3" onClick={() => {}}>
                채팅 참여하기
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
                <Avatar>
                  <AvatarFallback>{m.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900">{m.nickname}</span>
                </div>
                <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                  {roleLabels[m.role]}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
