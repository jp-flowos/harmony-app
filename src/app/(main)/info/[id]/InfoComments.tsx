"use client";

import { ChatCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface CommentRow {
  id: string;
  content: string;
  userId: string | null;
  createdAt: string | null;
  authorNickname: string | null;
  authorAvatarUrl: string | null;
}

interface Props {
  contentId: string;
  currentUserId: string | null;
}

export function InfoComments({ contentId, currentUserId }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/info/${contentId}/comments`);
        const json = (await res.json()) as
          | { success: true; data: { comments: CommentRow[] } }
          | { success: false; error: { message: string } };
        if (cancelled) return;
        if (json.success) setComments(json.data.comments);
        else setError(json.error.message);
      } catch {
        if (!cancelled) setError("댓글을 불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const handleSubmit = async () => {
    const content = newComment.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/info/${contentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as
        | { success: true; data: CommentRow }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setComments((prev) => [...prev, json.data]);
      setNewComment("");
    } catch {
      setError("댓글을 등록하지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/info/${contentId}/comments/${id}`, { method: "DELETE" });
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("삭제에 실패했습니다");
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <ChatCircle size={20} />
          댓글 ({comments.length})
        </h3>

        {currentUserId ? (
          <div className="flex gap-2">
            <Textarea
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1"
              maxLength={1000}
            />
            <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || submitting}>
              {submitting ? "등록 중..." : "등록"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-mocha-500">댓글을 작성하려면 로그인이 필요합니다.</p>
        )}

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-mocha-500">댓글을 불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-mocha-500">첫 댓글을 남겨보세요.</p>
          ) : (
            comments.map((comment) => {
              const author = comment.authorNickname ?? "익명";
              const initial = author.charAt(0);
              const date = comment.createdAt
                ? new Date(comment.createdAt).toLocaleDateString("ko-KR")
                : "";
              const isMine = currentUserId !== null && comment.userId === currentUserId;
              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    {comment.authorAvatarUrl && (
                      <AvatarImage src={comment.authorAvatarUrl} alt={author} />
                    )}
                    <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{author}</span>
                      <span className="text-xs text-gray-400">{date}</span>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="ml-auto text-xs text-mocha-400 hover:text-[var(--color-danger)]"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
