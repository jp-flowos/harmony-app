"use client";

import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepConsent } from "@/components/onboarding/StepConsent";
import { StepFontScale } from "@/components/onboarding/StepFontScale";
import { StepHobby } from "@/components/onboarding/StepHobby";
import { StepNickname } from "@/components/onboarding/StepNickname";
import { StepPhoto } from "@/components/onboarding/StepPhoto";
import { StepRegion } from "@/components/onboarding/StepRegion";
import { useFontScale } from "@/components/providers/FontScaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isVoiceGuideEnabled } from "@/lib/voice/speak";

type OnboardingStep = "consent" | "font" | "nickname" | "region" | "hobby" | "photo";

interface SavedProgress {
  step?: OnboardingStep;
  nickname?: string;
  sido?: string;
  sigungu?: string;
  hobbyCategory?: string;
  hobbyIds?: string[];
  avatarUrl?: string | null;
  agreeTerms?: boolean;
  agreePrivacy?: boolean;
}

const STORAGE_KEY = "harmony.onboarding.progress";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "consent", label: "약관 동의" },
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
  const [step, setStep] = useState<OnboardingStep>("consent");
  const [nickname, setNickname] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [hobbyCategory, setHobbyCategory] = useState("");
  const [hobbyIds, setHobbyIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  useEffect(() => {
    const saved = readProgress();
    if (saved) {
      // 동의 단계 추가 이전에 저장된 진행분에는 agreeTerms/agreePrivacy가 없다.
      // 그 경우 이미 지나간 단계로 복원하면 동의 없이 완료를 시도하게 되므로,
      // 저장된 단계는 무시하고 동의 단계부터 다시 시작한다(다른 입력값은 보존).
      const hasConsentFields =
        typeof saved.agreeTerms === "boolean" && typeof saved.agreePrivacy === "boolean";
      if (hasConsentFields) {
        setAgreeTerms(saved.agreeTerms as boolean);
        setAgreePrivacy(saved.agreePrivacy as boolean);
        if (isOnboardingStep(saved.step)) setStep(saved.step);
      }
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
    writeProgress({
      step,
      nickname,
      sido,
      sigungu,
      hobbyCategory,
      hobbyIds,
      avatarUrl,
      agreeTerms,
      agreePrivacy,
    });
  }, [
    agreePrivacy,
    agreeTerms,
    avatarUrl,
    hobbyCategory,
    hobbyIds,
    nickname,
    restored,
    sido,
    sigungu,
    step,
  ]);

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
          agreeTerms,
          agreePrivacy,
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

        {step === "consent" && (
          <StepConsent
            agreeTerms={agreeTerms}
            agreePrivacy={agreePrivacy}
            onChange={(next) => {
              setAgreeTerms(next.agreeTerms);
              setAgreePrivacy(next.agreePrivacy);
            }}
            onNext={() => goToStep("font")}
          />
        )}

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
