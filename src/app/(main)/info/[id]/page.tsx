"use client";

import { ArrowLeft, ChatCircle, Eye, Share, ThumbsUp, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { use, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
}

const articleData = {
  id: "i1",
  category: "건강",
  title: "60대 이후 꼭 알아야 할 건강검진 항목",
  content: `나이가 들수록 정기적인 건강검진이 중요합니다.

## 필수 검진 항목

### 1. 암 검진
- 위암: 2년마다 위내시경
- 대장암: 5년마다 대장내시경
- 폐암: 고위험군 매년 저선량 CT

### 2. 심혈관 검사
- 혈압, 혈당, 콜레스테롤 정기 체크
- 심전도 및 심장초음파

### 3. 골밀도 검사
- 65세 이상 여성, 70세 이상 남성 필수
- 골다공증 조기 발견이 중요

### 4. 인지기능 검사
- 치매 조기 선별 검사
- 66세, 70세, 74세에 무료 검진 가능

## 정부 지원 무료 검진

국가 건강검진은 2년마다 무료로 받을 수 있습니다. 가까운 건강검진기관에서 예약하세요.`,
  author: "건강지킴이",
  views: 1240,
  likes: 89,
  tags: ["건강검진", "시니어건강", "예방의학"],
  date: "2024-03-01",
  relatedClubs: [
    { id: "c1", name: "건강한 시니어 모임", emoji: "💪" },
    { id: "c2", name: "서울 걷기 클럽", emoji: "🚶" },
  ],
};

const sampleComments: Comment[] = [
  {
    id: "c1",
    author: "건강한인생",
    content: "유익한 정보 감사합니다! 올해 꼭 검진 받으려고요.",
    date: "2024-03-02",
  },
  {
    id: "c2",
    author: "행복한시니어",
    content: "국가 건강검진 예약 방법도 알려주시면 좋겠어요.",
    date: "2024-03-01",
  },
];

interface InfoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InfoDetailPage({ params }: InfoDetailPageProps) {
  use(params);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>(sampleComments);
  const [newComment, setNewComment] = useState("");

  const handleComment = () => {
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      {
        id: crypto.randomUUID(),
        author: "활기찬시니어",
        content: newComment.trim(),
        date: new Date().toISOString().split("T")[0],
      },
    ]);
    setNewComment("");
  };

  return (
    <div className="space-y-4 p-4">
      <Link
        href="/info"
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        목록으로
      </Link>

      {/* Article */}
      <article>
        <Badge className="mb-2">{articleData.category}</Badge>
        <h1 className="text-2xl font-bold text-gray-900">{articleData.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
          <span>{articleData.author}</span>
          <span>{articleData.date}</span>
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {articleData.views}
          </span>
        </div>

        <div className="mt-6 prose prose-gray max-w-none">
          {articleData.content.split("\n").map((line, i) => {
            const key = `line-${i}`;
            if (line.startsWith("### "))
              return (
                <h3 key={key} className="text-lg font-semibold text-gray-900 mt-4">
                  {line.replace("### ", "")}
                </h3>
              );
            if (line.startsWith("## "))
              return (
                <h2 key={key} className="text-xl font-bold text-gray-900 mt-6">
                  {line.replace("## ", "")}
                </h2>
              );
            if (line.startsWith("- "))
              return (
                <p key={key} className="text-base text-gray-700 ml-4">
                  • {line.replace("- ", "")}
                </p>
              );
            if (line.trim() === "") return <br key={key} />;
            return (
              <p key={key} className="text-base text-gray-700">
                {line}
              </p>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {articleData.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <Button
            variant={liked ? "default" : "outline"}
            size="sm"
            onClick={() => setLiked(!liked)}
          >
            <ThumbsUp size={16} weight={liked ? "fill" : "regular"} className="mr-1" />
            {liked ? articleData.likes + 1 : articleData.likes}
          </Button>
          <Button variant="outline" size="sm">
            <Share size={16} className="mr-1" />
            공유
          </Button>
        </div>
      </article>

      {/* Related clubs */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <UsersThree size={20} className="text-orange-500" />
            관련 모임
          </h3>
          <div className="space-y-2">
            {articleData.relatedClubs.map((club) => (
              <Link
                key={club.id}
                href={`/club/${club.id}`}
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50"
              >
                <span className="text-2xl">{club.emoji}</span>
                <span className="text-base font-medium text-gray-900">{club.name}</span>
                <Button variant="outline" size="sm" className="ml-auto">
                  가입하기
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ChatCircle size={20} />
            댓글 ({comments.length})
          </h3>

          <div className="flex gap-2">
            <Textarea
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button size="sm" onClick={handleComment} disabled={!newComment.trim()}>
              등록
            </Button>
          </div>

          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{comment.author[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                    <span className="text-xs text-gray-400">{comment.date}</span>
                  </div>
                  <p className="text-base text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
