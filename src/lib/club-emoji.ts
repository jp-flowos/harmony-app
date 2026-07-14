// 클럽 카테고리를 대표 이모지로 매핑. h_clubs에 cover_image가 없을 때 카드 썸네일로 사용.
const CATEGORY_EMOJI: Record<string, string> = {
  등산: "⛰️",
  골프: "⛳",
  독서: "📚",
  요리: "🍳",
  사진: "📷",
  여행: "✈️",
  음악: "🎵",
  댄스: "💃",
  낚시: "🎣",
  바둑: "♟️",
  원예: "🌱",
  수영: "🏊",
};

export function categoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? "👥";
}
