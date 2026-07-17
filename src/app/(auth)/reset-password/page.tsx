"use client";

import { CheckCircle, Eye, EyeSlash, Lock, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "invalid" | "form" | "done";

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setPhase(user ? "form" : "invalid");
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 달라요. 다시 확인해주세요.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("[reset-password] update failed", error);
        setError("비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setPhase("done");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Greeting
          icon={<Lock size={32} weight="duotone" />}
          title="비밀번호 재설정"
          subtitle="새로 사용할 비밀번호를 입력해주세요."
          className="mb-7"
        />

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
          >
            <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
            <span className="pt-0.5">{error}</span>
          </div>
        )}

        {phase === "checking" && (
          <p className="py-8 text-center text-base text-mocha-700">확인 중이에요...</p>
        )}

        {phase === "invalid" && (
          <div className="space-y-5 py-4 text-center">
            <p className="text-base leading-relaxed text-mocha-800">
              링크가 만료됐거나 올바르지 않아요.
              <br />
              재설정 링크를 다시 받아주세요.
            </p>
            <Link href="/find-password" className="block">
              <Button className="w-full" size="lg" asChild>
                <span>재설정 링크 다시 받기</span>
              </Button>
            </Link>
          </div>
        )}

        {phase === "form" && (
          <form className="stagger-children space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2 animate-fade-up">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
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
              <Label htmlFor="new-password-confirm">새 비밀번호 확인</Label>
              <Input
                id="new-password-confirm"
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
            <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
              {loading ? "변경 중이에요..." : "비밀번호 변경"}
            </Button>
          </form>
        )}

        {phase === "done" && (
          <div className="space-y-5 py-4 text-center">
            <CheckCircle size={48} weight="fill" className="mx-auto text-sage-600" />
            <p className="text-lg font-extrabold text-mocha-900">비밀번호가 변경됐어요</p>
            <Link href="/" className="block">
              <Button className="w-full" size="lg" asChild>
                <span>홈으로 가기</span>
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
