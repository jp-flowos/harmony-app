// Deterministic fortune generation based on date + zodiac (no external API)

const ZODIAC_ANIMALS = [
  "쥐",
  "소",
  "호랑이",
  "토끼",
  "용",
  "뱀",
  "말",
  "양",
  "원숭이",
  "닭",
  "개",
  "돼지",
] as const;

export type ZodiacAnimal = (typeof ZODIAC_ANIMALS)[number];

export function getZodiacFromBirthYear(year: number): ZodiacAnimal {
  // 쥐 = 2020, 2008, 1996, ...
  const idx = (year - 4) % 12;
  return ZODIAC_ANIMALS[idx >= 0 ? idx : idx + 12];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function dateSeed(date: string, zodiac: string): number {
  let hash = 0;
  const str = `${date}:${zodiac}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const GENERAL_FORTUNES = [
  "새로운 만남이 당신을 기다리고 있습니다. 마음을 열고 다가가 보세요.",
  "오랜 친구와의 연락이 좋은 소식을 가져올 수 있습니다.",
  "오늘은 자신을 돌아보는 시간을 가지면 좋겠습니다.",
  "계획했던 일이 순조롭게 진행될 조짐이 보입니다.",
  "작은 변화가 큰 행운을 가져올 수 있는 날입니다.",
  "주변 사람들에게 감사를 표현하면 좋은 기운이 돌아옵니다.",
  "새로운 취미 활동을 시작하기 좋은 시기입니다.",
  "가족과 함께하는 시간이 마음에 안정을 가져다줍니다.",
  "오늘은 결단력이 필요한 순간이 올 수 있습니다. 자신을 믿으세요.",
  "예상치 못한 곳에서 좋은 기회가 찾아올 수 있습니다.",
  "차분하게 하루를 시작하면 모든 일이 잘 풀릴 것입니다.",
  "긍정적인 에너지가 넘치는 하루가 될 것입니다.",
];

const HEALTH_FORTUNES = [
  "가벼운 산책이 몸과 마음에 활력을 줄 것입니다.",
  "충분한 수면이 필요한 날입니다. 일찍 쉬세요.",
  "스트레칭을 통해 뭉친 근육을 풀어주세요.",
  "따뜻한 차 한 잔이 컨디션 회복에 도움이 됩니다.",
  "오늘은 과식을 피하고 가벼운 식사를 권합니다.",
  "규칙적인 운동 습관을 시작하기 좋은 날입니다.",
  "심호흡과 명상으로 스트레스를 해소해 보세요.",
  "비타민이 풍부한 과일을 챙겨 드세요.",
  "무리하지 않는 선에서 가벼운 운동이 도움됩니다.",
  "하루 물 8잔 마시기를 실천해 보세요.",
  "좋은 컨디션이 유지되는 날입니다. 활동적으로 보내세요.",
  "관절 건강에 신경 쓰시면 좋겠습니다.",
];

const MONEY_FORTUNES = [
  "예상치 못한 소득이 생길 수 있는 날입니다.",
  "계획적인 소비가 중요한 시기입니다.",
  "투자보다는 저축에 집중하면 좋겠습니다.",
  "친구의 재테크 조언이 도움이 될 수 있습니다.",
  "금전적인 결정은 신중하게 하세요.",
  "작은 절약이 큰 보람으로 돌아올 것입니다.",
  "새로운 수입원을 모색해 보는 것도 좋겠습니다.",
  "오늘은 큰 지출을 피하는 것이 좋습니다.",
  "재정 계획을 재점검하기 좋은 날입니다.",
  "주변의 좋은 정보가 재정에 도움이 됩니다.",
  "안정적인 재테크가 길게 보면 유리합니다.",
  "소소한 행운이 금전운에 미소를 가져다줍니다.",
];

export interface FortuneResult {
  date: string;
  zodiac: ZodiacAnimal;
  general: string;
  health: string;
  money: string;
  score: number; // 1-5
  luckyColor: string;
  luckyNumber: number;
}

const COLORS = ["빨강", "파랑", "노랑", "초록", "보라", "주황", "분홍", "하늘"];

export function generateFortune(date: string, zodiac: ZodiacAnimal): FortuneResult {
  const rand = seededRandom(dateSeed(date, zodiac));

  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  return {
    date,
    zodiac,
    general: pick(GENERAL_FORTUNES),
    health: pick(HEALTH_FORTUNES),
    money: pick(MONEY_FORTUNES),
    score: Math.floor(rand() * 5) + 1,
    luckyColor: pick(COLORS),
    luckyNumber: Math.floor(rand() * 99) + 1,
  };
}

export function getZodiacEmoji(zodiac: ZodiacAnimal): string {
  const map: Record<ZodiacAnimal, string> = {
    쥐: "🐭",
    소: "🐂",
    호랑이: "🐯",
    토끼: "🐰",
    용: "🐉",
    뱀: "🐍",
    말: "🐴",
    양: "🐑",
    원숭이: "🐵",
    닭: "🐔",
    개: "🐶",
    돼지: "🐷",
  };
  return map[zodiac] ?? "🔮";
}

export { ZODIAC_ANIMALS };
