# UX 리디자인 Phase 4 (온보딩 재구성) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시안(프로필 등록 7장)대로 온보딩을 재구성한다 — 시안형 헤더(뒤로/단계명/문의하기/진행 바), 글자 2×2 카드, 닉네임 실시간 유효성, 지역 드롭다운, 취미 대분류→세부 2단(복수 1~3), 프로필 사진 등록 단계 신설. 이월분인 h_hobbies 6대분류 재편 마이그레이션 포함.

**Architecture:** 위저드 셸(`onboarding/page.tsx`)이 5단계 상태와 sessionStorage 복원을 소유하고, 각 스텝은 제어 컴포넌트. 뒤로가기는 셸 헤더가 담당하므로 스텝 내 "이전" 버튼은 제거된다. 사진은 클라이언트 리사이즈(`src/lib/image.ts`) 후 Phase 0의 `h-avatars` 버킷에 업로드하고 public URL만 complete API로 전달한다. complete API는 `hobbyIds[]`(1~3)와 `avatarUrl`을 받도록 확장.

**Tech Stack:** Next.js 16 (client wizard), Supabase Storage(브라우저 클라이언트 업로드, 소유자 prefix 정책은 Phase 0에 배포됨), Drizzle, Zod v4, 기존 `REGIONS`/`SIDO_LIST`(Phase 1)·`FontScaleProvider`·`voice/speak` 재사용.

**Spec:** `docs/superpowers/specs/2026-07-17-ux-redesign-captures-design.md` §8 (Phase 4), §4.1 (h_hobbies 재편 이월)

## Global Constraints

- 사용자 노출 문자열 전부 한국어 (Zod 메시지 포함 — v4 기본 영어). 색상 브랜드 토큰(coral/cream/mocha/sage)만.
- `bunx tsc --noEmit` (npx 불가). **`bun run format` 금지** — 변경 파일만 `bunx biome check <파일>`.
- 마이그레이션은 `supabase/migrations/*.sql` + `bun run db:setup`, `si_mvp.` 스키마 한정. drizzle-kit 금지.
- biome a11y: label은 id/htmlFor 연결, `<img>`는 사유 명시 biome-ignore (기존 관례). 시니어 터치 타깃(최소 h-11급).
- `/onboarding`은 proxy 공개 경로 — 페이지는 비로그인 렌더 가능하나 complete API·스토리지 업로드는 인증 필요 (런타임 검증 한계에 반영).
- **공유 DB에 실계정/실데이터 생성 금지** (h_hobbies UPDATE는 마이그레이션이므로 허용). 스토리지 업로드 검증은 로그인 세션이 없어 불가 — 사용자 수동 패스 항목.
- 기존 기능 보존: 음성 가이드(voice/speak), sessionStorage 진행 복원, 건너뛰기, 완료 → `/welcome`.
- Turbopack: 이 Phase는 신규 라우트 없음(기존 페이지 수정) — hot reload로 충분하나 이상 시 dev 재시작.
- 커밋 메시지: repo 관례 + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 작업 브랜치: `feature/ux-redesign-phase4`. 태스크마다 커밋.

---

### Task 1: h_hobbies 6대분류 재편 마이그레이션

**Files:**
- Create: `supabase/migrations/20260718090000_hobby_six_categories.sql`

