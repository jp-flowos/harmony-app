"use client";

import {
  ChatCircle,
  DeviceMobile,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Hand,
  Lock,
  Sparkle,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepIndicator } from "@/components/ui/step-indicator";
import { formatPhoneInput } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";

type Step = "info" | "complete";

const CHECKBOX_BRAND =
  "data-[state=checked]:border-coral-500 data-[state=checked]:bg-coral-500 focus-visible:ring-coral-200";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const allAgreed = agreeTerms && agreePrivacy;

  function toggleAll(checked: boolean) {
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 달라요. 다시 확인해주세요.");
      return;
    }
    if (!allAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          password,
          agreeTerms,
          agreePrivacy,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "가입에 실패했어요. 다시 시도해주세요.");
        return;
      }
      setNeedsEmailConfirm(Boolean(json.data?.needsEmailConfirm));
      setStep("complete");
    } catch {
      setError("가입에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setError("");
    setKakaoLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding` },
      });
      if (error) {
        console.error("Failed to start Kakao OAuth", error);
        setError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Failed to start Kakao OAuth", error);
      setError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setKakaoLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <div className="mb-6 flex justify-center">
          <StepIndicator
            steps={[{ label: "정보" }, { label: "완료" }]}
            current={step === "info" ? 1 : 2}
            ariaLabel="회원가입 진행 단계"
          />
        </div>

        {error && <ErrorBanner message={error} />}

        {step === "info" && (
          <>
            <Greeting
              icon={<Hand size={32} weight="duotone" />}
              title="하모니에 오신 것을 환영합니다"
              subtitle="간단한 정보 입력으로 하모니를 시작해보세요"
              className="mb-7"
            />

            <Button
              variant="kakao"
              className="mb-6 w-full animate-fade-up text-lg font-extrabold"
              size="lg"
              type="button"
              onClick={handleKakaoLogin}
              disabled={kakaoLoading}
            >
              <ChatCircle size={28} weight="fill" />
              {kakaoLoading ? "카카오로 연결 중..." : "카카오로 시작하기"}
            </Button>
            <div className="mb-6 flex items-center gap-3 text-mocha-500" aria-hidden="true">
              <hr className="flex-1 border-mocha-200" />
              <span className="text-sm">또는 이메일로</span>
              <hr className="flex-1 border-mocha-200" />
            </div>

            <form className="stagger-children space-y-6" onSubmit={handleRegister} noValidate>
              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-name">이름</Label>
                <Input
                  id="reg-name"
                  placeholder="실명을 입력해주세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={10}
                  required
                  leadingIcon={<User size={26} weight="duotone" />}
                  aria-describedby="name-help"
                />
                <p id="name-help" className="px-1 text-base text-mocha-700">
                  아이디 찾기 등 본인 확인에만 사용해요
                </p>
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-phone">휴대폰 번호</Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  autoComplete="tel"
                  maxLength={13}
                  required
                  leadingIcon={<DeviceMobile size={26} weight="duotone" />}
                />
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-email">이메일 주소</Label>
                <Input
                  id="reg-email"
                  type="email"
                  inputMode="email"
                  placeholder="example@harmony.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  leadingIcon={<EnvelopeSimple size={26} weight="duotone" />}
                />
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-password">비밀번호</Label>
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8자 이상 입력해주세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  leadingIcon={<Lock size={26} weight="duotone" />}
                  trailingAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                      aria-pressed={showPassword}
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200 focus:outline-none focus:ring-4 focus:ring-coral-200"
                    >
                      {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                    </button>
                  }
                />
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-password-confirm">비밀번호 확인</Label>
                <Input
                  id="reg-password-confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="다시 한번 입력해주세요"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  leadingIcon={<Lock size={26} weight="duotone" />}
                />
              </div>

              {/* 약관 동의 블록 (시안 login3) */}
              <div className="animate-fade-up rounded-2xl border border-mocha-200 bg-white p-4">
                <label
                  htmlFor="agree-all"
                  className="flex items-center gap-3 border-b border-mocha-100 pb-3 text-lg font-extrabold text-mocha-900"
                >
                  <Checkbox
                    id="agree-all"
                    checked={allAgreed}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    className={CHECKBOX_BRAND}
                  />
                  전체 약관 동의
                </label>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={agreeTerms}
                      onCheckedChange={(v) => setAgreeTerms(v === true)}
                      className={CHECKBOX_BRAND}
                      aria-label="이용약관 동의 (필수)"
                    />
                    <span className="flex-1 text-base text-mocha-800">이용약관 동의 (필수)</span>
                    <Link
                      href="/terms"
                      className="text-sm font-bold text-coral-700 underline underline-offset-2"
                    >
                      보기
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={agreePrivacy}
                      onCheckedChange={(v) => setAgreePrivacy(v === true)}
                      className={CHECKBOX_BRAND}
                      aria-label="개인정보 처리방침 동의 (필수)"
                    />
                    <span className="flex-1 text-base text-mocha-800">
                      개인정보 처리방침 동의 (필수)
                    </span>
                    <Link
                      href="/privacy"
                      className="text-sm font-bold text-coral-700 underline underline-offset-2"
                    >
                      보기
                    </Link>
                  </div>
                </div>
              </div>

              <Button
                className="w-full animate-fade-up"
                size="lg"
                type="submit"
                disabled={loading || !allAgreed}
              >
                {loading ? "가입 중이에요..." : "회원가입 완료"}
              </Button>
            </form>

            <div className="mt-7 border-t border-mocha-100 pt-6 text-center">
              <p className="text-lg text-mocha-700">
                이미 회원이신가요?{" "}
                <Link
                  href="/login"
                  className="font-bold text-coral-700 underline decoration-2 underline-offset-4 hover:text-coral-800"
                >
                  로그인
                </Link>
              </p>
            </div>
          </>
        )}

        {step === "complete" && <CompleteStep needsEmailConfirm={needsEmailConfirm} />}
      </CardContent>
    </Card>
  );
}

function CompleteStep({ needsEmailConfirm }: { needsEmailConfirm: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center animate-fade-up">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-coral-200/40 blur-xl" />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-coral-400 to-coral-600 shadow-warm">
          <Sparkle size={56} weight="fill" className="text-white" />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-extrabold text-mocha-900 tracking-tight">가입을 환영해요</h3>
        <p className="mt-3 text-lg text-mocha-700 leading-relaxed">
          {needsEmailConfirm ? (
            <>
              메일함에서 확인 메일을 열어
              <br />
              가입을 완료해주세요
            </>
          ) : (
            <>
              이제 하모니에서
              <br />
              새로운 친구를 만나보세요
            </>
          )}
        </p>
      </div>
      {!needsEmailConfirm && (
        <Link href="/onboarding" className="block w-full">
          <Button className="w-full" size="lg" asChild>
            <span>시작하기</span>
          </Button>
        </Link>
      )}
    </div>
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
