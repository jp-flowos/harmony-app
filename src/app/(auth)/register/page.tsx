"use client";

import {
  ChatCircle,
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
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepIndicator } from "@/components/ui/step-indicator";
import { createClient } from "@/lib/supabase/client";

type Step = "info" | "complete";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("info");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("이미 가입된 이메일이에요. 로그인 해주세요.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setStep("complete");
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
              title="안녕하세요! 만나서 반가워요"
              subtitle="간단한 정보로 시작할 수 있어요"
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
                <Label htmlFor="nickname">닉네임</Label>
                <Input
                  id="nickname"
                  placeholder="예: 행복한하루"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoComplete="nickname"
                  required
                  leadingIcon={<User size={26} weight="duotone" />}
                  aria-describedby="nickname-help"
                />
                <p id="nickname-help" className="px-1 text-base text-mocha-700">
                  다른 분들이 보는 이름이에요
                </p>
              </div>

              <div className="space-y-2 animate-fade-up">
                <Label htmlFor="reg-email">이메일</Label>
                <Input
                  id="reg-email"
                  type="email"
                  inputMode="email"
                  placeholder="example@email.com"
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
                  placeholder="영문, 숫자 포함 8자 이상"
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
                  aria-describedby="password-help"
                />
                <p id="password-help" className="px-1 text-base text-mocha-700">
                  기억하기 쉽고 안전한 비밀번호를 만들어주세요
                </p>
              </div>

              <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
                {loading ? "가입 중이에요..." : "가입하고 시작하기"}
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

        {step === "complete" && <CompleteStep />}
      </CardContent>
    </Card>
  );
}

function CompleteStep() {
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
          이제 하모니에서
          <br />
          새로운 친구를 만나보세요
        </p>
      </div>
      <Link href="/onboarding" className="block w-full">
        <Button className="w-full" size="lg" asChild>
          <span>시작하기</span>
        </Button>
      </Link>
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