**Interfaces:**
- Produces: `h_hobbies.category` 값이 6종으로 재편 — `운동/스포츠`(8) · `예술/공예`(4) · `요리/맛집`(1) · `음악/악기`(2) · `여행/아웃도어`(3) · `독서/자기계발`(5). hobby id/name 불변 (h_user_hobbies 보존). Task 5의 `HOBBY_GROUPS` 상수가 이 분류와 1:1.

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- Phase 4: h_hobbies 카테고리를 시안 6개 대분류로 재편 (스펙 §4.1 이월분).
-- hobby id/name은 불변 — h_user_hobbies FK 보존, category 문자열만 교체.
-- 소비처: 온보딩 StepHobby 그룹핑(이번 Phase에서 6분류 2단 UI로 교체).
-- 홈 추천(scoreClubs)은 hobbies.category와 club.category(취미명)를 비교하는 경로가
-- 재편 전에도 매치 불가(dead path)임을 확인 — 이 재편으로 동작 변화 없음.
UPDATE si_mvp.h_hobbies SET category = CASE id
  WHEN 'hb_hiking'      THEN '운동/스포츠'
  WHEN 'hb_golf'        THEN '운동/스포츠'
  WHEN 'hb_swim'        THEN '운동/스포츠'
  WHEN 'hb_yoga'        THEN '운동/스포츠'
  WHEN 'hb_badminton'   THEN '운동/스포츠'
  WHEN 'hb_tabletennis' THEN '운동/스포츠'
  WHEN 'hb_walking'     THEN '운동/스포츠'
  WHEN 'hb_dance'       THEN '운동/스포츠'
  WHEN 'hb_art'         THEN '예술/공예'
  WHEN 'hb_calligraphy' THEN '예술/공예'
  WHEN 'hb_photo'       THEN '예술/공예'
  WHEN 'hb_movie'       THEN '예술/공예'
  WHEN 'hb_cooking'     THEN '요리/맛집'
  WHEN 'hb_music'       THEN '음악/악기'
  WHEN 'hb_instrument'  THEN '음악/악기'
  WHEN 'hb_travel'      THEN '여행/아웃도어'
  WHEN 'hb_fishing'     THEN '여행/아웃도어'
  WHEN 'hb_gardening'   THEN '여행/아웃도어'
  WHEN 'hb_reading'     THEN '독서/자기계발'
  WHEN 'hb_baduk'       THEN '독서/자기계발'
  WHEN 'hb_language'    THEN '독서/자기계발'
  WHEN 'hb_computer'    THEN '독서/자기계발'
  WHEN 'hb_history'     THEN '독서/자기계발'
  ELSE category
END;
```

- [ ] **Step 2: 적용 및 검증**

Run: `bun run db:setup`
Expected: 적용 성공. psql(DATABASE_URL)로:

```sql
SELECT category, count(*) FROM si_mvp.h_hobbies GROUP BY category ORDER BY category;
```

Expected: 정확히 6행 — 독서/자기계발 5, 여행/아웃도어 3, 예술/공예 4, 요리/맛집 1, 운동/스포츠 8, 음악/악기 2 (합 23). 구 카테고리(운동/문화/생활/교육) 잔존 0.

- [ ] **Step 3: 기존 소비처 파급 확인**

Run: `grep -rn "hobbies.category\|h.category" src/ --include="*.ts" --include="*.tsx" | grep -v test`
Expected: 홈(`src/app/(main)/page.tsx`의 myHobbies)과 recommendation.ts 경로 — 위 주석의 dead-path 논거대로 동작 변화 없음을 확인만 (수정 금지). 현재 온보딩 `StepHobby.tsx`는 하드코딩 상수라 DB 재편의 영향 없음(다음 태스크들에서 교체됨).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260718090000_hobby_six_categories.sql
git commit -m "feat(db): regroup hobbies into six mockup categories

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: complete API 확장 (hobbyIds 복수 + avatarUrl)

**Files:**
- Modify: `src/app/api/onboarding/complete/route.ts`

**Interfaces:**
- Consumes: Drizzle `profiles`/`hobbies`/`userHobbies`/`verificationBadges`
- Produces: `POST /api/onboarding/complete` body — `{ nickname(2~7자 한글/영문/숫자), sido, sigungu?, hobbyIds: string[](1~3), fontScale, prefersVoiceGuide, avatarUrl?: string|null }`. `h_user_hobbies` 다건 교체, avatarUrl 제공 시에만 `profiles.avatarUrl` 갱신.

- [ ] **Step 1: 스키마·핸들러 교체**

`src/app/api/onboarding/complete/route.ts` — import에 `inArray` 추가(`drizzle-orm`), `CompleteOnboardingSchema`와 핸들러 본문을 다음으로 교체 (전체 구조는 기존 유지 — auth 체크/에러 응답 패턴 동일):

```ts
const CompleteOnboardingSchema = z.object({
  nickname: z
    .string()
    .trim()
    .regex(/^[가-힣a-zA-Z0-9]{2,7}$/, "닉네임 형식이 올바르지 않습니다"),
  sido: z.string().trim().min(1, "지역을 선택해주세요"),
  sigungu: z.string().trim().max(20).nullable().optional(),
  hobbyIds: z
    .array(z.string().trim().min(1))
    .min(1, "취미를 선택해주세요")
    .max(3, "취미는 최대 3개까지 선택할 수 있어요"),
  fontScale: z.enum(["sm", "md", "lg", "xl"]),
  prefersVoiceGuide: z.boolean(),
  avatarUrl: z.string().url("사진 주소가 올바르지 않아요").max(500).nullable().optional(),
});
```

핸들러의 파싱 이후 부분:

```ts
    const { nickname, sido, hobbyIds, fontScale, prefersVoiceGuide } = parsed.data;
    const sigungu = parsed.data.sigungu || null;
    const avatarUrl = parsed.data.avatarUrl || null;
    const region = sigungu ? `${sido} ${sigungu}` : sido;
    const uniqueHobbyIds = [...new Set(hobbyIds)];

    const existingHobbies = await db
      .select({ id: hobbies.id })
      .from(hobbies)
      .where(inArray(hobbies.id, uniqueHobbyIds));

    if (existingHobbies.length !== uniqueHobbyIds.length) {
      return validationError("선택한 취미를 찾을 수 없습니다");
    }

    await db.transaction(async (tx) => {
      const profileValues = {
        nickname,
        region,
        sido,
        sigungu,
        fontScale,
        prefersVoiceGuide,
        ...(avatarUrl ? { avatarUrl } : {}),
      };

      await tx
        .insert(profiles)
        .values({
          id: user.id,
          ...profileValues,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            ...profileValues,
            updatedAt: new Date(),
          },
        });

      await tx.delete(userHobbies).where(eq(userHobbies.userId, user.id));

      await tx
        .insert(userHobbies)
        .values(uniqueHobbyIds.map((hobbyId) => ({ userId: user.id, hobbyId })))
        .onConflictDoNothing();

      await tx
        .insert(verificationBadges)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          type: "first_meeting",
        })
        .onConflictDoNothing();
    });
