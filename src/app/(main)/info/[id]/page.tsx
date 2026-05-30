import { ArrowLeft, Eye, Share, ThumbsUp } from "@phosphor-icons/react/dist/ssr";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { infoContents } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { InfoComments } from "./InfoComments";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  health: "건강",
  finance: "재테크",
  travel: "여행",
  hobby: "취미",
  gov: "정부지원",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InfoDetailPage({ params }: Props) {
  const { id } = await params;

  const [article] = await db.select().from(infoContents).where(eq(infoContents.id, id)).limit(1);
  if (!article) notFound();

  db.update(infoContents)
    .set({ viewCount: sql`${infoContents.viewCount} + 1` })
    .where(eq(infoContents.id, id))
    .catch((err) => console.error("[info/[id] viewCount]", err));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tags = article.tags ?? [];
  const date = article.createdAt ? new Date(article.createdAt).toLocaleDateString("ko-KR") : "";

  return (
    <div className="space-y-4 p-4">
      <Link
        href="/info"
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        목록으로
      </Link>

      <article>
        <Badge className="mb-2">{CATEGORY_LABEL[article.category] ?? article.category}</Badge>
        <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
          {article.author && <span>{article.author}</span>}
          <span>{date}</span>
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {article.viewCount ?? 0}
          </span>
        </div>

        <div className="mt-6 prose prose-gray max-w-none">
          {article.content.split("\n").map((line, i) => {
            const key = `line-${i}`;
            if (line.startsWith("### "))
              return (
                <h3 key={key} className="text-lg font-semibold text-gray-900 mt-4">
                  {line.replace("### ", "")}
                </h3>
              );
            if (line.startsWith("## "))
              return (
                <h2 key={key} className="text-xl font-bold text-gray-900 mt-6">
                  {line.replace("## ", "")}
                </h2>
              );
            if (line.startsWith("- "))
              return (
                <p key={key} className="text-base text-gray-700 ml-4">
                  • {line.replace("- ", "")}
                </p>
              );
            if (line.trim() === "") return <br key={key} />;
            return (
              <p key={key} className="text-base text-gray-700">
                {line}
              </p>
            );
          })}
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" size="sm" disabled aria-disabled="true">
            <ThumbsUp size={16} className="mr-1" />
            {article.likeCount ?? 0}
          </Button>
          <Button variant="outline" size="sm">
            <Share size={16} className="mr-1" />
            공유
          </Button>
        </div>
      </article>

      <InfoComments contentId={article.id} currentUserId={user?.id ?? null} />
    </div>
  );
}
