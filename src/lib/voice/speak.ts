"use client";

const PREFS_KEY = "harmony.voiceGuide";

export function setVoiceGuideEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PREFS_KEY, enabled ? "1" : "0");
  } catch {
    // Restricted browsing contexts can block localStorage access.
  }
}

export function isVoiceGuideEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(PREFS_KEY) === "1";
  } catch {
    return false;
  }
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !isVoiceGuideEnabled()) {
    return;
  }

  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.95;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // iOS Safari can throw when speech is not triggered by a user gesture.
  }
}
