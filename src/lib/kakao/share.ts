declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (opts: Record<string, unknown>) => void;
      };
    };
  }
}

export function initKakao() {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return;
  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
}

export function shareToKakao(opts: {
  title: string;
  description: string;
  imageUrl: string;
  link: string;
}) {
  if (typeof window === "undefined" || !window.Kakao?.isInitialized()) return false;
  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: opts.title,
      description: opts.description,
      imageUrl: opts.imageUrl,
      link: { mobileWebUrl: opts.link, webUrl: opts.link },
    },
    buttons: [{ title: "함께 보기", link: { mobileWebUrl: opts.link, webUrl: opts.link } }],
  });
  return true;
}
