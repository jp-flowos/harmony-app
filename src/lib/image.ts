// 클라이언트 전용 — 프로필 사진을 업로드 전에 축소 (긴 변 maxSize, JPEG 재인코딩)
export async function resizeImageToJpeg(file: File, maxSize = 1024, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 사용할 수 없어요");
    // 투명 PNG가 JPEG로 변환될 때 검정 배경이 되지 않도록 흰색으로 채움
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) throw new Error("이미지 변환에 실패했어요");
    return blob;
  } finally {
    bitmap.close();
  }
}
