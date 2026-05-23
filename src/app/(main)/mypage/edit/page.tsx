"use client";

import { ArrowLeft, Camera } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
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

export default function ProfileEditPage() {
  const [nickname, setNickname] = useState("활기찬시니어");
  const [bio, setBio] = useState("등산과 독서를 좋아합니다");
  const [region, setRegion] = useState("서울");
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(["등산", "독서"]);

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  };

  const handleSave = () => {
    // TODO: PATCH /api/profiles/[id]
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">프로필 수정</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-3xl">{nickname[0]}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md"
          >
            <Camera size={16} />
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label>닉네임</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>지역</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>자기소개</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="자기소개를 입력해주세요"
            />
          </div>

          <div className="space-y-2">
            <Label>관심 취미 (복수 선택)</Label>
            <div className="flex flex-wrap gap-2">
              {hobbyOptions.map((hobby) => (
                <Badge
                  key={hobby}
                  className={`cursor-pointer ${
                    selectedHobbies.includes(hobby)
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                  onClick={() => toggleHobby(hobby)}
                >
                  {hobby}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={handleSave}>
        저장하기
      </Button>
    </div>
  );
}
