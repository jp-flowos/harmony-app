"use client";

import { ChatCircle, ClockCounterClockwise, ShareNetwork, Star } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type FortuneResult,
  generateFortune,
  getZodiacEmoji,
  ZODIAC_ANIMALS,
  type ZodiacAnimal,
} from "@/lib/fortune";

const SCORE_STARS = [1, 2, 3, 4, 5] as const;

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {SCORE_STARS.map((star) => (
        <Star
          key={star}
          size={20}
          weight={star <= score ? "fill" : "regular"}
          className={star <= score ? "text-yellow-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

function FortuneCard({ fortune }: { fortune: FortuneResult }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getZodiacEmoji(fortune.zodiac)}</span>
          <div>
            <CardTitle className="text-lg">{fortune.zodiac}띠 운세</CardTitle>
            <p className="text-sm text-gray-500">{fortune.date}</p>
          </div>
          <div className="ml-auto">
            <ScoreStars score={fortune.score} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Badge className="mb-2">종합운</Badge>
          <p className="text-base text-gray-700">{fortune.general}</p>
        </div>
        <div>
          <Badge variant="secondary" className="mb-2">
            건강운
          </Badge>
          <p className="text-base text-gray-700">{fortune.health}</p>
        </div>
        <div>
          <Badge variant="secondary" className="mb-2">
            금전운
          </Badge>
          <p className="text-base text-gray-700">{fortune.money}</p>
        </div>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>
            행운의 색: <strong className="text-gray-700">{fortune.luckyColor}</strong>
          </span>
          <span>
            행운의 숫자: <strong className="text-gray-700">{fortune.luckyNumber}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FortunePage() {
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacAnimal>("용");
  const [activeTab, setActiveTab] = useState("today");
  const [comment, setComment] = useState("");

  const today = getToday();
  const fortune = generateFortune(today, selectedZodiac);
  const last7 = getLast7Days();

  const handleShare = useCallback(() => {
    // Kakao share placeholder
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `${fortune.zodiac}띠 오늘의 운세`,
          text: fortune.general,
          url: window.location.href,
        })
        .catch(() => {
          /* user cancelled */
        });
    }
  }, [fortune]);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-gray-900">🔮 오늘의 운세</h1>

      {/* Zodiac Selector */}
      <div className="flex flex-wrap gap-2">
        {ZODIAC_ANIMALS.map((z) => (
          <Button
            key={z}
            variant={selectedZodiac === z ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedZodiac(z)}
            className="text-sm"
          >
            {getZodiacEmoji(z)} {z}
          </Button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">
            <Star size={16} className="mr-1" /> 오늘
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1">
            <ChatCircle size={16} className="mr-1" /> 댓글
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <ClockCounterClockwise size={16} className="mr-1" /> 히스토리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          <FortuneCard fortune={fortune} />
          <Button variant="outline" className="w-full" onClick={handleShare}>
            <ShareNetwork size={20} className="mr-2" />
            운세 공유하기
          </Button>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {getZodiacEmoji(selectedZodiac)} {selectedZodiac}띠 댓글방
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {[
                  {
                    id: "1",
                    nickname: "행운이",
                    text: "오늘 정말 좋은 일이 있었어요!",
                    time: "2시간 전",
                  },
                  {
                    id: "2",
                    nickname: "산사랑",
                    text: "산책 다녀왔더니 기분 좋네요",
                    time: "5시간 전",
                  },
                ].map((c) => (
                  <div key={c.id} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{c.nickname}</span>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="댓글을 입력하세요"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button size="sm" onClick={() => setComment("")}>
                  작성
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {last7.map((date) => {
            const f = generateFortune(date, selectedZodiac);
            return (
              <Card key={date} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{date}</p>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-1">{f.general}</p>
                    </div>
                    <ScoreStars score={f.score} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
