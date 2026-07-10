// OG 이미지(satori)용 한글 폰트 — satori는 시스템 폰트를 못 쓰므로 번들 필수
let fontData: ArrayBuffer | null = null;

export async function loadOgFont(): Promise<ArrayBuffer> {
  if (!fontData) {
    const res = await fetch(new URL("../assets/fonts/Pretendard-Bold.otf", import.meta.url));
    fontData = await res.arrayBuffer();
  }
  return fontData;
}
