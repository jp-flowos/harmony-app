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
  { key: "health", label: "건강", icon: <Heart size={20} /> },
  { key: "finance", label: "재테크", icon: <CurrencyCircleDollar size={20} /> },
  { key: "travel", label: "여행", icon: <Airplane size={20} /> },
  { key: "hobby", label: "취미", icon: <GameController size={20} /> },
  { key: "gov", label: "정부지원", icon: <Buildings size={20} /> },
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
    date: "2024-03-01",
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
    date: "2024-02-28",
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
    date: "2024-03-02",
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
    date: "2024-02-25",
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
    date: "2024-03-03",
  },
  {
    id: "i6",
    category: "gov",
    title: "2024년 시니어 지원 정책 총정리",
    summary: "노인일자리, 돌봄서비스, 주거지원 등 핵심 정책을 정리했습니다.",
    author: "정책알리미",
    views: 3200,
    likes: 234,
    tags: ["정부지원", "복지"],
    date: "2024-02-20",
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
    date: "2024-01-15",
  },
];

function ArticleCard({ article }: { article: InfoArticle }) {
  return (
    <Link href={`/info/${article.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{article.title}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{article.summary}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {article.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {article.views}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp size={14} />
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
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-gray-900">정보</h1>
      <p className="text-base text-gray-500">시니어를 위한 유용한 정보를 모았어요</p>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">전체</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key}>
              {cat.icon}
              <span className="ml-1">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </TabsContent>

        {categories.map((cat) => (
          <TabsContent key={cat.key} value={cat.key} className="space-y-3 mt-3">
            {articles
              .filter((a) => a.category === cat.key)
              .map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
