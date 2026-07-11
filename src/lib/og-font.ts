import { readFile } from "node:fs/promises";
import { join } from "node:path";

// OG 이미지(satori)용 한글 폰트 — satori는 시스템 폰트를 못 쓰므로 번들 필수.
// Vercel Node 런타임에선 fetch("file://...")가 "not implemented"로 실패하므로
// process.cwd() 기준으로 디스크에서 직접 읽는다. 폰트가 함수 번들에 포함되도록
// next.config.ts의 outputFileTracingIncludes에 이 경로를 등록해 둔다.
const FONT_PATH = join(process.cwd(), "src/assets/fonts/Pretendard-Bold.otf");

let fontData: Buffer | null = null;

export async function loadOgFont(): Promise<Buffer> {
  if (!fontData) {
    fontData = await readFile(FONT_PATH);
  }
  return fontData;
}