```

- [ ] **Step 2: 정적/런타임 검증**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/app/api/onboarding/complete/route.ts` → 오류 없음.
dev 서버에서 비로그인 curl:

```bash
curl -s -X POST http://localhost:3000/api/onboarding/complete -H "Content-Type: application/json" -d '{}'
```

Expected: `{"success":false,"error":{"code":"UNAUTHORIZED",...}}` (401 — auth가 파싱보다 먼저). 인증 경로의 hobbyIds/avatarUrl 동작은 코드 트레이스 + 사용자 수동 패스.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/onboarding/complete/route.ts
git commit -m "feat(onboarding): accept multiple hobbies and avatar url on complete

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 이미지 리사이즈 유틸 + StepPhoto

**Files:**
- Create: `src/lib/image.ts`
- Create: `src/components/onboarding/StepPhoto.tsx`

**Interfaces:**
- Consumes: `createClient`(`@/lib/supabase/client`), Phase 0 버킷 `h-avatars`(소유자 prefix `{auth.uid()}/` 쓰기 정책 배포됨)
- Produces (Task 6이 사용):
  - `resizeImageToJpeg(file: File, maxSize?: number, quality?: number): Promise<Blob>`
  - `StepPhoto({ avatarUrl: string | null; onUploaded: (url: string) => void; onComplete: () => void; loading?: boolean })` — 사진은 선택 사항(없이도 완료 가능), 업로드 성공 시 public URL을 onUploaded로 전달

- [ ] **Step 1: 리사이즈 유틸**

`src/lib/image.ts`:

