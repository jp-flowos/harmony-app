import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest.
 * Served by Next.js at /manifest.webmanifest.
 *
 * Tuning notes for senior PWA + WebView hybrid:
 *  - `display: "standalone"` removes the browser chrome so it feels like a native app
 *  - `orientation: "portrait"` — seniors typically hold phones one-handed
 *  - `theme_color` matches the address bar / status bar tint
 *  - `background_color` matches the cream page bg so launch screen doesn't flash white
 *  - `lang: "ko"` so screen readers / Play Store handle Korean correctly
 *  - `categories` improves discoverability in app installers
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "하모니 - 액티브 시니어 라이프",
    short_name: "하모니",
    description: "55-70대를 위한 따뜻한 모임, 정보, 커뮤니티 플랫폼",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf8f0",
    theme_color: "#ec6a52",
    lang: "ko",
    dir: "ltr",
    scope: "/",
    categories: ["lifestyle", "social", "health"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "내 클럽",
        short_name: "클럽",
        description: "참여 중인 모임 보기",
        url: "/club",
      },
      {
        name: "오늘의 운세",
        short_name: "운세",
        description: "오늘의 운세 확인",
        url: "/fortune",
      },
      {
        name: "채팅",
        short_name: "채팅",
        description: "1:1 채팅 열기",
        url: "/chat",
      },
    ],
  };
}
