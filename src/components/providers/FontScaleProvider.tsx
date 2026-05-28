"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type FontScale = "sm" | "md" | "lg" | "xl";

type FontScaleContextValue = {
  scale: FontScale;
  setScale: (scale: FontScale) => void;
};

const STORAGE_KEY = "harmony.fontScale";
const FONT_SCALES: FontScale[] = ["sm", "md", "lg", "xl"];

const FontScaleContext = createContext<FontScaleContextValue | null>(null);

function isFontScale(value: string | null): value is FontScale {
  return FONT_SCALES.includes(value as FontScale);
}

function getPreloadedFontScale(initial: FontScale): FontScale {
  if (typeof document === "undefined") return initial;

  const preloaded = document.documentElement.dataset.fontScale ?? null;
  return isFontScale(preloaded) ? preloaded : initial;
}

export function FontScaleProvider({
  children,
  initial = "lg",
}: {
  children: ReactNode;
  initial?: FontScale;
}) {
  const [scale, setScaleState] = useState<FontScale>(() => getPreloadedFontScale(initial));

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isFontScale(saved)) {
        setScaleState(saved);
      }
    } catch {
      // Restricted storage contexts should not break global rendering.
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.dataset.fontScale = scale;
  }, [scale]);

  const setScale = useCallback((nextScale: FontScale) => {
    setScaleState(nextScale);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextScale);
      } catch {
        // Keep the in-memory scale even if persistence is unavailable.
      }
    }
  }, []);

  return (
    <FontScaleContext.Provider value={{ scale, setScale }}>{children}</FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const context = useContext(FontScaleContext);

  if (!context) {
    throw new Error("useFontScale must be used within FontScaleProvider");
  }

  return context;
}
