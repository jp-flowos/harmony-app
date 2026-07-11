import { ImageResponse } from "next/og";
import { generateFortune, getZodiacEmoji, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";
import { loadOgFont } from "@/lib/og-font";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ date: string; zodiac: string }>;
}

export default async function OgImage({ params }: Props) {
  const { date, zodiac: rawZodiac } = await params;
  const zodiac: ZodiacAnimal = (ZODIAC_ANIMALS as readonly string[]).includes(rawZodiac)
    ? (rawZodiac as ZodiacAnimal)
    : "용";
  const fortune = generateFortune(date, zodiac);
  const stars = "★".repeat(fortune.score) + "☆".repeat(5 - fortune.score);
  const font = await loadOgFont();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        backgroundColor: "#FFF7ED",
        fontFamily: "Pretendard",
        padding: 60,
      }}
    >
      <div style={{ fontSize: 120 }}>{getZodiacEmoji(zodiac)}</div>
      <div style={{ fontSize: 64, color: "#3D2C24" }}>{`${zodiac}띠 오늘의 운세`}</div>
      <div style={{ fontSize: 40, color: "#8A6F5F" }}>{date}</div>
      <div style={{ fontSize: 48, color: "#F59E0B" }}>{stars}</div>
      <div
        style={{
          fontSize: 36,
          color: "#3D2C24",
          textAlign: "center",
          maxWidth: 1000,
        }}
      >
        {fortune.general}
      </div>
      <div style={{ fontSize: 32, color: "#EC6A52", marginTop: 12 }}>하모니</div>
    </div>,
    { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700 }] }
  );
}
