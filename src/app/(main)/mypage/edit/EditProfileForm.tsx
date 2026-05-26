"use client";

import { Camera } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const hobbyOptions = [
  "등산",
  "골프",
  "독서",
  "여행",
  "요리",
  "사진",
  "낚시",
  "바둑",
  "테니스",
  "수영",
  "서예",
  "가드닝",
  "댄스",
  "요가",
  "그림",
];

interface Props {
  userId: string;
  initial: {
    nickname: string;
    region: string;
    bio: string;
  };
}

export function EditProfileForm({ userId, initial }: Props) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initial.nickname);
  const [bio, setBio] = useState(initial.bio);
  const [region, setRegion] = useState(initial.region);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  };

  const handleSave = async () => {
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch(`/api/profiles/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, bio, region }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "저장에 실패했어요");
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("[profile save]", err);
      setError("네트워크 오류가 발생했어요");
    }
  };

  return (
    <>
      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-3xl">{nickname.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            aria-label="프로필 사진 변경 (준비 중)"
            disabled
            className="absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 text-white shadow-warm disabled:opacity-50"
          >
            <Camera size={20} />
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">지역</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">자기소개</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="자기소개를 입력해주세요"
            />
          </div>

          <div className="space-y-2">
            <Label>관심 취미 (복수 선택, 저장은 준비 중)</Label>
            <div className="flex flex-wrap gap-2">
              {hobbyOptions.map((hobby) => (
                <Badge
                  key={hobby}
                  variant={selectedHobbies.includes(hobby) ? "default" : "outline"}
                  className="cursor-pointer text-base"
                  onClick={() => toggleHobby(hobby)}
                >
                  {hobby}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}
      {savedAt && !error && (
        <output className="block rounded-2xl border-2 border-sage-200 bg-sage-50 p-4 text-base font-medium text-sage-800">
          저장되었어요
        </output>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSave}
        disabled={isPending || !nickname.trim()}
      >
        {isPending ? "저장 중이에요..." : "저장하기"}
      </Button>
    </>
  );
}
