"use client";

import { ArrowLeft, CalendarDots, Camera, MapPin, Star, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const meetingData = {
  title: "3월 정기 산행",
  date: "2024-03-15 (토) 오전 9:00",
  location: "북한산 우이역 1번 출구",
  description: "3월 정기모임입니다. 북한산 백운대 코스로 진행합니다. 점심은 하산 후 함께 먹어요!",
  maxParticipants: 20,
  currentCount: 12,
};

const participants = [
  { id: "u1", nickname: "산사랑", status: "joined" },
  { id: "u2", nickname: "등산매니아", status: "joined" },
  { id: "u3", nickname: "건강한인생", status: "joined" },
];

interface Review {
  id: string;
  author: string;
  rating: number;
  content: string;
  date: string;
  images: string[];
}

const sampleReviews: Review[] = [
  {
    id: "r1",
    author: "산사랑",
    rating: 5,
    content: "정말 좋은 산행이었습니다! 다음에도 꼭 참여하고 싶어요.",
    date: "2024-03-16",
    images: [],
  },
  {
    id: "r2",
    author: "건강한인생",
    rating: 4,
    content: "코스가 적당히 힘들고 좋았어요. 점심도 맛있었습니다.",
    date: "2024-03-16",
    images: [],
  },
];

function StarRating({
  rating,
  onRate,
  interactive = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={interactive ? 28 : 18}
            weight={i <= rating ? "fill" : "regular"}
            className={i <= rating ? "text-yellow-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  onSubmit,
}: {
  onSubmit: (review: { rating: number; content: string }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (rating === 0 || !content.trim()) return;
    onSubmit({ rating, content: content.trim() });
    setRating(0);
    setContent("");
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h4 className="text-base font-semibold text-gray-900">후기 작성</h4>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">별점</span>
          <StarRating rating={rating} onRate={setRating} interactive />
        </div>
        <Textarea
          placeholder="모임은 어떠셨나요? 후기를 남겨주세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm">
            <Camera size={16} className="mr-1" />
            사진 첨부
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={rating === 0 || !content.trim()}>
            후기 등록
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MeetingDetailPage() {
  const params = useParams();
  const [joined, setJoined] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(sampleReviews);

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const handleReviewSubmit = (review: { rating: number; content: string }) => {
    setReviews([
      {
        id: crypto.randomUUID(),
        author: "활기찬시니어",
        rating: review.rating,
        content: review.content,
        date: new Date().toISOString().split("T")[0],
        images: [],
      },
      ...reviews,
    ]);
  };

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/club/${params.id}`}
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        클럽으로 돌아가기
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{meetingData.title}</CardTitle>
            <Badge>
              {meetingData.currentCount}/{meetingData.maxParticipants}명
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-base text-gray-700">
              <CalendarDots size={24} className="text-orange-500" />
              {meetingData.date}
            </div>
            <div className="flex items-center gap-3 text-base text-gray-700">
              <MapPin size={24} className="text-orange-500" />
              {meetingData.location}
            </div>
            <div className="flex items-center gap-3 text-base text-gray-700">
              <Users size={24} className="text-orange-500" />
              {meetingData.currentCount}명 참여 중 (최대 {meetingData.maxParticipants}명)
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-base text-gray-700">{meetingData.description}</p>
          </div>

          <Button
            className="w-full"
            size="lg"
            variant={joined ? "outline" : "default"}
            onClick={() => setJoined(!joined)}
            disabled={!joined && meetingData.currentCount >= meetingData.maxParticipants}
          >
            {joined ? "참여 취소" : "참여하기"}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants">참여자 ({participants.length})</TabsTrigger>
          <TabsTrigger value="reviews">후기 ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-3">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{p.nickname[0]}</AvatarFallback>
              </Avatar>
              <span className="text-base font-medium text-gray-900">{p.nickname}</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {/* Average rating */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-500">{avgRating.toFixed(1)}</p>
                <StarRating rating={Math.round(avgRating)} />
              </div>
              <p className="text-sm text-gray-500">{reviews.length}개 후기</p>
            </div>
          )}

          <ReviewForm onSubmit={handleReviewSubmit} />

          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">{review.author[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-base font-medium">{review.author}</span>
                  <StarRating rating={review.rating} />
                  <span className="text-sm text-gray-400 ml-auto">{review.date}</span>
                </div>
                <p className="text-base text-gray-700">{review.content}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
