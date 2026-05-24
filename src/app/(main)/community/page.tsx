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

// Category-tinted badges using the new palette
const CATEGORY_BADGE: Record<string, string> = {
  free: "bg-cream-100 text-mocha-800",
  health: "bg-sage-100 text-sage-700",
  travel: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  hobby: "bg-coral-100 text-coral-800",
  daily: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  review: "bg-coral-100 text-coral-800",
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
    createdAt: "2026-05-22",
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
    createdAt: "2026-05-22",
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
    createdAt: "2026-05-21",
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
    createdAt: "2026-05-21",
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
    createdAt: "2026-05-19",
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
    createdAt: "2026-05-19",
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
    <div className="space-y-5 p-5">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">커뮤니티</h1>
        <Link href="/community/write">
          <Button size="sm">
            <PencilSimple size={18} weight="bold" />
            글쓰기
          </Button>
        </Link>
      </header>

      {/* Category chips */}
      <div className="-mx-5 overflow-x-auto pb-1">
        <div className="flex gap-2 px-5">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                aria-pressed={isActive}
                className={`shrink-0 min-h-[44px] rounded-full border-2 px-4 text-base font-bold transition-all active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                  isActive
                    ? "bg-coral-500 border-coral-500 text-white shadow-warm"
                    : "bg-white border-mocha-200 text-mocha-900 hover:border-coral-400"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div className="flex gap-1 border-b-2 border-mocha-100" role="tablist" aria-label="정렬 방법">
        <button
          type="button"
          role="tab"
          aria-selected={sortBy === "latest"}
          onClick={() => setSortBy("latest")}
          className={`relative inline-flex items-center gap-1.5 px-4 py-3 text-base font-bold transition-colors after:absolute after:bottom-[-2px] after:left-3 after:right-3 after:h-1 after:rounded-full ${
            sortBy === "latest"
              ? "text-coral-700 after:bg-coral-500"
              : "text-mocha-600 after:bg-transparent hover:text-mocha-900"
          }`}
        >
          <Clock size={20} weight="duotone" /> 최신순
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sortBy === "popular"}
          onClick={() => setSortBy("popular")}
          className={`relative inline-flex items-center gap-1.5 px-4 py-3 text-base font-bold transition-colors after:absolute after:bottom-[-2px] after:left-3 after:right-3 after:h-1 after:rounded-full ${
            sortBy === "popular"
              ? "text-coral-700 after:bg-coral-500"
              : "text-mocha-600 after:bg-transparent hover:text-mocha-900"
          }`}
        >
          <Fire size={20} weight="duotone" /> 인기순
        </button>
      </div>

      {/* Posts */}
      <div className="stagger-children space-y-3">
        {sorted.map((post) => (
          <Link key={post.id} href={`/community/${post.id}`} className="block animate-fade-up">
            <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className={CATEGORY_BADGE[post.category] ?? ""}>
                    {getCategoryLabel(post.category)}
                  </Badge>
                  <span className="text-sm font-semibold text-mocha-700">{post.region}</span>
                </div>
                <h3 className="text-lg font-extrabold text-mocha-900 leading-snug tracking-tight">
                  {post.title}
                </h3>
                <p className="mt-2 text-base text-mocha-700 leading-relaxed line-clamp-2">
                  {post.content}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-mocha-100 pt-3">
                  <span className="text-base font-semibold text-mocha-700">
                    {post.author} · {post.createdAt}
                  </span>
                  <div className="flex items-center gap-4 text-base font-semibold text-mocha-700">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp size={18} weight="duotone" className="text-coral-500" />
                      {post.likeCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ChatCircle size={18} weight="duotone" className="text-sage-600" />
                      {post.commentCount}
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
