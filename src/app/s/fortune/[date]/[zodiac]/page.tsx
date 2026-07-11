import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FortuneCard } from "@/components/fortune/FortuneCard";
import { generateFortune, ZODIAC_ANIMALS, type ZodiacAnimal } from "@/lib/fortune";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function todaySeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function isAllowedDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const today = todaySeoul();
  if (date > today) return false;
  const diff =
    new Date(`${today}T00:00:00+09:00`).getTime() - new Date(`${date}T00:00:00+09:00`).getTime();
  return diff <= WEEK_MS;
}

function parseZodiac(raw: string): ZodiacAnimal | null {
  // Route params can arrive percent-encoded on some render paths (e.g. metadata);
  // decodeURIComponent is idempotent on already-decoded Korean, and try/catch turns
  // malformed input (stray %) into a 404 instead of a 500.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return (ZODIAC_ANIMALS as readonly string[]).includes(decoded) ? (decoded as ZodiacAnimal) : null;
}

interface Props {
  params: Promise<{ date: string; zodiac: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date, zodiac: rawZodiac } = await params;
  const zodiac = parseZodiac(rawZodiac);
  if (!zodiac || !DATE_RE.test(date)) return {};
  const fortune = generateFortune(date, zodiac);
  const title = `${zodiac}띠 오늘의 운세 (${date})`;
  const description = fortune.general;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function SharedFortunePage({ params }: Props) {
  const { date, zodiac: rawZodiac } = await params;
  const zodiac = parseZodiac(rawZodiac);
  if (!zodiac) notFound();
  if (!isAllowedDate(date)) {
    redirect(`/s/fortune/${todaySeoul()}/${encodeURIComponent(zodiac)}`);
  }

  const fortune = generateFortune(date, zodiac);

  return (
    <div className="space-y-5 p-5">
      <h1 className="pt-2 text-center text-3xl font-extrabold tracking-tight text-mocha-900">
        오늘의 운세
      </h1>
      <FortuneCard fortune={fortune} />
      <p className="text-center text-lg font-semibold text-mocha-700">
        하모니에 가입하면 내 띠 운세를 매일 받아볼 수 있어요
      </p>
    </div>
  );
}
