/**
 * Gemini API wrapper with lazy initialization
 * Builds without environment variables — only throws on actual usage when key is missing
 */

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

interface GeminiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

let cachedConfig: GeminiConfig | null = null;

function getConfig(): GeminiConfig {
  if (cachedConfig) return cachedConfig;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[gemini] GEMINI_API_KEY is not configured");
  }

  cachedConfig = {
    apiKey,
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  };

  return cachedConfig;
}

async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const config = getConfig();

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[gemini] API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("[gemini] Empty response from Gemini");
  }

  return text;
}

/**
 * 운세 콘텐츠 생성 (관리자 트리거)
 */
export async function generateFortuneContent(
  zodiac: string,
  date: string
): Promise<{
  general: string;
  health: string;
  money: string;
  relation: string;
}> {
  const prompt = `오늘 날짜는 ${date}입니다.
${zodiac}띠를 위한 오늘의 운세를 작성해주세요.

다음 형식으로 작성해주세요 (각 항목 2-3문장):
- 종합운:
- 건강운:
- 금전운:
- 대인운:

55-70세 시니어가 대상입니다. 따뜻하고 긍정적인 톤으로, 구체적인 조언을 포함해주세요.`;

  const systemInstruction =
    "당신은 경험 많은 운세 전문가입니다. 시니어 대상으로 따뜻하고 실용적인 운세를 작성합니다.";

  const text = await callGemini(prompt, systemInstruction);

  // Parse response
  const lines = text.split("\n").filter((l) => l.trim());
  const extract = (prefix: string): string => {
    const line = lines.find((l) => l.includes(prefix));
    return line ? line.replace(new RegExp(`.*${prefix}\\s*`), "").trim() : "";
  };

  return {
    general: extract("종합운:") || text.slice(0, 200),
    health: extract("건강운:") || "",
    money: extract("금전운:") || "",
    relation: extract("대인운:") || "",
  };
}

/**
 * 정보 콘텐츠 초안 자동 생성
 */
export async function generateInfoDraft(
  topic: string,
  category: string
): Promise<{ title: string; content: string; summary: string; tags: string[] }> {
  const prompt = `주제: ${topic}
카테고리: ${category}

55~70세 시니어 대상 정보 콘텐츠를 작성해주세요.

형식:
제목: (간결하고 명확하게)
요약: (1-2문장 핵심 요약)
태그: (쉼표로 구분, 3-5개)
본문: (800-1200자, 쉬운 용어 사용, 단계별 설명)

시니어가 이해하기 쉽게, 실생활에 도움되는 내용으로 작성해주세요.`;

  const systemInstruction =
    "당신은 시니어 전문 콘텐츠 작성자입니다. 쉽고 친절한 문체를 사용합니다.";

  const text = await callGemini(prompt, systemInstruction);
  const lines = text.split("\n");

  const titleLine = lines.find((l) => l.startsWith("제목:"));
  const summaryLine = lines.find((l) => l.startsWith("요약:"));
  const tagsLine = lines.find((l) => l.startsWith("태그:"));
  const bodyStartIdx = lines.findIndex((l) => l.startsWith("본문:"));

  const title = titleLine?.replace("제목:", "").trim() ?? topic;
  const summary = summaryLine?.replace("요약:", "").trim() ?? "";
  const tags = tagsLine
    ? tagsLine
        .replace("태그:", "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [category];
  const content =
    bodyStartIdx >= 0 ? lines.slice(bodyStartIdx).join("\n").replace("본문:", "").trim() : text;

  return { title, content, summary, tags };
}

/**
 * Check if Gemini API is available (for UI toggling)
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
