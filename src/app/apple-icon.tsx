import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple Touch Icon for iOS home-screen installs.
 * iOS will round the corners automatically, so we use a solid background fill
 * (no rounded radius inside the icon itself).
 */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fdf8f0",
      }}
    >
      <svg width="130" height="130" viewBox="0 0 48 48" fill="none">
        <title>하모니</title>
        <path d="M24 6 C 14 12, 8 22, 12 36 C 18 32, 22 24, 24 14 Z" fill="#7da164" />
        <path d="M24 6 C 34 12, 40 22, 36 36 C 30 32, 26 24, 24 14 Z" fill="#ee7d63" />
        <path d="M24 6 L 24 38" stroke="#6b5544" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M24 38 L 24 44" stroke="#405537" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>,
    size
  );
}
