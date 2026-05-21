"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Step = "info" | "complete";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      // 1. Supabase auth 회원가입
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("이미 가입된 이메일입니다.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // 2. 프로필 생성 (서버 API 통해서)
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
        <CardTitle className="text-center text-2xl">회원가입</CardTitle>
        <div className="flex justify-center gap-2 pt-2">
          {(["info", "complete"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2 w-24 rounded-full ${
                i <= ["info", "complete"].indexOf(step)
                  ? "bg-orange-500"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === "info" && (
          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                placeholder="닉네임을 입력해주세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">이메일</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">비밀번호</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="8자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "가입 중..." : "가입하기"}
            </Button>
          </form>
        )}

        {step === "complete" && (
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <span className="text-4xl">🎉</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">가입 완료!</h3>
              <p className="mt-2 text-base text-gray-500">
                하모니에 오신 것을 환영합니다
              </p>
            </div>
            <Link href="/onboarding">
              <Button className="w-full" size="lg">
                시작하기
              </Button>
            </Link>
          </div>
        )}

        {step === "info" && (
          <div className="mt-6 text-center">
            <p className="text-base text-gray-500">
              이미 회원이신가요?{" "}
              <Link href="/login" className="font-medium text-orange-500 hover:underline">
                로그인
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
