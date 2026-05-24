"use client";

import { MagnifyingGlass, Plus, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
    <Link href={`/club/${club.id}`} className="block">
      <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-3xl">
            {club.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-mocha-900 truncate tracking-tight">
              {club.name}
            </h3>
            <p className="mt-0.5 text-base text-mocha-700 truncate">{club.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge variant="default">{club.category}</Badge>
              <span className="text-sm font-semibold text-mocha-700">{club.region}</span>
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-mocha-700">
                <UsersThree size={14} weight="duotone" />
                {club.members}명
              </span>
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
    <div className="space-y-5 p-5">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">클럽</h1>
        <Link href="/club/create">
          <Button size="sm">
            <Plus size={22} weight="bold" />
            만들기
          </Button>
        </Link>
      </header>

      <Input
        placeholder="클럽 이름이나 취미로 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leadingIcon={<MagnifyingGlass size={26} weight="bold" />}
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="nearby">근처</TabsTrigger>
          <TabsTrigger value="hobby">취미별</TabsTrigger>
          <TabsTrigger value="popular">인기</TabsTrigger>
          <TabsTrigger value="mine">내 클럽</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="stagger-children space-y-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="검색 결과가 없어요"
              description="다른 단어로 검색해보세요"
            />
          ) : (
            filtered.map((club) => (
              <div key={club.id} className="animate-fade-up">
                <ClubCard club={club} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="nearby">
          <EmptyState
            icon="search"
            title="근처 클럽을 찾아드릴게요"
            description="위치 권한을 허용하면 가까운 클럽이 표시돼요"
          />
        </TabsContent>

        <TabsContent value="hobby" className="stagger-children space-y-3">
          {filtered.map((club) => (
            <div key={club.id} className="animate-fade-up">
              <ClubCard club={club} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="popular" className="stagger-children space-y-3">
          {[...filtered]
            .sort((a, b) => b.members - a.members)
            .map((club) => (
              <div key={club.id} className="animate-fade-up">
                <ClubCard club={club} />
              </div>
            ))}
        </TabsContent>

        <TabsContent value="mine">
          <EmptyState
            icon="users"
            title="아직 가입한 클럽이 없어요"
            description="관심있는 클럽을 찾아 가입해보세요"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
