import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Primary PWA icon — two leaves embracing (sage + coral) on cream background.
 * Auto-served as /icon at the size declared above.
 * The home screen & install dialog use this.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fdf8f0 0%, #f9f1e3 100%)",
        borderRadius: 96,
      }}
    >
      <svg width="360" height="360" viewBox="0 0 48 48" fill="none">
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
