"use client";

import { ChatCircle, Clock, Fire, PencilSimple, ThumbsUp } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CommunityPost {
  id: string;
  category: string;
  title: string;
  content: string;
  author: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  region: string;
}

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "free", label: "자유" },
  { key: "health", label: "건강" },
  { key: "travel", label: "여행" },
  { key: "hobby", label: "취미" },
  { key: "daily", label: "일상" },
  { key: "review", label: "정보공유" },
];

const CATEGORY_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  health: "bg-green-100 text-green-700",
  travel: "bg-blue-100 text-blue-700",
  hobby: "bg-purple-100 text-purple-700",
  daily: "bg-yellow-100 text-yellow-700",
  review: "bg-orange-100 text-orange-700",
};

const mockPosts: CommunityPost[] = [
  {
    id: "1",
    category: "free",
    title: "오늘 날씨가 정말 좋네요",
    content: "산책하기 딱 좋은 날입니다. 다들 밖에 나가보세요!",
    author: "봄바람",
    likeCount: 15,
    commentCount: 6,
    createdAt: "2024-03-02",
    region: "서울",
  },
  {
    id: "2",
    category: "health",
    title: "무릎 관절에 좋은 운동 추천",
    content: "물속 걷기가 가장 효과적이라고 합니다.",
    author: "건강지킴이",
    likeCount: 32,
    commentCount: 14,
    createdAt: "2024-03-02",
    region: "부산",
  },
  {
    id: "3",
    category: "travel",
    title: "강릉 당일치기 코스 공유",
    content: "주문진 → 경포대 → 초당순두부 코스 강추합니다",
    author: "여행가",
    likeCount: 28,
    commentCount: 9,
    createdAt: "2024-03-01",
    region: "강원",
  },
  {
    id: "4",
    category: "hobby",
    title: "수채화 클래스 시작했어요",
    content: "동네 문화센터에서 수채화 배우기 시작했는데 너무 재밌어요",
    author: "그림쟁이",
    likeCount: 20,
    commentCount: 7,
    createdAt: "2024-03-01",
    region: "서울",
  },
  {
    id: "5",
    category: "review",
    title: "국민연금 수령 팁 정리",
    content: "수령 시기에 따른 금액 차이를 정리해봤습니다",
    author: "현명한투자",
    likeCount: 45,
    commentCount: 22,
    createdAt: "2024-02-29",
    region: "경기",
  },
  {
    id: "6",
    category: "daily",
    title: "손주와 함께한 주말",
    content: "오랜만에 손주가 놀러와서 행복한 주말이었어요",
    author: "행복할머니",
    likeCount: 38,
    commentCount: 11,
    createdAt: "2024-02-29",
    region: "대전",
  },
];

function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");

  const filtered =
    selectedCategory === "all"
      ? mockPosts
      : mockPosts.filter((p) => p.category === selectedCategory);

  const sorted = [...filtered].sort((a, b) =>
    sortBy === "popular" ? b.likeCount - a.likeCount : b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">💬 커뮤니티</h1>
        <Link href="/community/write">
          <Button size="sm">
            <PencilSimple size={16} className="mr-1" /> 글쓰기
          </Button>
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={selectedCategory === cat.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.key)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortBy("latest")}
          className={sortBy === "latest" ? "text-orange-500" : "text-gray-400"}
        >
          <Clock size={16} className="mr-1" /> 최신순
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortBy("popular")}
          className={sortBy === "popular" ? "text-orange-500" : "text-gray-400"}
        >
          <Fire size={16} className="mr-1" /> 인기순
        </Button>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {sorted.map((post) => (
          <Link key={post.id} href={`/community/${post.id}`}>
            <Card className="hover:shadow-md transition-shadow mb-3">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={CATEGORY_COLORS[post.category] ?? ""}>
                    {getCategoryLabel(post.category)}
                  </Badge>
                  <span className="text-xs text-gray-400">{post.region}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">{post.title}</h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{post.content}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {post.author} · {post.createdAt}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={14} /> {post.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ChatCircle size={14} /> {post.commentCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
