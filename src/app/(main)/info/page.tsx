import {
  Airplane,
  Buildings,
  CurrencyCircleDollar,
  Eye,
  GameController,
  Heart,
  ThumbsUp,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InfoCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const categories: InfoCategory[] = [
  { key: "health", label: "건강", icon: <Heart size={20} weight="duotone" /> },
  {
    key: "finance",
    label: "재테크",
    icon: <CurrencyCircleDollar size={20} weight="duotone" />,
  },
  { key: "travel", label: "여행", icon: <Airplane size={20} weight="duotone" /> },
  { key: "hobby", label: "취미", icon: <GameController size={20} weight="duotone" /> },
  { key: "gov", label: "정부지원", icon: <Buildings size={20} weight="duotone" /> },
];

interface InfoArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  author: string;
  views: number;
  likes: number;
  tags: string[];
  date: string;
}

const articles: InfoArticle[] = [
  {
    id: "i1",
    category: "health",
    title: "60대 이후 꼭 알아야 할 건강검진 항목",
    summary: "나이가 들수록 정기적인 건강검진이 중요합니다. 특히 60대 이후에는...",
    author: "건강지킴이",
    views: 1240,
    likes: 89,
    tags: ["건강검진", "시니어건강"],
    date: "2026-05-19",
  },
  {
    id: "i2",
    category: "health",
    title: "관절 건강을 위한 올바른 운동법",
    summary: "무릎과 허리 관절에 부담 없는 운동 방법을 알려드립니다.",
    author: "운동전문가",
    views: 980,
    likes: 67,
    tags: ["관절", "운동"],
    date: "2026-05-18",
  },
  {
    id: "i3",
    category: "finance",
    title: "퇴직 후 안정적인 재테크 전략 5가지",
    summary: "퇴직 후 안정적인 수입을 만들기 위한 실전 전략을 공유합니다.",
    author: "현명한투자",
    views: 2100,
    likes: 156,
    tags: ["재테크", "퇴직연금"],
    date: "2026-05-21",
  },
  {
    id: "i4",
    category: "travel",
    title: "시니어를 위한 국내 힐링 여행지 TOP 10",
    summary: "편안하고 접근성 좋은 국내 여행지를 소개합니다.",
    author: "여행에디터",
    views: 1560,
    likes: 112,
    tags: ["국내여행", "힐링"],
    date: "2026-05-15",
  },
  {
    id: "i5",
    category: "hobby",
    title: "초보자를 위한 파크골프 시작 가이드",
    summary: "파크골프의 기초부터 장비 선택까지 완벽 가이드.",
    author: "골프마스터",
    views: 870,
    likes: 45,
    tags: ["파크골프", "초보"],
    date: "2026-05-22",
  },
  {
    id: "i6",
    category: "gov",
    title: "2026년 시니어 지원 정책 총정리",
    summary: "노인일자리, 돌봄서비스, 주거지원 등 핵심 정책을 정리했습니다.",
    author: "정책알리미",
    views: 3200,
    likes: 234,
    tags: ["정부지원", "복지"],
    date: "2026-05-10",
  },
  {
    id: "i7",
    category: "gov",
    title: "기초연금 수급 자격과 신청 방법",
    summary: "기초연금 대상 여부 확인과 신청 절차를 안내합니다.",
    author: "정책알리미",
    views: 4500,
    likes: 312,
    tags: ["기초연금", "복지"],
    date: "2026-04-15",
  },
];

function ArticleCard({ article }: { article: InfoArticle }) {
  return (
    <Link href={`/info/${article.id}`} className="block">
      <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="p-5">
          <h3 className="text-lg font-extrabold text-mocha-900 leading-snug tracking-tight line-clamp-2">
            {article.title}
          </h3>
          <p className="mt-2 text-base text-mocha-700 leading-relaxed line-clamp-2">
            {article.summary}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-mocha-100 pt-3">
            <div className="flex flex-wrap gap-1">
              {article.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-base font-semibold text-mocha-700">
              <span className="inline-flex items-center gap-1">
                <Eye size={18} weight="duotone" />
                {article.views}
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp size={18} weight="duotone" className="text-coral-500" />
                {article.likes}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function InfoPage() {
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
          {articles.map((article) => (
            <div key={article.id} className="animate-fade-up">
              <ArticleCard article={article} />
            </div>
          ))}
        </TabsContent>

        {categories.map((cat) => (
          <TabsContent key={cat.key} value={cat.key} className="stagger-children space-y-3">
            {articles
              .filter((a) => a.category === cat.key)
              .map((article) => (
                <div key={article.id} className="animate-fade-up">
                  <ArticleCard article={article} />
                </div>
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
