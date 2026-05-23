"use client";

import { CheckCircle, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("이미 가입된 이메일입니다. 로그인 해주세요.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.user) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id, nickname }),
        });
        if (!res.ok) {
          console.error("Profile creation error:", await res.text());
        }
      }

      setStep("complete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">회원가입</CardTitle>
        <div
          className="flex justify-center gap-2 pt-3"
          role="progressbar"
          aria-valuenow={step === "info" ? 1 : 2}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-label="회원가입 진행 단계"
        >
          {(["info", "complete"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2.5 w-24 rounded-full transition-colors ${
                i <= ["info", "complete"].indexOf(step) ? "bg-orange-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-base font-medium text-red-700"
          >
            <WarningCircle size={24} weight="fill" className="mt-0.5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {step === "info" && (
          <form className="space-y-6" onSubmit={handleRegister} noValidate>
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                placeholder="예: 행복한하루"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoComplete="nickname"
                required
                aria-describedby="nickname-help"
              />
              <p id="nickname-help" className="text-sm text-gray-600">
                다른 회원에게 보여지는 이름입니다
              </p>
            </div>

            <div className="space-y-2">
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="영문, 숫자 포함 8자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="pr-14"
                  aria-describedby="password-help"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-orange-100"
                >
                  {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                </button>
              </div>
              <p id="password-help" className="text-sm text-gray-600">
                기억하기 쉽고 안전한 비밀번호를 만들어주세요
              </p>
            </div>

            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "가입 중입니다..." : "가입하기"}
            </Button>
          </form>
        )}

        {step === "complete" && (
          <div className="space-y-6 py-6 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={56} weight="fill" className="text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">가입을 환영합니다</h3>
              <p className="mt-3 text-lg text-gray-700 leading-relaxed">
                이제 하모니에서 새로운
                <br />
                친구를 만나보세요
              </p>
            </div>
            <Link href="/onboarding" className="block">
              <Button className="w-full" size="lg" asChild>
                <span>시작하기</span>
              </Button>
            </Link>
          </div>
        )}

        {step === "info" && (
          <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <p className="text-lg text-gray-700">
              이미 회원이신가요?{" "}
              <Link
                href="/login"
                className="font-bold text-orange-600 underline underline-offset-4 hover:text-orange-700"
              >
                로그인
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
