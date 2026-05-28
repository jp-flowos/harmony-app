"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepFontScale } from "@/components/onboarding/StepFontScale";
import { StepHobby } from "@/components/onboarding/StepHobby";
import { StepNickname } from "@/components/onboarding/StepNickname";
import { StepRegion } from "@/components/onboarding/StepRegion";
import { useFontScale } from "@/components/providers/FontScaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/ui/step-indicator";
import { isVoiceGuideEnabled } from "@/lib/voice/speak";

type OnboardingStep = "font" | "nickname" | "region" | "hobby";

interface SavedProgress {
  step?: OnboardingStep;
  nickname?: string;
  sido?: string;
  sigungu?: string;
  hobbyId?: string;
}

const STORAGE_KEY = "harmony.onboarding.progress";

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "font", label: "글자" },
  { id: "nickname", label: "이름" },
  { id: "region", label: "지역" },
  { id: "hobby", label: "취미" },
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
  const [hobbyId, setHobbyId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);

  const currentStep = STEPS.findIndex((item) => item.id === step) + 1;

  useEffect(() => {
    const saved = readProgress();

    if (saved) {
      if (isOnboardingStep(saved.step)) setStep(saved.step);
      if (typeof saved.nickname === "string") setNickname(saved.nickname);
      if (typeof saved.sido === "string") setSido(saved.sido);
      if (typeof saved.sigungu === "string") setSigungu(saved.sigungu);
      if (typeof saved.hobbyId === "string") setHobbyId(saved.hobbyId);
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
      hobbyId,
    });
  }, [hobbyId, nickname, restored, sido, sigungu, step]);

  function goToStep(nextStep: OnboardingStep) {
    setError("");
    setStep(nextStep);
  }

  async function handleComplete() {
    if (!nickname.trim() || !sido || !hobbyId || loading) return;

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
          hobbyId,
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
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/")}>
              건너뛰기
            </Button>
          </div>
          <div className="flex justify-center overflow-x-auto pb-1">
            <StepIndicator
              steps={STEPS.map(({ label }) => ({ label }))}
              current={currentStep}
              ariaLabel="온보딩 진행 단계"
              className="[&>div>div[aria-hidden='true']]:mx-1 [&>div>div[aria-hidden='true']]:w-4 sm:[&>div>div[aria-hidden='true']]:mx-2 sm:[&>div>div[aria-hidden='true']]:w-12"
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
            onBack={() => goToStep("nickname")}
          />
        )}

        {step === "hobby" && (
          <StepHobby
            selectedHobbyId={hobbyId}
            onChange={setHobbyId}
            onBack={() => goToStep("region")}
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