```ts
// 클라이언트 전용 — 프로필 사진을 업로드 전에 축소 (긴 변 maxSize, JPEG 재인코딩)
export async function resizeImageToJpeg(
  file: File,
  maxSize = 1024,
  quality = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 사용할 수 없어요");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) throw new Error("이미지 변환에 실패했어요");
    return blob;
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 2: StepPhoto 구현**

`src/components/onboarding/StepPhoto.tsx`:

```tsx
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
              <img src={avatarUrl} alt="선택한 프로필 사진" className="h-full w-full object-cover" />
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

      <Button
        className="w-full"
        size="lg"
        onClick={onComplete}
        disabled={uploading || loading}
      >
        <Sparkle size={24} weight="fill" />
        {uploading ? "사진 올리는 중..." : loading ? "저장 중..." : "완료"}
      </Button>
      {!avatarUrl && (
        <p className="text-center text-base text-mocha-500">사진은 나중에 등록해도 괜찮아요</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 검증 후 Commit**

Run: `bunx tsc --noEmit` → 출력 없음. `bunx biome check src/lib/image.ts src/components/onboarding/StepPhoto.tsx` → 오류 없음.

```bash
git add src/lib/image.ts src/components/onboarding/StepPhoto.tsx
git commit -m "feat(onboarding): photo step with client-side resize and h-avatars upload

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 스텝 UI 3종 교체 (글자/닉네임/지역)

**Files:**
- Modify: `src/components/onboarding/StepFontScale.tsx` (OPTIONS·레이아웃만 교체)
- Modify: `src/components/onboarding/StepNickname.tsx` (전체 교체)
- Modify: `src/components/onboarding/StepRegion.tsx` (전체 교체)

**Interfaces:**
- Consumes: `REGIONS`/`SIDO_LIST`(`@/lib/regions`), ui `Select`/`Input`/`Button`/`Greeting`, `FontScaleProvider`, `voice/speak`
- Produces (Task 6이 사용):
  - `StepFontScale({ onNext: () => void })` — 변경 없음(내부만)
  - `StepNickname({ value: string; onChange: (v: string) => void; onNext: () => void })` — 유효성 `/^[가-힣a-zA-Z0-9]{2,7}$/` 통과 전 다음 비활성
  - `StepRegion({ sido, sigungu, onSidoChange, onSigunguChange, onNext })` — **onBack 제거** (셸 헤더가 뒤로 담당)

- [ ] **Step 1: StepFontScale — 시안 2×2 카드**

`OPTIONS` 상수와 옵션 렌더 블록을 다음으로 교체 (Greeting·음성 가이드·다음 버튼은 유지):

```tsx
const OPTIONS: { value: FontScale; label: string; sampleClass: string }[] = [
  { value: "sm", label: "보통 크기", sampleClass: "text-lg" },
  { value: "md", label: "조금 크게", sampleClass: "text-xl" },
  { value: "lg", label: "아주 크게", sampleClass: "text-2xl" },
  { value: "xl", label: "가장 크게", sampleClass: "text-3xl" },
];
```

옵션 목록 컨테이너를 `space-y-3` 세로 리스트에서 시안형 2×2 그리드로:

```tsx
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => {
          const isActive = scale === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setScale(option.value)}
              aria-pressed={isActive}
              className={`flex min-h-[104px] w-full flex-col items-start justify-between rounded-2xl border-2 p-4 text-left transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                isActive
                  ? "border-coral-500 bg-coral-50 shadow-soft"
                  : "border-mocha-200 bg-white hover:border-coral-400 hover:bg-coral-50"
              }`}
            >
              <span className="text-sm font-bold text-coral-700">{option.label}</span>
              <span className={`${option.sampleClass} font-bold text-mocha-900`}>안녕하세요</span>
            </button>
          );
        })}
      </div>
```

Greeting title은 시안 문구로: `title="프로필에 사용할 글씨체를 선택해주세요."` `subtitle="선택하면 바로 글자가 바뀌어요"`.

- [ ] **Step 2: StepNickname 전체 교체**

`src/components/onboarding/StepNickname.tsx`:

```tsx
"use client";

import { User } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{2,7}$/;

interface StepNicknameProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function StepNickname({ value, onChange, onNext }: StepNicknameProps) {
  const [touched, setTouched] = useState(false);
  const valid = NICKNAME_RE.test(value);
  const showError = touched && value.length > 0 && !valid;

  return (
    <div className="space-y-6">
      <Greeting
        icon={<User size={32} weight="duotone" />}
        title="계정으로 사용할 닉네임을 작성해주세요."
        subtitle="다른 분들에게 보여지는 이름이에요"
      />

      <div className="space-y-2">
        <Label htmlFor="onboarding-nickname">닉네임</Label>
        <Input
          id="onboarding-nickname"
          placeholder="닉네임(2~7자 한글, 영문, 숫자)"
          value={value}
          maxLength={7}
          autoComplete="nickname"
          aria-invalid={showError}
          aria-describedby={showError ? "nickname-error" : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            setTouched(true);
          }}
          className={
            showError
              ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/30"
              : undefined
          }
          leadingIcon={<User size={26} weight="duotone" />}
        />
        {showError && (
          <p id="nickname-error" className="px-1 text-base font-semibold text-[var(--color-danger)]">
            닉네임 형식이 올바르지 않습니다.
          </p>
        )}
      </div>

