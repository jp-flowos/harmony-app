"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once on first client render.
 *
 * We skip registration in dev to avoid stale caches getting in the way of HMR.
 * In production, registration is fire-and-forget; failures are silent so a
 * blocked SW (e.g. private browsing, corp policy) never breaks the page.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* SW registration is best-effort; ignore failures. */
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
