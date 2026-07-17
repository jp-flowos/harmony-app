"use client";

import {
  ArrowLeft,
  EnvelopeSimple,
  LockKey,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function FindPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });
      if (error) {
        console.error("[find-password] reset request failed", error);
        setError("요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Link
          href="/login/email"
          className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
        >
          <ArrowLeft size={20} />
          로그인으로 돌아가기
        </Link>

        <div className="mb-6 flex flex-col items-center gap-2 rounded-2xl bg-cream-100 p-5 text-center">
          <LockKey size={40} weight="duotone" className="text-coral-600" />
          <p className="text-lg font-extrabold text-mocha-900">보안 안내</p>
          <p className="text-base text-mocha-700">
            비밀번호를 재설정하기 위해 이메일 주소를 입력해 주세요.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
          >
            <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
            <span className="pt-0.5">{error}</span>
          </div>
        )}

        {sent ? (
          <output className="block rounded-2xl border border-sage-200 bg-sage-50 p-6 text-center">
            <PaperPlaneTilt size={36} weight="duotone" className="mx-auto mb-3 text-sage-700" />
            <p className="text-base leading-relaxed text-mocha-800">
              가입된 이메일이라면 재설정 링크를 보내드렸어요.
              <br />
              메일함(스팸함 포함)을 확인해주세요.
            </p>
          </output>
        ) : (
          <form className="stagger-children space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2 animate-fade-up">
              <Label htmlFor="fp-email">이메일 주소</Label>
              <Input
                id="fp-email"
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

            <div className="rounded-2xl border-l-4 border-coral-400 bg-cream-100 p-4 animate-fade-up">
              <p className="text-base text-mocha-700">
                가입하실 때 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
              </p>
            </div>

            <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
              {loading ? "보내는 중이에요..." : "재설정 링크 발송"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
