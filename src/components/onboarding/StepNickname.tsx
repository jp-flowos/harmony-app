"use client";

import { PencilSimple, UserCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { pickNicknameCandidates } from "@/lib/nickname/recommended";

interface StepNicknameProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function StepNickname({ value, onChange, onNext }: StepNicknameProps) {
  const candidates = useMemo(() => pickNicknameCandidates(6), []);
  const [useDirectInput, setUseDirectInput] = useState(false);
  const hasNickname = value.trim().length > 0;

  return (
    <div className="space-y-6">
      <Greeting
        icon={<UserCircle size={32} weight="duotone" />}
        title="뭐라고 불러드릴까요?"
        subtitle="마음에 드는 이름을 고르거나 직접 입력하세요"
      />

      {!useDirectInput && (
        <div className="grid grid-cols-2 gap-3">
          {candidates.map((nickname) => {
            const isSelected = value === nickname;

            return (
              <button
                key={nickname}
                type="button"
                onClick={() => onChange(nickname)}
                aria-pressed={isSelected}
                className={`min-h-[58px] rounded-2xl border-2 px-3 text-lg font-extrabold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                  isSelected
                    ? "border-coral-500 bg-coral-500 text-white shadow-warm"
                    : "border-mocha-200 bg-white text-mocha-900 hover:border-coral-400 hover:bg-coral-50"
                }`}
              >
                {nickname}
              </button>
            );
          })}
        </div>
      )}

      {useDirectInput && (
        <div className="space-y-2">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="예: 행복한아침"
            autoComplete="nickname"
            maxLength={20}
            leadingIcon={<PencilSimple size={26} weight="duotone" />}
            aria-label="닉네임 직접 입력"
          />
          <p className="px-1 text-base text-mocha-700">20자 이내로 입력해주세요</p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setUseDirectInput((current) => !current)}
      >
        <PencilSimple size={24} weight="duotone" />
        {useDirectInput ? "추천 이름에서 고르기" : "직접 입력하기"}
      </Button>

      <Button className="w-full" size="lg" onClick={onNext} disabled={!hasNickname}>
        다음
      </Button>
    </div>
  );
}
