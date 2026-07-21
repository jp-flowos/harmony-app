"use client";

import {
  Airplane,
  BookOpen,
  Camera,
  ForkKnife,
  MusicNote,
  Palette,
  SoccerBall,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { resizeImageToJpeg } from "@/lib/image";
import { REGIONS, SIDO_LIST } from "@/lib/regions";
import { createClient } from "@/lib/supabase/client";

const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{2,7}$/;
const MAX_HOBBIES = 3;
const BIO_MAX = 200;

// hobby id는 DB seed(20260528000000 / 20260718090000)와 1:1로 동일해야 한다.
const HOBBY_GROUPS = [
  {
    category: "운동/스포츠",
    icon: <SoccerBall size={20} weight="duotone" />,
    hobbies: [
      { id: "hb_hiking", label: "등산" },
      { id: "hb_golf", label: "골프" },
      { id: "hb_swim", label: "수영" },
      { id: "hb_yoga", label: "요가" },
      { id: "hb_badminton", label: "배드민턴" },
      { id: "hb_tabletennis", label: "탁구" },
      { id: "hb_walking", label: "걷기" },
      { id: "hb_dance", label: "댄스" },
    ],
  },
  {
    category: "예술/공예",
    icon: <Palette size={20} weight="duotone" />,
    hobbies: [
      { id: "hb_art", label: "미술" },
      { id: "hb_calligraphy", label: "서예" },
      { id: "hb_photo", label: "사진" },
      { id: "hb_movie", label: "영화" },
    ],
  },
  {
    category: "요리/맛집",
    icon: <ForkKnife size={20} weight="duotone" />,
    hobbies: [{ id: "hb_cooking", label: "요리" }],
  },
  {
    category: "음악/악기",
    icon: <MusicNote size={20} weight="duotone" />,
    hobbies: [
      { id: "hb_music", label: "음악감상" },
      { id: "hb_instrument", label: "악기연주" },
    ],
  },
  {
    category: "여행/아웃도어",
    icon: <Airplane size={20} weight="duotone" />,
    hobbies: [
      { id: "hb_travel", label: "여행" },
      { id: "hb_fishing", label: "낚시" },
      { id: "hb_gardening", label: "원예" },
    ],
  },
  {
    category: "독서/자기계발",
    icon: <BookOpen size={20} weight="duotone" />,
    hobbies: [
      { id: "hb_reading", label: "독서" },
      { id: "hb_baduk", label: "바둑" },
      { id: "hb_language", label: "외국어" },
      { id: "hb_computer", label: "컴퓨터" },
      { id: "hb_history", label: "역사탐방" },
    ],
  },
] as const;

interface ProfileErrors {
  nickname?: string;
  region?: string;
  hobby?: string;
}

interface StepProfileProps {
  nickname: string;
  onNicknameChange: (value: string) => void;
  sido: string;
  sigungu: string;
  onSidoChange: (value: string) => void;
  onSigunguChange: (value: string) => void;
  bio: string;
  onBioChange: (value: string) => void;
  hobbyIds: string[];
  onHobbyIdsChange: (value: string[]) => void;
  avatarUrl: string | null;
  onAvatarUploaded: (url: string) => void;
  onComplete: () => void;
  loading: boolean;
  submitError?: string;
}

export function StepProfile({
  nickname,
  onNicknameChange,
  sido,
  sigungu,
  onSidoChange,
  onSigunguChange,
  bio,
  onBioChange,
  hobbyIds,
  onHobbyIdsChange,
  avatarUrl,
  onAvatarUploaded,
  onComplete,
  loading,
  submitError,
}: StepProfileProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const hobbyRef = useRef<HTMLDivElement>(null);

  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const sigunguList = sido ? (REGIONS[sido] ?? []) : [];

  function collectErrors(): ProfileErrors {
    const errs: ProfileErrors = {};
    if (!NICKNAME_RE.test(nickname.trim())) {
      errs.nickname = "닉네임은 2~7자 한글, 영문, 숫자로 입력해주세요.";
    }
    if (!sido) {
      errs.region = "지역을 선택해주세요.";
    } else if (sigunguList.length > 0 && !sigungu) {
      errs.region = "시/군/구를 선택해주세요.";
    }
    if (hobbyIds.length === 0) {
      errs.hobby = "관심사를 하나 이상 선택해주세요.";
    }
    return errs;
  }

  // 첫 제출 이후에만 실시간 오류를 노출한다(입력 중 조기 경고 방지).
  const errors = submitted ? collectErrors() : {};

  function toggleHobby(id: string) {
    if (hobbyIds.includes(id)) {
      onHobbyIdsChange(hobbyIds.filter((h) => h !== id));
    } else if (hobbyIds.length < MAX_HOBBIES) {
      onHobbyIdsChange([...hobbyIds, id]);
    }
  }

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
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("h-avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadErr) {
        console.error("[onboarding/profile] upload failed", uploadErr);
        setUploadError("사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      const { data } = supabase.storage.from("h-avatars").getPublicUrl(path);
      onAvatarUploaded(data.publicUrl);
    } catch (err) {
      console.error("[onboarding/profile] resize failed", err);
      setUploadError("사진을 처리하지 못했어요. 다른 사진으로 시도해주세요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSubmit() {
    setSubmitted(true);
    const errs = collectErrors();
    if (errs.nickname) {
      nicknameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      nicknameRef.current?.focus({ preventScroll: true });
      return;
    }
    if (errs.region) {
      regionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (errs.hobby) {
      hobbyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onComplete();
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-lg space-y-7">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-mocha-900">
              프로필을 등록해주세요
            </h2>
            <p className="text-base leading-relaxed text-mocha-600">
              닉네임·지역·자기소개·관심사·사진은 다른 회원에게 공개돼요.
            </p>
          </div>

          {/* 프로필 이미지 */}
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-cream-100">
                  {avatarUrl ? (
                    // biome-ignore lint/performance/noImgElement: 스토리지 public URL 미리보기 — next/image 도메인 보장 불가
                    <img
                      src={avatarUrl}
                      alt="선택한 프로필 사진"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={60} weight="duotone" className="text-mocha-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || loading}
                  aria-label="사진 선택"
                  className="absolute -right-1 bottom-1 flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 text-white shadow-warm transition-all hover:bg-coral-600 active:scale-95 focus:outline-none focus:ring-4 focus:ring-coral-200 disabled:opacity-50"
                >
                  <Camera size={24} weight="fill" />
                </button>
              </div>
            </div>
            <p className="text-center text-sm text-mocha-500">
              {uploading ? "사진 올리는 중..." : "사진은 나중에 등록해도 괜찮아요"}
            </p>
            {uploadError && <FieldError message={uploadError} />}
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

          {/* 닉네임 */}
          <div className="space-y-2">
            <Label htmlFor="profile-nickname">닉네임</Label>
            <Input
              id="profile-nickname"
              ref={nicknameRef}
              placeholder="닉네임(2~7자 한글, 영문, 숫자)"
              value={nickname}
              maxLength={7}
              autoComplete="nickname"
              aria-invalid={Boolean(errors.nickname)}
              aria-describedby={errors.nickname ? "profile-nickname-error" : undefined}
              onChange={(e) => onNicknameChange(e.target.value)}
              leadingIcon={<User size={26} weight="duotone" />}
              className={
                errors.nickname
                  ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/30"
                  : undefined
              }
            />
            {errors.nickname && (
              <FieldError id="profile-nickname-error" message={errors.nickname} />
            )}
          </div>

          {/* 지역 */}
          <div ref={regionRef} className="space-y-2">
            <Label id="profile-region-label">지역</Label>
            <div
              role="group"
              aria-labelledby="profile-region-label"
              aria-describedby={errors.region ? "profile-region-error" : undefined}
              className="flex gap-2"
            >
              <Select
                value={sido}
                onValueChange={(v) => {
                  onSidoChange(v);
                  onSigunguChange("");
                }}
              >
                <SelectTrigger className="flex-1" aria-label="시/도 선택">
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
                onValueChange={onSigunguChange}
                disabled={sigunguList.length === 0}
              >
                <SelectTrigger className="flex-1" aria-label="시/군/구 선택">
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
            {errors.region && <FieldError id="profile-region-error" message={errors.region} />}
          </div>

          {/* 자기소개 */}
          <div className="space-y-2">
            <Label htmlFor="profile-bio">
              자기소개 <span className="font-normal text-mocha-400">(선택)</span>
            </Label>
            <Textarea
              id="profile-bio"
              value={bio}
              maxLength={BIO_MAX}
              placeholder="이웃에게 나를 소개해보세요 (예: 등산과 사진을 좋아하는 이웃입니다)"
              onChange={(e) => onBioChange(e.target.value)}
            />
            <p className="px-1 text-right text-sm text-mocha-400">
              {bio.length}/{BIO_MAX}
            </p>
          </div>

          {/* 관심사 */}
          <div ref={hobbyRef} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label id="profile-hobby-label">관심사</Label>
              <span className="text-sm font-bold text-mocha-500">
                {hobbyIds.length}/{MAX_HOBBIES}
              </span>
            </div>
            <div
              role="group"
              aria-labelledby="profile-hobby-label"
              aria-describedby={errors.hobby ? "profile-hobby-error" : undefined}
              className="space-y-4"
            >
              {HOBBY_GROUPS.map((group) => (
                <div key={group.category} className="space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-mocha-500">
                    <span className="text-coral-600">{group.icon}</span>
                    {group.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.hobbies.map((hobby) => {
                      const isSelected = hobbyIds.includes(hobby.id);
                      const isFull = !isSelected && hobbyIds.length >= MAX_HOBBIES;
                      return (
                        <button
                          key={hobby.id}
                          type="button"
                          onClick={() => toggleHobby(hobby.id)}
                          aria-pressed={isSelected}
                          disabled={isFull}
                          className={`min-h-[48px] rounded-full border-2 px-4 text-base font-extrabold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 disabled:opacity-40 ${
                            isSelected
                              ? "border-coral-500 bg-coral-500 text-white shadow-warm"
                              : "border-mocha-200 bg-white text-mocha-900 hover:border-coral-400 hover:bg-coral-50"
                          }`}
                        >
                          {hobby.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {errors.hobby && <FieldError id="profile-hobby-error" message={errors.hobby} />}
          </div>
        </div>
      </main>

      <footer
        className="shrink-0 border-t border-mocha-100 bg-white/95 px-5 pt-4 backdrop-blur"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-lg space-y-3">
          {submitError && <FieldError message={submitError} />}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={loading || uploading}
          >
            {uploading ? "사진 올리는 중..." : loading ? "저장 중..." : "완료"}
          </Button>
        </div>
      </footer>
    </>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-1.5 px-1 text-base font-semibold text-[var(--color-danger)]"
    >
      <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
