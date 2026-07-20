"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const CHECKBOX_BRAND =
  "data-[state=checked]:border-coral-500 data-[state=checked]:bg-coral-500 focus-visible:ring-coral-200";

interface StepConsentProps {
  agreeTerms: boolean;
  agreePrivacy: boolean;
  onChange: (next: { agreeTerms: boolean; agreePrivacy: boolean }) => void;
  onNext: () => void;
}

export function StepConsent({ agreeTerms, agreePrivacy, onChange, onNext }: StepConsentProps) {
  const allAgreed = agreeTerms && agreePrivacy;

  return (
    <div className="space-y-7">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral-50">
          <ShieldCheck size={32} weight="duotone" className="text-coral-600" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-mocha-900">
          약관에 동의해주세요
        </h2>
        <p className="mt-2 text-lg leading-relaxed text-mocha-700">
          하모니를 이용하려면 아래 약관에 동의가 필요해요
        </p>
      </div>

      <div className="rounded-2xl border border-mocha-200 bg-white p-4">
        <label
          htmlFor="agree-all"
          className="flex items-center gap-3 border-b border-mocha-100 pb-3 text-lg font-extrabold text-mocha-900"
        >
          <Checkbox
            id="agree-all"
            checked={allAgreed}
            onCheckedChange={(v) => onChange({ agreeTerms: v === true, agreePrivacy: v === true })}
            className={CHECKBOX_BRAND}
          />
          전체 약관 동의
        </label>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="agree-terms"
              checked={agreeTerms}
              onCheckedChange={(v) => onChange({ agreeTerms: v === true, agreePrivacy })}
              className={CHECKBOX_BRAND}
            />
            <label htmlFor="agree-terms" className="flex-1 text-base text-mocha-800">
              이용약관 동의 (필수)
            </label>
            <Link
              href="/terms"
              className="text-sm font-bold text-coral-700 underline underline-offset-2"
            >
              보기
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="agree-privacy"
              checked={agreePrivacy}
              onCheckedChange={(v) => onChange({ agreeTerms, agreePrivacy: v === true })}
              className={CHECKBOX_BRAND}
            />
            <label htmlFor="agree-privacy" className="flex-1 text-base text-mocha-800">
              개인정보 처리방침 동의 (필수)
            </label>
            <Link
              href="/privacy"
              className="text-sm font-bold text-coral-700 underline underline-offset-2"
            >
              보기
            </Link>
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg" type="button" onClick={onNext} disabled={!allAgreed}>
        동의하고 시작하기
      </Button>
    </div>
  );
}
