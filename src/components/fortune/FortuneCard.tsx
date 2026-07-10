import { Star } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FortuneResult } from "@/lib/fortune";
import { getZodiacEmoji } from "@/lib/fortune";

const SCORE_STARS = [1, 2, 3, 4, 5] as const;

export function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${score}점 만점에 5점`}>
      {SCORE_STARS.map((star) => (
        <Star
          key={star}
          size={22}
          weight={star <= score ? "fill" : "regular"}
          className={star <= score ? "text-[var(--color-warning)]" : "text-mocha-200"}
        />
      ))}
    </div>
  );
}

export function FortuneCard({ fortune }: { fortune: FortuneResult }) {
  return (
    <Card className="overflow-hidden border-coral-100">
      <div className="bg-gradient-to-br from-coral-50 via-cream-100 to-sage-50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-4xl shadow-soft">
            {getZodiacEmoji(fortune.zodiac)}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-extrabold text-mocha-900 tracking-tight">
              {fortune.zodiac}띠 운세
            </h3>
            <p className="mt-0.5 text-base font-semibold text-mocha-700">{fortune.date}</p>
            <div className="mt-2">
              <ScoreStars score={fortune.score} />
            </div>
          </div>
        </div>
      </div>
      <CardContent className="space-y-5 p-6">
        <div>
          <Badge className="mb-2">종합운</Badge>
          <p className="text-lg text-mocha-900 leading-relaxed">{fortune.general}</p>
        </div>
        <div>
          <Badge variant="secondary" className="mb-2">
            건강운
          </Badge>
          <p className="text-lg text-mocha-900 leading-relaxed">{fortune.health}</p>
        </div>
        <div>
          <Badge variant="cream" className="mb-2">
            금전운
          </Badge>
          <p className="text-lg text-mocha-900 leading-relaxed">{fortune.money}</p>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-mocha-100 pt-4 text-base">
          <span className="text-mocha-700">
            행운의 색:{" "}
            <strong className="font-extrabold text-mocha-900">{fortune.luckyColor}</strong>
          </span>
          <span className="text-mocha-700">
            행운의 숫자:{" "}
            <strong className="font-extrabold text-mocha-900">{fortune.luckyNumber}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
