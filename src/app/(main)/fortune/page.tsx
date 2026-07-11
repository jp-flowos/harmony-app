"use client";

import { ChatCircle, ClockCounterClockwise, Sparkle, Star } from "@phosphor-icons/react";
import { useState } from "react";
import { FortuneCard, ScoreStars } from "@/components/fortune/FortuneCard";
import { ShareBar } from "@/components/share/ShareBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateFortune, getZodiacEmoji, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";

function getToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function getLast7Days(): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(fmt.format(d));
  }
  return days;
}

export default function FortunePage() {
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacAnimal>("용");
  const [activeTab, setActiveTab] = useState("today");
  const [comment, setComment] = useState("");

  const today = getToday();
  const fortune = generateFortune(today, selectedZodiac);
  const last7 = getLast7Days();

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-2 pt-2">
        <Sparkle size={32} weight="fill" className="text-coral-500" />
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">오늘의 운세</h1>
      </div>

      {/* Zodiac selector */}
      <div className="-mx-5 overflow-x-auto pb-1">
        <div className="flex gap-2 px-5">
          {ZODIAC_ANIMALS.map((z) => {
            const isActive = selectedZodiac === z;
            return (
              <button
                key={z}
                type="button"
                onClick={() => setSelectedZodiac(z)}
                aria-pressed={isActive}
                className={`shrink-0 min-h-[48px] rounded-full border-2 px-4 text-base font-bold transition-all active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                  isActive
                    ? "bg-coral-500 border-coral-500 text-white shadow-warm"
                    : "bg-white border-mocha-200 text-mocha-900 hover:border-coral-400"
                }`}
              >
                <span aria-hidden="true" className="mr-1">
                  {getZodiacEmoji(z)}
                </span>
                {z}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">
            <Star size={20} weight="duotone" className="mr-1" /> 오늘
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1">
            <ChatCircle size={20} weight="duotone" className="mr-1" /> 댓글
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <ClockCounterClockwise size={20} weight="duotone" className="mr-1" /> 지난주
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <FortuneCard fortune={fortune} />
          <ShareBar
            title={`${fortune.zodiac}띠 오늘의 운세`}
            description={fortune.general}
            path={`/s/fortune/${today}/${encodeURIComponent(selectedZodiac)}`}
          />
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                <span aria-hidden="true" className="mr-1">
                  {getZodiacEmoji(selectedZodiac)}
                </span>
                {selectedZodiac}띠 댓글방
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
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
                  <div key={c.id} className="rounded-2xl bg-cream-100 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-mocha-900">{c.nickname}</span>
                      <span className="text-sm font-semibold text-mocha-500">{c.time}</span>
                    </div>
                    <p className="mt-1.5 text-base text-mocha-800 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="댓글을 입력해주세요"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button onClick={() => setComment("")}>작성</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {last7.map((date) => {
            const f = generateFortune(date, selectedZodiac);
            return (
              <Card key={date} className="transition-all hover:border-coral-200 hover:shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-mocha-900">{date}</p>
                      <p className="mt-1 text-base text-mocha-700 leading-relaxed line-clamp-1">
                        {f.general}
                      </p>
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
