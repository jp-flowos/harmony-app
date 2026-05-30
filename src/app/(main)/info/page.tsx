import {
  Airplane,
  Buildings,
  CurrencyCircleDollar,
  Eye,
  GameController,
  Heart,
  ThumbsUp,
} from "@phosphor-icons/react/dist/ssr";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { infoContents } from "@/db/schema";

export const dynamic = "force-dynamic";

interface InfoCategory {
  key: "health" | "finance" | "travel" | "hobby" | "gov";
  label: string;
  icon: React.ReactNode;
}

const categories: InfoCategory[] = [
  { key: "health", label: "건강", icon: <Heart size={20} weight="duotone" /> },
  { key: "finance", label: "재테크", icon: <CurrencyCircleDollar size={20} weight="duotone" /> },
  { key: "travel", label: "여행", icon: <Airplane size={20} weight="duotone" /> },
  { key: "hobby", label: "취미", icon: <GameController size={20} weight="duotone" /> },
  { key: "gov", label: "정부지원", icon: <Buildings size={20} weight="duotone" /> },
];

type InfoRow = typeof infoContents.$inferSelect;

function ArticleCard({ article }: { article: InfoRow }) {
  const summary = article.summaryBox ?? article.content.slice(0, 80);
  const tags = article.tags ?? [];
  return (
    <Link href={`/info/${article.id}`} className="block">
      <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="p-5">
          <h3 className="text-lg font-extrabold text-mocha-900 leading-snug tracking-tight line-clamp-2">
            {article.title}
          </h3>
          <p className="mt-2 text-base text-mocha-700 leading-relaxed line-clamp-2">{summary}</p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-mocha-100 pt-3">
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-base font-semibold text-mocha-700">
              <span className="inline-flex items-center gap-1">
                <Eye size={18} weight="duotone" />
                {article.viewCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp size={18} weight="duotone" className="text-coral-500" />
                {article.likeCount ?? 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function InfoPage() {
  // P2: 페이지네이션/무한스크롤로 교체 예정. 현재는 limit 100으로 단순 fetch.
  const articles = await db
    .select()
    .from(infoContents)
    .orderBy(desc(infoContents.createdAt))
    .limit(100);

  return (
    <div className="space-y-5 p-5">
      <div className="pt-2">
        <h1 className="text-3xl font-extrabold text-mocha-900 tracking-tight">정보</h1>
        <p className="mt-2 text-lg text-mocha-700">시니어를 위한 유용한 정보를 모았어요</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">전체</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key}>
              {cat.icon}
              <span className="ml-1.5">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="stagger-children space-y-3">
          {articles.length === 0 ? (
            <p className="text-center text-mocha-500 py-12">아직 등록된 콘텐츠가 없어요</p>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="animate-fade-up">
                <ArticleCard article={article} />
              </div>
            ))
          )}
        </TabsContent>

        {categories.map((cat) => {
          const filtered = articles.filter((a) => a.category === cat.key);
          return (
            <TabsContent key={cat.key} value={cat.key} className="stagger-children space-y-3">
              {filtered.length === 0 ? (
                <p className="text-center text-mocha-500 py-12">
                  {cat.label} 카테고리에 콘텐츠가 없어요
                </p>
              ) : (
                filtered.map((article) => (
                  <div key={article.id} className="animate-fade-up">
                    <ArticleCard article={article} />
                  </div>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
