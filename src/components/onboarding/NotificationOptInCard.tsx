"use client";

import { useEffect, useState } from "react";
import { subscribeUser } from "@/lib/notifications";
import { dismiss, isDismissed } from "@/lib/onboarding/storage";

export function NotificationOptInCard() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isDismissed("notif-opt-in")) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    setHidden(false);
  }, []);

  if (hidden) return null;

  async function handleOptIn() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribeUser();
      }
    } catch {
      // Best-effort: a denied/blocked permission must not break the home page.
    } finally {
      dismiss("notif-opt-in");
      setHidden(true);
    }
  }

  return (
    <button
      type="button"
      onClick={handleOptIn}
      className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-soft"
    >
      <span className="text-lg font-extrabold text-mocha-900">🔔 내일 모임 알림 받기 (1탭)</span>
      <span aria-hidden="true" className="text-coral-600">
        →
      </span>
    </button>
  );
}
