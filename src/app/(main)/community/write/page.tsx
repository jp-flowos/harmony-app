"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  { key: "free", label: "자유" },
  { key: "health", label: "건강" },
  { key: "travel", label: "여행" },
  { key: "hobby", label: "취미" },
  { key: "daily", label: "일상" },
  { key: "review", label: "정보공유" },
];

export default function CommunityWritePage() {
  const router = useRouter();
  const [category, setCategory] = useState("free");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    // Would POST to /api/community
    await new Promise((r) => setTimeout(r, 500));
    router.push("/community");
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/community" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">글 작성</h1>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Category */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-2">카테고리</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.key}
                  variant={category === cat.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(cat.key)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </fieldset>

          {/* Title */}
          <div>
            <label
              htmlFor="community-title"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              제목
            </label>
            <Input
              id="community-title"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="community-content"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              내용
            </label>
            <Textarea
              id="community-content"
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
          >
            {submitting ? "작성 중..." : "글 올리기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
