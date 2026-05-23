"use client";

import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sampleClubs = [
  {
    id: "1",
    name: "서울 등산 모임",
    category: "등산",
    region: "서울",
    members: 45,
    description: "매주 토요일 서울 근교 산행",
    emoji: "⛰️",
  },
  {
    id: "2",
    name: "골프 친구들",
    category: "골프",
    region: "경기",
    members: 32,
    description: "월 2회 정기 라운딩",
    emoji: "⛳",
  },
  {
    id: "3",
    name: "독서 클럽",
    category: "독서",
    region: "서울",
    members: 28,
    description: "매월 1권 완독 후 토론",
    emoji: "📚",
  },
  {
    id: "4",
    name: "요리 동호회",
    category: "요리",
    region: "부산",
    members: 19,
    description: "주 1회 요리 실습",
    emoji: "🍳",
  },
  {
    id: "5",
    name: "사진 여행",
    category: "사진",
    region: "전국",
    members: 56,
    description: "월 1회 출사 모임",
    emoji: "📷",
  },
];

function ClubCard({ club }: { club: (typeof sampleClubs)[number] }) {
  return (
    <Link href={`/club/${club.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
            {club.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{club.name}</h3>
            <p className="text-base text-gray-500 truncate">{club.description}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">{club.category}</Badge>
              <span className="text-sm text-gray-400">{club.region}</span>
              <span className="text-sm text-gray-400">· {club.members}명</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ClubListPage() {
  const [search, setSearch] = useState("");

  const filtered = sampleClubs.filter(
    (c) => c.name.includes(search) || c.category.includes(search)
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">클럽</h1>
        <Link href="/club/create">
          <Button size="sm">
            <Plus size={20} />
            만들기
          </Button>
        </Link>
      </div>

      <div className="relative">
        <MagnifyingGlass
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          placeholder="클럽 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="nearby">근처</TabsTrigger>
          <TabsTrigger value="hobby">취미별</TabsTrigger>
          <TabsTrigger value="popular">인기</TabsTrigger>
          <TabsTrigger value="mine">내 클럽</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {filtered.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </TabsContent>

        <TabsContent value="nearby" className="space-y-3">
          <p className="py-8 text-center text-base text-gray-400">
            위치 권한을 허용하면 근처 클럽을 보여드려요
          </p>
        </TabsContent>

        <TabsContent value="hobby" className="space-y-3">
          {filtered.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </TabsContent>

        <TabsContent value="popular" className="space-y-3">
          {[...filtered]
            .sort((a, b) => b.members - a.members)
            .map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
        </TabsContent>

        <TabsContent value="mine" className="space-y-3">
          <p className="py-8 text-center text-base text-gray-400">
            로그인 후 가입한 클럽이 표시됩니다
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
