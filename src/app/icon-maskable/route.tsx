import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Maskable icon for Android adaptive icons (round, squircle, teardrop, etc).
 * Per W3C spec, the central 40% safe zone must contain the brand mark.
 * We render the leaf at 35% so it survives the most aggressive masks.
 */
export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ec6a52",
      }}
    >
      <svg width="180" height="180" viewBox="0 0 48 48" fill="none">
        <title>하모니</title>
        <path d="M24 6 C 14 12, 8 22, 12 36 C 18 32, 22 24, 24 14 Z" fill="#dce7d3" />
        <path d="M24 6 C 34 12, 40 22, 36 36 C 30 32, 26 24, 24 14 Z" fill="#ffffff" />
        <path
          d="M24 6 L 24 38"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path d="M24 38 L 24 44" stroke="#dce7d3" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>,
    { width: 512, height: 512 }
  );
}
