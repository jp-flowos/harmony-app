"use client";

import { User } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{2,7}$/;

interface StepNicknameProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function StepNickname({ value, onChange, onNext }: StepNicknameProps) {
  const [touched, setTouched] = useState(false);
  const valid = NICKNAME_RE.test(value);
  const showError = touched && value.length > 0 && !valid;

  return (
    <div className="space-y-6">
      <Greeting
        icon={<User size={32} weight="duotone" />}
        title="계정으로 사용할 닉네임을 작성해주세요."
        subtitle="다른 분들에게 보여지는 이름이에요"
      />

      <div className="space-y-2">
        <Label htmlFor="onboarding-nickname">닉네임</Label>
        <Input
          id="onboarding-nickname"
          placeholder="닉네임(2~7자 한글, 영문, 숫자)"
          value={value}
          maxLength={7}
          autoComplete="nickname"
          aria-invalid={showError}
          aria-describedby={showError ? "nickname-error" : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            setTouched(true);
          }}
          className={
            showError
              ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/30"
              : undefined
          }
          leadingIcon={<User size={26} weight="duotone" />}
        />
        {showError && (
          <p
            id="nickname-error"
            className="px-1 text-base font-semibold text-[var(--color-danger)]"
          >
            닉네임 형식이 올바르지 않습니다.
          </p>
        )}
      </div>

      <Button className="w-full" size="lg" onClick={onNext} disabled={!valid}>
        계속
      </Button>
    </div>
  );
}
