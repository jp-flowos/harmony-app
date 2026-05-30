"use client";

import { useEffect, useState } from "react";
import { initKakao, shareToKakao } from "@/lib/kakao/share";
import { dismiss, isDismissed } from "@/lib/onboarding/storage";

export function KakaoShareButton() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    initKakao();
    if (!isDismissed("kakao-share")) setHidden(false);
  }, []);

  if (hidden) return null;

  function handleClick() {
    const ok = shareToKakao({
      title: "어머니가 하모니에 가입하셨어요",
      description: "55세 이상 친구들의 활동 공간 · 함께 보세요",
      imageUrl: `${window.location.origin}/og.png`,
      link: window.location.origin,
    });
    if (ok) {
      fetch("/api/onboarding/share-done", { method: "POST" }).catch(() => {});
      dismiss("kakao-share");
      setHidden(true);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-soft"
    >
      <span className="text-lg font-extrabold text-mocha-900">📱 자녀에게 가입 알리기</span>
      <span aria-hidden="true" className="text-coral-600">
        ↗
      </span>
    </button>
  );
}
