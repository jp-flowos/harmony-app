"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AGE_RANGE_OPTIONS,
  CLUB_CATEGORIES,
  DAY_OPTIONS,
  MEETING_TYPE_OPTIONS,
} from "@/lib/club-filters";
import { REGIONS, SIDO_LIST } from "@/lib/regions";
import { cn } from "@/lib/utils";

const joinTypes = [
  { value: "open", label: "자유 가입" },
  { value: "approval", label: "승인 후 가입" },
];

const NONE_VALUE = "_none";

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [activityDays, setActivityDays] = useState<string[]>([]);
  const [meetingType, setMeetingType] = useState(NONE_VALUE);
  const [ageRange, setAgeRange] = useState("all");
  const [description, setDescription] = useState("");
  const [joinType, setJoinType] = useState("open");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sigunguList = sido ? (REGIONS[sido] ?? []) : [];

  function toggleDay(day: string) {
    setActivityDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !sido) {
      setError("카테고리와 지역을 선택해주세요");
      return;
    }
    if (sigunguList.length > 0 && !sigungu) {
      setError("시/군/구를 선택해주세요");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          description,
          joinType,
          sido,
          sigungu: sigungu || undefined,
          activityDays,
          meetingType: meetingType === NONE_VALUE ? undefined : meetingType,
          ageRange,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "클럽을 만들지 못했어요. 다시 시도해주세요");
        return;
      }
      router.push(`/club/${json.data.id}`);
    } catch {
      setError("클럽을 만들지 못했어요. 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <Link
        href="/club"
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">클럽 만들기</CardTitle>
          <p className="text-base text-gray-500">실명인증 완료 후 클럽을 만들 수 있습니다</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="club-name">클럽 이름</Label>
              <Input
                id="club-name"
                placeholder="클럽 이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CLUB_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>활동 지역</Label>
              <div className="flex gap-2">
                <Select
                  value={sido}
                  onValueChange={(v) => {
                    setSido(v);
                    setSigungu("");
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="시/도 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIDO_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sigungu}
                  onValueChange={setSigungu}
                  disabled={sigunguList.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="시/군/구 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sigunguList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>활동 요일 (선택)</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    aria-pressed={activityDays.includes(day.value)}
                    className={cn(
                      "h-11 w-11 rounded-full border text-base font-semibold transition-colors",
                      activityDays.includes(day.value)
                        ? "border-coral-500 bg-coral-50 text-coral-700"
                        : "border-mocha-200 bg-white text-mocha-700"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>모임 유형 (선택)</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
                  {MEETING_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>연령대</Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 연령</SelectItem>
                  {AGE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">클럽 소개</Label>
              <Textarea
                id="description"
                placeholder="클럽을 소개해주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>가입 방식</Label>
              <Select value={joinType} onValueChange={setJoinType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {joinTypes.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-base font-semibold text-red-600">{error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? "만드는 중..." : "클럽 만들기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
