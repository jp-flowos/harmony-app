import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harmony-app.kr";

export const metadata: Metadata = {
  title: {
    default: "하모니 - 액티브 시니어 라이프 플랫폼",
    template: "%s | 하모니",
  },
  description:
    "취미·정보 기반 55~70세 시니어를 위한 클럽 활동 플랫폼. 운세, 커뮤니티, 모임을 한곳에서.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "하모니",
    title: "하모니 - 액티브 시니어 라이프 플랫폼",
    description: "취미·정보 기반 55~70세 시니어를 위한 클럽 활동 플랫폼",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "하모니 - 액티브 시니어 라이프 플랫폼",
    description: "취미·정보 기반 55~70세 시니어를 위한 클럽 활동 플랫폼",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