      <Button className="w-full" size="lg" onClick={onNext} disabled={!valid}>
        계속
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: StepRegion 전체 교체**

`src/components/onboarding/StepRegion.tsx`:

```tsx
"use client";

import { MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGIONS, SIDO_LIST } from "@/lib/regions";

interface StepRegionProps {
  sido: string;
  sigungu: string;
  onSidoChange: (sido: string) => void;
  onSigunguChange: (sigungu: string) => void;
  onNext: () => void;
}

export function StepRegion({ sido, sigungu, onSidoChange, onSigunguChange, onNext }: StepRegionProps) {
  const sigunguList = sido ? (REGIONS[sido] ?? []) : [];
  const canProceed = Boolean(sido) && (sigunguList.length === 0 || Boolean(sigungu));

  return (
    <div className="space-y-6">
      <Greeting
        icon={<MapPin size={32} weight="duotone" />}
        title="활동하시는 지역을 선택해주세요."
        subtitle="가까운 모임을 추천해드릴게요"
      />

      <div className="space-y-2">
        <Label>지역</Label>
        <div className="flex gap-2">
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
      </div>

      <Button className="w-full" size="lg" onClick={onNext} disabled={!canProceed}>
        계속
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: 검증 후 Commit**

Run: `bunx tsc --noEmit` — 이 시점에는 `onboarding/page.tsx`가 구 props(onBack 등)를 넘겨 **타입 오류가 나는 것이 정상** (Task 6에서 셸 교체로 해소). 오류가 정확히 page.tsx의 StepRegion/StepNickname 사용부에 한정되는지 확인하고 리포트에 기록. `bunx biome check src/components/onboarding/StepFontScale.tsx src/components/onboarding/StepNickname.tsx src/components/onboarding/StepRegion.tsx` → 오류 없음.

```bash
git add src/components/onboarding/StepFontScale.tsx src/components/onboarding/StepNickname.tsx src/components/onboarding/StepRegion.tsx
git commit -m "feat(onboarding): mockup-style font cards, validated nickname, region selects

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: StepHobby 2단 재작성 (대분류 → 세부, 복수 1~3)

**Files:**
- Modify: `src/components/onboarding/StepHobby.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 6대분류 (상수는 컴포넌트에 하드코딩 — DB와 1:1, id 23개 불변)
- Produces (Task 6이 사용): `StepHobby({ category: string; onCategoryChange: (c: string) => void; hobbyIds: string[]; onChange: (ids: string[]) => void; onNext: () => void })` — category 빈 문자열이면 대분류 그리드, 아니면 해당 세부 칩. 세부 복수 선택 1~3개 전까지 계속 비활성.

- [ ] **Step 1: 전체 교체**

`src/components/onboarding/StepHobby.tsx`:

```tsx
"use client";

import {
  Airplane,
  ArrowCounterClockwise,
  BookOpen,
  ForkKnife,
  Heart,
  MusicNote,
  Palette,
  SoccerBall,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";

// Task 1 마이그레이션의 6대분류와 1:1 — hobby id는 DB seed(20260528000000)와 동일
const HOBBY_GROUPS = [
  {
    category: "운동/스포츠",
    icon: <SoccerBall size={30} weight="duotone" />,
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
    icon: <Palette size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_art", label: "미술" },
      { id: "hb_calligraphy", label: "서예" },
      { id: "hb_photo", label: "사진" },
      { id: "hb_movie", label: "영화" },
    ],
  },
  {
    category: "요리/맛집",
    icon: <ForkKnife size={30} weight="duotone" />,
    hobbies: [{ id: "hb_cooking", label: "요리" }],
  },
  {
    category: "음악/악기",
    icon: <MusicNote size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_music", label: "음악감상" },
      { id: "hb_instrument", label: "악기연주" },
    ],
  },
  {
    category: "여행/아웃도어",
    icon: <Airplane size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_travel", label: "여행" },
      { id: "hb_fishing", label: "낚시" },
      { id: "hb_gardening", label: "원예" },
    ],
  },
  {
    category: "독서/자기계발",
    icon: <BookOpen size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_reading", label: "독서" },
      { id: "hb_baduk", label: "바둑" },
      { id: "hb_language", label: "외국어" },
      { id: "hb_computer", label: "컴퓨터" },
      { id: "hb_history", label: "역사탐방" },
    ],
  },
] as const;

