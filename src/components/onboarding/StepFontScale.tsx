"use client";

import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { type FontScale, useFontScale } from "@/components/providers/FontScaleProvider";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { isVoiceGuideEnabled, setVoiceGuideEnabled, speak } from "@/lib/voice/speak";

const OPTIONS: { value: FontScale; label: string; sampleClass: string }[] = [
  { value: "sm", label: "보통 크기", sampleClass: "text-lg" },
  { value: "md", label: "조금 크게", sampleClass: "text-xl" },
  { value: "lg", label: "아주 크게", sampleClass: "text-2xl" },
  { value: "xl", label: "가장 크게", sampleClass: "text-3xl" },
];

export function StepFontScale({ onNext }: { onNext: () => void }) {
  const { scale, setScale } = useFontScale();
  const [voiceOn, setVoiceOn] = useState(false);

  useEffect(() => {
    setVoiceOn(isVoiceGuideEnabled());
  }, []);

  function handleVoiceChange(enabled: boolean) {
    setVoiceOn(enabled);
    setVoiceGuideEnabled(enabled);

    if (enabled) {
      speak("안내 음성이 켜졌습니다.");
    }
  }

  return (
    <div className="space-y-6">
      <Greeting
        icon={<SpeakerHigh size={32} weight="duotone" />}
        title="프로필에 사용할 글씨체를 선택해주세요."
        subtitle="선택하면 바로 글자가 바뀌어요"
      />

      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => {
          const isActive = scale === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setScale(option.value)}
              aria-pressed={isActive}
              className={`flex min-h-[104px] w-full flex-col items-start justify-between rounded-2xl border-2 p-4 text-left transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                isActive
                  ? "border-coral-500 bg-coral-50 shadow-soft"
                  : "border-mocha-200 bg-white hover:border-coral-400 hover:bg-coral-50"
              }`}
            >
              <span className="text-sm font-bold text-coral-700">{option.label}</span>
              <span className={`${option.sampleClass} font-bold text-mocha-900`}>안녕하세요</span>
            </button>
          );
        })}
      </div>

      <label className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl bg-cream-50 p-4 text-lg font-bold text-mocha-900">
        <input
          type="checkbox"
          checked={voiceOn}
          onChange={(event) => handleVoiceChange(event.target.checked)}
          className="h-6 w-6 accent-coral-500"
        />
        {voiceOn ? (
          <SpeakerHigh size={26} weight="duotone" className="text-coral-500" />
        ) : (
          <SpeakerSlash size={26} weight="duotone" className="text-mocha-500" />
        )}
        안내 음성으로 듣기
      </label>

      <Button className="w-full" size="lg" onClick={onNext}>
        다음
      </Button>
    </div>
  );
}
