import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // OG 이미지 라우트가 런타임에 읽는 한글 폰트를 serverless 함수 번들에 강제 포함.
  // (fs.readFile은 nft가 자동 추적하지 못하므로 명시적으로 include)
  outputFileTracingIncludes: {
    "/s/fortune/[date]/[zodiac]/opengraph-image": ["./src/assets/fonts/Pretendard-Bold.otf"],
    "/s/meeting/[id]/opengraph-image": ["./src/assets/fonts/Pretendard-Bold.otf"],
  },
};

export default nextConfig;
