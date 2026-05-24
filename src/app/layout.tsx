import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/system/ServiceWorkerRegistrar";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harmony-app.kr";

export const metadata: Metadata = {
  title: {
    default: "하모니 - 액티브 시니어 라이프 플랫폼",
    template: "%s | 하모니",
  },
  description:
    "취미·정보 기반 55~70세 시니어를 위한 클럽 활동 플랫폼. 운세, 커뮤니티, 모임을 한곳에서.",
  metadataBase: new URL(BASE_URL),
  applicationName: "하모니",
  appleWebApp: {
    capable: true,
    title: "하모니",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow user-scaling for accessibility. Seniors with very low vision
  // may need to pinch-zoom; locking this would fail WCAG 1.4.4.
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ec6a52" },
    { media: "(prefers-color-scheme: dark)", color: "#ec6a52" },
  ],
  viewportFit: "cover", // Required for iOS safe-area-inset to work
  colorScheme: "light",
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
        {/* iOS PWA — extra hints not covered by Next metadata */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="하모니" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
