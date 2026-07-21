"use client";

import { ArrowLeft, Camera, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { kstDateString } from "@/lib/format-date";
import { resizeImageToJpeg } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

const TITLE_MAX = 100;
const CONTENT_MAX = 2000;

export interface NoticeInitial {
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string; // YYYY-MM-DD
  imageUrl: string | null;
}

interface NoticeFormProps {
  clubId: string;
  mode: "create" | "edit";
  postId?: string;
  initial?: NoticeInitial;
}

export function NoticeForm({ clubId, mode, postId, initial }: NoticeFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false);
  const [publishedAt, setPublishedAt] = useState(() => initial?.publishedAt ?? kstDateString());
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 저장 실패 시 입력 유실 방지 — 작성 내용을 sessionStorage에 유지한다(완료조건 #6).
  const draftKey = `harmony.notice-draft.${clubId}.${postId ?? "new"}`;
  const [hydrated, setHydrated] = useState(false);

  // 마운트 시 초안 복원(있으면 폼 값을 덮어씀). hydrated 플래그로 아래 저장 effect보다 먼저 끝낸다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as Partial<NoticeInitial>;
        if (typeof d.title === "string") setTitle(d.title);
        if (typeof d.content === "string") setContent(d.content);
        if (typeof d.isPinned === "boolean") setIsPinned(d.isPinned);
        if (typeof d.publishedAt === "string") setPublishedAt(d.publishedAt);
        if (typeof d.imageUrl === "string" || d.imageUrl === null) setImageUrl(d.imageUrl);
      }
    } catch {
      // 손상된 초안은 무시하고 초기값 유지
    }
    setHydrated(true);
  }, [draftKey]);

  // 복원 완료 후부터 입력 변화를 초안으로 저장한다(복원 전 초기값이 초안을 덮어쓰지 않게).
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ title, content, isPinned, publishedAt, imageUrl })
      );
    } catch {
      // 저장 실패(용량 등)는 조용히 무시 — 폼 동작에는 영향 없음
    }
  }, [hydrated, draftKey, title, content, isPinned, publishedAt, imageUrl]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const blob = await resizeImageToJpeg(file);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUploadError("로그인이 필요해요. 로그인 후 다시 시도해주세요.");
        return;
      }
      // 클럽 전용 버킷이 없어 h-avatars 재사용. 스토리지 RLS가 첫 경로 세그먼트=uid를 요구하므로 uid로 시작.
      const path = `${user.id}/club-notices/${clubId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("h-avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadErr) {
        console.error("[notice-form] upload failed", uploadErr);
        setUploadError("사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      const { data } = supabase.storage.from("h-avatars").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err) {
      console.error("[notice-form] resize failed", err);
      setUploadError("사진을 처리하지 못했어요. 다른 사진으로 시도해주세요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || uploading) return; // 중복 제출 차단
    setSubmitting(true);
    setError(null);
    try {
      const url =
        mode === "create"
          ? `/api/clubs/${clubId}/notices`
          : `/api/clubs/${clubId}/notices/${postId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          isPinned,
          publishedAt,
          imageUrl: imageUrl || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        // 실패 시 초안은 그대로 유지되어 재시도 가능(완료조건 #6)
        setError(json?.error?.message ?? "공지를 저장하지 못했어요. 다시 시도해주세요");
        return;
      }
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        // 삭제 실패는 무시
      }
      router.push(`/club/${clubId}`);
      router.refresh();
    } catch {
      setError("공지를 저장하지 못했어요. 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    title.trim().length > 0 && content.trim().length > 0 && !uploading && !submitting;

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/club/${clubId}`}
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === "create" ? "공지 등록" : "공지 수정"}
          </CardTitle>
          <p className="text-base text-gray-500">클럽 멤버들에게 보여줄 공지를 작성해주세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="notice-title">제목</Label>
              <Input
                id="notice-title"
                placeholder="예) 3월 정기모임 안내"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX}
                required
              />
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <Label htmlFor="notice-content">내용</Label>
              <Textarea
                id="notice-content"
                placeholder="공지 내용을 입력해주세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={CONTENT_MAX}
                rows={6}
                required
              />
              <p className="px-1 text-right text-sm text-gray-400">
                {content.length}/{CONTENT_MAX}
              </p>
            </div>

            {/* 중요 공지 */}
            <label
              htmlFor="notice-pinned"
              className="flex items-center gap-3 rounded-2xl border-2 border-mocha-200 p-4"
            >
              <Checkbox
                id="notice-pinned"
                checked={isPinned}
                onCheckedChange={(v) => setIsPinned(v === true)}
              />
              <span className="flex-1">
                <span className="block text-base font-semibold text-mocha-900">중요 공지</span>
                <span className="block text-sm text-mocha-500">목록 맨 위에 먼저 보여요</span>
              </span>
            </label>

            {/* 게시일 */}
            <div className="space-y-2">
              <Label htmlFor="notice-date">게시일</Label>
              <Input
                id="notice-date"
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                required
              />
              <p className="px-1 text-sm text-gray-400">
                기본은 오늘이에요. 과거 날짜로도 올릴 수 있어요.
              </p>
            </div>

            {/* 이미지 (선택, 1장) */}
            <div className="space-y-2">
              <Label>사진 (선택)</Label>
              {imageUrl ? (
                <div className="relative w-full overflow-hidden rounded-2xl border-2 border-mocha-200">
                  {/* biome-ignore lint/performance/noImgElement: 스토리지 public URL 미리보기 — next/image 도메인 보장 불가 */}
                  <img src={imageUrl} alt="첨부한 사진" className="max-h-72 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    aria-label="사진 삭제"
                    className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75"
                  >
                    <X size={22} weight="bold" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || submitting}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-mocha-300 text-base font-semibold text-mocha-600 transition-colors hover:border-coral-400 hover:text-coral-600 disabled:opacity-50"
                >
                  <Camera size={22} weight="duotone" />
                  {uploading ? "사진 올리는 중..." : "사진 추가"}
                </button>
              )}
              {uploadError && <p className="text-base font-semibold text-red-600">{uploadError}</p>}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {error && <p className="text-base font-semibold text-red-600">{error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={!canSubmit}>
              {submitting
                ? "저장 중..."
                : uploading
                  ? "사진 올리는 중..."
                  : mode === "create"
                    ? "공지 등록"
                    : "수정 완료"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
