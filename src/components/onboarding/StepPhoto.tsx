"use client";

import { Camera, Sparkle, User, WarningCircle } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { resizeImageToJpeg } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

interface StepPhotoProps {
  avatarUrl: string | null;
  onUploaded: (url: string) => void;
  onComplete: () => void;
  loading?: boolean;
}

export function StepPhoto({ avatarUrl, onUploaded, onComplete, loading = false }: StepPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const blob = await resizeImageToJpeg(file);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("로그인이 필요해요. 로그인 후 다시 시도해주세요.");
        return;
      }
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("h-avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) {
        console.error("[onboarding/photo] upload failed", uploadError);
        setError("사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      const { data } = supabase.storage.from("h-avatars").getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (err) {
      console.error("[onboarding/photo] resize failed", err);
      setError("사진을 처리하지 못했어요. 다른 사진으로 시도해주세요.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <Greeting
        icon={<Camera size={32} weight="duotone" />}
        title="프로필 사진을 등록해주세요"
        subtitle="나를 잘 나타내는 사진을 선택하면 더 많은 친구를 만날 수 있어요"
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
        >
          <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
          <span className="pt-0.5">{error}</span>
        </div>
      )}

      <div className="flex justify-center py-4">
        <div className="relative">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-cream-100">
            {avatarUrl ? (
              // biome-ignore lint/performance/noImgElement: 스토리지 public URL 미리보기 — next/image 도메인 보장 불가
              <img
                src={avatarUrl}
                alt="선택한 프로필 사진"
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={72} weight="duotone" className="text-mocha-500" />
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || loading}
            aria-label="사진 선택"
            className="absolute -right-1 bottom-1 flex h-14 w-14 items-center justify-center rounded-full bg-coral-500 text-white shadow-warm transition-all hover:bg-coral-600 active:scale-95 focus:outline-none focus:ring-4 focus:ring-coral-200 disabled:opacity-50"
          >
            <Camera size={28} weight="fill" />
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <Button className="w-full" size="lg" onClick={onComplete} disabled={uploading || loading}>
        <Sparkle size={24} weight="fill" />
        {uploading ? "사진 올리는 중..." : loading ? "저장 중..." : "완료"}
      </Button>
      {!avatarUrl && (
        <p className="text-center text-base text-mocha-500">사진은 나중에 등록해도 괜찮아요</p>
      )}
    </div>
  );
}
