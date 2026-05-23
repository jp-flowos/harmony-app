"use client";

import {
  ArrowLeft,
  ChatCircle,
  DotsThree,
  Flag,
  ShareNetwork,
  ThumbsUp,
} from "@phosphor-icons/react";
import Link from "next/link";
import { use, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

const mockPost = {
  id: "1",
  category: "free",
  title: "오늘 날씨가 정말 좋네요",
  content:
    "산책하기 딱 좋은 날입니다. 다들 밖에 나가보세요!\n\n서울 올림픽 공원 쪽으로 걸었는데, 벚꽃이 피기 시작했더라고요. 내주쯤이면 만개할 것 같습니다.\n\n혼자 가기 심심하신 분은 같이 가실 분 댓글 남겨주세요!",
  author: "봄바람",
  authorRegion: "서울 송파구",
  likeCount: 15,
  commentCount: 3,
  createdAt: "2024-03-02",
};

const mockComments: Comment[] = [
  {
    id: "1",
    author: "산사랑",
    content: "저도 오늘 나가봐야겠네요!",
    createdAt: "2024-03-02 14:30",
  },
  {
    id: "2",
    author: "건강지킴이",
    content: "올림픽공원 좋죠! 저도 자주 갑니다",
    createdAt: "2024-03-02 15:10",
  },
  {
    id: "3",
    author: "여행가",
    content: "같이 가고 싶어요~ 언제 가시나요?",
    createdAt: "2024-03-02 16:00",
  },
];

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(mockComments);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      author: "나",
      content: commentText,
      createdAt: new Date().toLocaleString("ko-KR"),
    };
    setComments([...comments, newComment]);
    setCommentText("");
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/community" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-lg font-bold text-gray-900">게시글</h1>
        <Button variant="ghost" size="sm">
          <DotsThree size={24} />
        </Button>
      </div>

      {/* Post */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {mockPost.category === "free" ? "자유" : mockPost.category}
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{mockPost.title}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{mockPost.author}</span>
            <span>·</span>
            <span>{mockPost.authorRegion}</span>
            <span>·</span>
            <span>{mockPost.createdAt}</span>
          </div>
          <p className="text-base text-gray-700 whitespace-pre-line leading-relaxed">
            {mockPost.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4 border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLiked(!liked)}
              className={liked ? "text-orange-500" : "text-gray-400"}
            >
              <ThumbsUp size={20} weight={liked ? "fill" : "regular"} className="mr-1" />
              {mockPost.likeCount + (liked ? 1 : 0)}
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ChatCircle size={20} className="mr-1" /> {comments.length}
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ShareNetwork size={20} className="mr-1" /> 공유
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 ml-auto">
              <Flag size={20} className="mr-1" /> 신고
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">댓글 {comments.length}</h3>
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{c.author}</span>
              <span className="text-xs text-gray-400">{c.createdAt}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{c.content}</p>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-20 left-0 right-0 border-t bg-white p-3">
        <div className="mx-auto flex max-w-lg gap-2">
          <Input
            placeholder="댓글을 입력하세요"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          />
          <Button onClick={handleAddComment}>작성</Button>
        </div>
      </div>
    </div>
  );
}
