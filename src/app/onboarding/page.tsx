"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepConsent } from "@/components/onboarding/StepConsent";
import { StepFontScale } from "@/components/onboarding/StepFontScale";
import { StepProfile } from "@/components/onboarding/StepProfile";
import { useFontScale } from "@/components/providers/FontScaleProvider";
import { isVoiceGuideEnabled } from "@/lib/voice/speak";

type OnboardingStep = "consent" | "font" | "profile";

interface SavedProgress {
  step?: OnboardingStep;
  nickname?: string;
  sido?: string;
  sigungu?: string;
  bio?: string;
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
  { id: "profile", label: "프로필 등록" },
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
  const [bio, setBio] = useState("");
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
      if (typeof saved.bio === "string") setBio(saved.bio);
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
      bio,
      hobbyIds,
      avatarUrl,
      agreeTerms,
      agreePrivacy,
    });
  }, [agreePrivacy, agreeTerms, avatarUrl, bio, hobbyIds, nickname, restored, sido, sigungu, step]);

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
          bio: bio.trim() || undefined,
          fontScale: scale,
          prefersVoiceGuide: isVoiceGuideEnabled(),
          hobbyIds,
          avatarUrl: avatarUrl ?? undefined,
          agreeTerms,
          agreePrivacy,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: { message?: string } }
        | null;

      if (!response.ok || payload?.success === false) {
        // 서버가 준 구체적 안내(예: 전화번호 충돌 시 고객센터 문의)가 있으면 그대로 노출한다.
        setError(
          payload?.error?.message ?? "온보딩 정보를 저장하지 못했어요. 잠시 후 다시 시도해주세요."
        );
        return;
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
    <div className="flex h-dvh flex-col bg-cream-50">
      {/* 시안형 헤더: 뒤로 + 단계명 + 건너뛰기·문의하기 + 얇은 진행 바 */}
      <header
        className="shrink-0 border-b border-mocha-100 bg-white px-5 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="mx-auto w-full max-w-lg space-y-3">
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
            <h1 className="min-w-0 truncate text-lg font-extrabold text-mocha-900">
              {STEPS[stepIndex].label}
            </h1>
            <div className="flex shrink-0 items-center">
              {/* 약관 동의는 최종 저장(complete) 시점에만 기록되므로, 완료 전 이탈(건너뛰기)을
                  허용하면 필수 동의가 저장되지 않는다. 온보딩은 끝까지 진행해야 한다. */}
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
      </header>

      {step === "consent" && (
        <StepScroll>
          <StepConsent
            agreeTerms={agreeTerms}
            agreePrivacy={agreePrivacy}
            onChange={(next) => {
              setAgreeTerms(next.agreeTerms);
              setAgreePrivacy(next.agreePrivacy);
            }}
            onNext={() => goToStep("font")}
          />
        </StepScroll>
      )}

      {step === "font" && (
        <StepScroll>
          <StepFontScale onNext={() => goToStep("profile")} />
        </StepScroll>
      )}

      {step === "profile" && (
        <StepProfile
          nickname={nickname}
          onNicknameChange={setNickname}
          sido={sido}
          sigungu={sigungu}
          onSidoChange={setSido}
          onSigunguChange={setSigungu}
          bio={bio}
          onBioChange={setBio}
          hobbyIds={hobbyIds}
          onHobbyIdsChange={setHobbyIds}
          avatarUrl={avatarUrl}
          onAvatarUploaded={setAvatarUrl}
          onComplete={handleComplete}
          loading={loading}
          submitError={error}
        />
      )}
    </div>
  );
}

function StepScroll({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto px-5 py-6">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </main>
  );
}
