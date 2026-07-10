"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CreateMeetingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("20");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${params.id}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date,
          time,
          location,
          maxParticipants: Number(maxParticipants) || 20,
          description: description || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "모임을 만들지 못했어요. 다시 시도해주세요");
        return;
      }
      router.push(`/club/${params.id}/meeting/${json.data.id}`);
    } catch {
      setError("모임을 만들지 못했어요. 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/club/${params.id}`}
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">모임 만들기</CardTitle>
          <p className="text-base text-gray-500">만든 뒤 카톡으로 초대장을 보낼 수 있어요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">모임 이름</Label>
              <Input
                id="meeting-title"
                placeholder="예) 7월 정기 산행"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="meeting-date">날짜</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="meeting-time">시간</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-location">장소</Label>
              <Input
                id="meeting-location"
                placeholder="예) 북한산 우이역 1번 출구"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-max">최대 인원</Label>
              <Input
                id="meeting-max"
                type="number"
                min={2}
                max={200}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-description">설명 (선택)</Label>
              <Textarea
                id="meeting-description"
                placeholder="모임에 대해 알려주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            {error && <p className="text-base font-semibold text-red-600">{error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? "만드는 중..." : "모임 만들기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
