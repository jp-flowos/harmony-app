const POOL = [
  "행복한아침",
  "봄바람",
  "달빛산책",
  "푸른하늘",
  "따뜻한오후",
  "별빛여행",
  "맑은물소리",
  "산들바람",
  "노을지는길",
  "꽃피는마음",
  "느린걸음",
  "조용한숲",
  "은하수꿈",
  "포근한이불",
  "햇살가득",
  "바람의노래",
  "고요한호수",
  "초록잎새",
  "구름타는날",
  "달빛아래",
  "마음의쉼터",
  "오늘도좋은날",
  "감사한하루",
  "다정한이웃",
  "정다운목소리",
  "따스한손길",
  "고운미소",
  "온화한봄날",
  "한걸음한걸음",
  "느긋한오후",
] as const;

export function pickNicknameCandidates(count = 6): string[] {
  const limit = Math.max(0, Math.min(count, POOL.length));
  const shuffled = [...POOL];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, limit);
}