const MAX_HOBBIES = 3;

interface StepHobbyProps {
  category: string;
  onCategoryChange: (category: string) => void;
  hobbyIds: string[];
  onChange: (hobbyIds: string[]) => void;
  onNext: () => void;
}

export function StepHobby({ category, onCategoryChange, hobbyIds, onChange, onNext }: StepHobbyProps) {
  const group = HOBBY_GROUPS.find((g) => g.category === category);

  function toggleHobby(id: string) {
    if (hobbyIds.includes(id)) {
      onChange(hobbyIds.filter((h) => h !== id));
    } else if (hobbyIds.length < MAX_HOBBIES) {
      onChange([...hobbyIds, id]);
    }
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Greeting
          icon={<Heart size={32} weight="duotone" />}
          title="관심 있는 취미를 선택해주세요."
          subtitle="분류를 고르면 세부 취미가 나와요"
        />

        <div className="grid grid-cols-2 gap-3">
          {HOBBY_GROUPS.map((g) => (
            <button
              key={g.category}
              type="button"
              onClick={() => onCategoryChange(g.category)}
              className="flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-mocha-200 bg-white p-4 text-lg font-extrabold text-mocha-900 transition-all duration-150 hover:border-coral-400 hover:bg-coral-50 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200"
            >
              <span className="text-coral-600">{g.icon}</span>
              {g.category}
            </button>
          ))}
        </div>

        {hobbyIds.length > 0 && (
          <Button className="w-full" size="lg" onClick={onNext}>
            계속 ({hobbyIds.length}/{MAX_HOBBIES}개 선택됨)
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Greeting
        icon={<span className="text-coral-600">{group.icon}</span>}
        title={`${group.category} 취미를 골라주세요.`}
        subtitle={`최대 ${MAX_HOBBIES}개까지 선택할 수 있어요 (${hobbyIds.length}/${MAX_HOBBIES})`}
      />

      <div className="flex flex-wrap gap-2.5">
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
              className={`min-h-[52px] rounded-full border-2 px-5 text-lg font-extrabold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 disabled:opacity-40 ${
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

      <button
        type="button"
        onClick={() => onCategoryChange("")}
        className="flex items-center gap-1.5 text-base font-bold text-mocha-500 underline underline-offset-2"
      >
        <ArrowCounterClockwise size={18} weight="bold" />
        다른 분류 보기
      </button>

      <Button className="w-full" size="lg" onClick={onNext} disabled={hobbyIds.length === 0}>
        계속 ({hobbyIds.length}/{MAX_HOBBIES})
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 검증 후 Commit**

Run: `bunx tsc --noEmit` — page.tsx 사용부 한정 타입 오류가 정상(Task 6에서 해소), 그 외 오류 없음 확인. `bunx biome check src/components/onboarding/StepHobby.tsx` → 오류 없음.

```bash
git add src/components/onboarding/StepHobby.tsx
git commit -m "feat(onboarding): two-tier hobby picker with multi-select (max 3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 위저드 셸 재구성 (헤더/진행 바/사진 스텝 통합)

**Files:**
- Modify: `src/app/(auth)/onboarding/page.tsx` (전체 교체)
- Modify: `.env.example` (`NEXT_PUBLIC_SUPPORT_EMAIL=` 항목 추가, 주석 "온보딩 문의하기 mailto — 미설정 시 미노출")

**Interfaces:**
- Consumes: Tasks 3-5의 컴포넌트 시그니처 (Produces 블록 그대로), Task 2의 complete API body
- Produces: 5단계 위저드 — 헤더(뒤로/단계명/건너뛰기·문의하기/진행 바), sessionStorage `harmony.onboarding.progress` v2 형태 `{ step, nickname, sido, sigungu, hobbyCategory, hobbyIds, avatarUrl }`

- [ ] **Step 1: page.tsx 전체 교체**

```tsx
"use client";

import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepFontScale } from "@/components/onboarding/StepFontScale";
import { StepHobby } from "@/components/onboarding/StepHobby";
import { StepNickname } from "@/components/onboarding/StepNickname";
import { StepPhoto } from "@/components/onboarding/StepPhoto";
import { StepRegion } from "@/components/onboarding/StepRegion";
import { useFontScale } from "@/components/providers/FontScaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isVoiceGuideEnabled } from "@/lib/voice/speak";

type OnboardingStep = "font" | "nickname" | "region" | "hobby" | "photo";

interface SavedProgress {
  step?: OnboardingStep;
  nickname?: string;
  sido?: string;
  sigungu?: string;
  hobbyCategory?: string;
  hobbyIds?: string[];
  avatarUrl?: string | null;
}

const STORAGE_KEY = "harmony.onboarding.progress";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "font", label: "글자 선택" },
  { id: "nickname", label: "이름 선택" },
  { id: "region", label: "지역 선택" },
  { id: "hobby", label: "취미 선택" },
  { id: "photo", label: "사진 선택" },
];

function isOnboardingStep(value: unknown): value is OnboardingStep {
  return STEPS.some((step) => step.id === value);
}

function readProgress(): SavedProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeProgress(progress: SavedProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage is best-effort only; onboarding should keep working without it.
  }
}

function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore restricted storage contexts.
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { scale } = useFontScale();
  const [step, setStep] = useState<OnboardingStep>("font");
  const [nickname, setNickname] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [hobbyCategory, setHobbyCategory] = useState("");
  const [hobbyIds, setHobbyIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  useEffect(() => {
    const saved = readProgress();
    if (saved) {
      if (isOnboardingStep(saved.step)) setStep(saved.step);
      if (typeof saved.nickname === "string") setNickname(saved.nickname);
      if (typeof saved.sido === "string") setSido(saved.sido);
      if (typeof saved.sigungu === "string") setSigungu(saved.sigungu);
      if (typeof saved.hobbyCategory === "string") setHobbyCategory(saved.hobbyCategory);
      if (Array.isArray(saved.hobbyIds)) {
        setHobbyIds(saved.hobbyIds.filter((id): id is string => typeof id === "string"));
      }
      if (typeof saved.avatarUrl === "string") setAvatarUrl(saved.avatarUrl);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    writeProgress({ step, nickname, sido, sigungu, hobbyCategory, hobbyIds, avatarUrl });
  }, [avatarUrl, hobbyCategory, hobbyIds, nickname, restored, sido, sigungu, step]);

  function goToStep(nextStep: OnboardingStep) {
    setError("");
    setStep(nextStep);
  }

  function goBack() {
    if (stepIndex > 0) goToStep(STEPS[stepIndex - 1].id);
  }

  async function handleComplete() {
    if (!nickname.trim() || !sido || hobbyIds.length === 0 || loading) return;

    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          sido,
          sigungu: sigungu.trim(),
          fontScale: scale,
          prefersVoiceGuide: isVoiceGuideEnabled(),
          hobbyIds,
          avatarUrl: avatarUrl ?? undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { success?: boolean } | null;

      if (!response.ok || payload?.success === false) {
        throw new Error("Onboarding complete request failed");
      }

      clearProgress();
      router.push("/welcome");
      router.refresh();
    } catch {
      setError("온보딩 정보를 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        {/* 시안형 헤더: 뒤로 + 단계명 + 건너뛰기·문의하기 + 얇은 진행 바 */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                aria-label="이전 단계로"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-mocha-800 transition-colors hover:bg-cream-100 focus:outline-none focus:ring-4 focus:ring-coral-200"
              >
                <ArrowLeft size={26} weight="bold" />
              </button>
            ) : (
              <span className="h-11 w-11 shrink-0" aria-hidden="true" />
            )}
            <h1 className="min-w-0 truncate text-xl font-extrabold text-mocha-900">
              {STEPS[stepIndex].label}
            </h1>
            <div className="flex shrink-0 items-center">
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/")}>
                건너뛰기
              </Button>
              {SUPPORT_EMAIL && (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="px-2 text-base font-bold text-mocha-500"
                >
                  문의하기
                </a>
              )}
            </div>
          </div>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={stepIndex + 1}
            aria-label={`온보딩 진행률: ${STEPS.length}단계 중 ${stepIndex + 1}단계`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-cream-100"
          >
            <div
              className="h-full rounded-full bg-coral-500 transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {step === "font" && <StepFontScale onNext={() => goToStep("nickname")} />}

        {step === "nickname" && (
          <StepNickname value={nickname} onChange={setNickname} onNext={() => goToStep("region")} />
        )}

        {step === "region" && (
          <StepRegion
            sido={sido}
            sigungu={sigungu}
            onSidoChange={setSido}
            onSigunguChange={setSigungu}
            onNext={() => goToStep("hobby")}
          />
        )}

        {step === "hobby" && (
          <StepHobby
            category={hobbyCategory}
            onCategoryChange={setHobbyCategory}
            hobbyIds={hobbyIds}
            onChange={setHobbyIds}
            onNext={() => goToStep("photo")}
          />
        )}

        {step === "photo" && (
          <StepPhoto
            avatarUrl={avatarUrl}
            onUploaded={setAvatarUrl}
            onComplete={handleComplete}
            loading={loading}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
    >
      <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
      <span className="pt-0.5">{message}</span>
    </div>
  );
}
```

- [ ] **Step 2: .env.example 항목 추가**

`.env.example` 끝에:

```
# 온보딩 "문의하기" mailto 주소 — 미설정 시 링크 미노출
NEXT_PUBLIC_SUPPORT_EMAIL=
```

- [ ] **Step 3: 정적/런타임 검증**

Run: `bunx tsc --noEmit` → **출력 없음** (Tasks 4-5의 잠정 오류가 여기서 해소됨). `bunx biome check "src/app/(auth)/onboarding/page.tsx"` → 오류 없음.
dev 서버 (필요 시 재시작) 후: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/onboarding` → `200` (공개 경로). `curl -s http://localhost:3000/onboarding | grep -c "글자 선택"` ≥ 1 (헤더 단계명 렌더). dev 종료.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/onboarding/page.tsx" .env.example
git commit -m "feat(onboarding): five-step wizard shell with mockup header and progress bar

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 최종 통합 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 정적 검증**

```bash
bunx tsc --noEmit
bun test src/lib
bunx biome check src/lib/image.ts src/components/onboarding/ "src/app/(auth)/onboarding/page.tsx" src/app/api/onboarding/complete/route.ts
```

Expected: tsc 출력 없음, bun test 39 pass (기존 유지 — 이 Phase는 신규 순수 로직 테스트 없음), biome 오류 없음.

- [ ] **Step 2: 런타임 검증 (비로그인 한계 내)**

dev 서버에서:
1. `/onboarding` → 200 + "글자 선택" 렌더
2. `POST /api/onboarding/complete` (빈 body) → 401 UNAUTHORIZED
3. psql: h_hobbies 6분류 카운트 재확인 (8/4/1/2/3/5)
4. 회귀: `/` 307, `/login` 200, `GET /api/clubs?sort=popular` → 200
5. dev 종료

- [ ] **Step 3: 결과 보고**

검증 결과 + 사용자 수동 패스 항목(로그인 후 온보딩 전체 왕복: 글자→닉네임 유효성→지역 Select→취미 2단 복수→사진 업로드→완료→/welcome, sessionStorage 복원, 뒤로가기) 보고.

---

## 셀프 리뷰 노트 (플랜 작성 시 확인 완료)

- 스펙 §8 커버: 헤더/진행 바/문의하기=Task 6, 글자 2×2=Task 4, 닉네임 실시간 유효성(2~7자, 추천 그리드 제거)=Task 4, 지역 Select 2개=Task 4, 취미 2단 복수 1~3=Task 5 + complete API=Task 2, 사진 단계+리사이즈+h-avatars=Task 3, 건너뛰기/음성 가이드/sessionStorage/welcome 보존=Task 6. §4.1 이월(h_hobbies 재편)=Task 1 (23개 전체 매핑 명시).
- 타입 일관성: Step 컴포넌트 Produces 시그니처 ↔ Task 6 사용부 일치 (StepRegion/StepHobby onBack 제거 — 셸 헤더 뒤로가기로 대체), complete body ↔ Task 2 스키마 (hobbyIds/avatarUrl).
- 중간 태스크(4-5)에서 page.tsx 타입 오류가 잠정 존재함을 명시 (Task 6 해소) — 태스크별 tsc 게이트의 예외로 문서화.
- 이전 Phase 교훈 반영: biome-ignore 사유 주석 선포함, label id/htmlFor, 브랜드 토큰, 실데이터 생성 금지 경계.
- scoreClubs 취미 매칭이 재편 전에도 dead path(카테고리명 vs 취미명)임을 소스로 확인 — 마이그레이션 무회귀. 활성화(취미명 전달)는 백로그.
