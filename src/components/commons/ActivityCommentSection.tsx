'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/common/Avatar";
import {
  createActivityComment,
  deleteActivityComment,
  listenActivityComments,
  updateActivityComment,
} from "@/services/commons";
import type { ActivityComment } from "@/types/commons";
import type { AppUser } from "@/types/user";

type ActivityCommentSectionProps = {
  logId: string;
  currentUser: AppUser | null;
  onCountChange?: (count: number) => void;
};

function formatCommentTimestamp(date: Date | null) {
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ActivityCommentSection({
  logId,
  currentUser,
  onCountChange,
}: ActivityCommentSectionProps) {
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [processingCommentId, setProcessingCommentId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenActivityComments(logId, (list) => {
      setComments(list);
      onCountChange?.(list.length);
    });
    return () => unsubscribe();
  }, [logId, onCountChange]);

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setErrorMessage("コメントを入力してください");
      return;
    }
    if (!currentUser) {
      setErrorMessage("ログイン情報を確認できません");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createActivityComment({
        logId,
        input: { body: trimmed },
        user: currentUser,
      });
      setDraft("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "コメントの投稿に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginEdit = useCallback((comment: ActivityComment) => {
    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
    setErrorMessage(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditDraft("");
    setErrorMessage(null);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!editingCommentId) {
      return;
    }
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setErrorMessage("コメントを入力してください");
      return;
    }
    if (!currentUser) {
      setErrorMessage("ログイン情報を確認できません");
      return;
    }
    setProcessingCommentId(editingCommentId);
    setErrorMessage(null);
    try {
      await updateActivityComment({
        logId,
        commentId: editingCommentId,
        input: { body: trimmed },
        user: currentUser,
      });
      setEditingCommentId(null);
      setEditDraft("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "コメントの更新に失敗しました";
      setErrorMessage(message);
    } finally {
      setProcessingCommentId(null);
    }
  }, [currentUser, editDraft, editingCommentId, logId]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!currentUser) {
        setErrorMessage("ログイン情報を確認できません");
        return;
      }
      const confirmed = window.confirm("コメントを削除しますか？");
      if (!confirmed) {
        return;
      }
      setProcessingCommentId(commentId);
      setErrorMessage(null);
      try {
        await deleteActivityComment({
          logId,
          commentId,
          user: currentUser,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "コメントの削除に失敗しました";
        setErrorMessage(message);
      } finally {
        setProcessingCommentId(null);
      }
    },
    [currentUser, logId],
  );

  const commentList = useMemo(
    () =>
      comments.map((comment) => {
        const isMine = currentUser?.uid === comment.user.userId;
        const isEditing = editingCommentId === comment.id;
        return (
          <li key={comment.id} className="flex gap-3 rounded-xl bg-slate-50 p-3">
            <Avatar src={comment.user.avatarUrl} name={comment.user.displayName} className="h-9 w-9" />
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">
                  {comment.user.displayName || "名前未設定"}
                </span>
                <span className="text-xs text-slate-400">
                  {formatCommentTimestamp(comment.createdAt)}
                </span>
              </div>
              {isEditing ? (
                <div className="grid gap-2">
                  <textarea
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={processingCommentId === comment.id}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUpdate}
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold text-white",
                        processingCommentId === comment.id
                          ? "bg-blue-300"
                          : "bg-blue-600 hover:bg-blue-700",
                      )}
                      disabled={processingCommentId === comment.id}
                    >
                      {processingCommentId === comment.id ? "更新中..." : "更新"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"
                      disabled={processingCommentId === comment.id}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
              )}
              {isMine && !isEditing && (
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => beginEdit(comment)}
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="font-medium text-rose-600 hover:text-rose-700"
                    disabled={processingCommentId === comment.id}
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      }),
    [
      comments,
      currentUser?.uid,
      editingCommentId,
      editDraft,
      processingCommentId,
      beginEdit,
      cancelEdit,
      handleUpdate,
      handleDelete,
    ],
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <Avatar src={currentUser?.photoURL ?? ""} name={currentUser?.nickname ?? currentUser?.displayName ?? ""} className="h-9 w-9" />
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={1}
            placeholder="コメントを入力..."
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            disabled={isSubmitting}
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-semibold text-white",
            isSubmitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700",
          )}
          disabled={isSubmitting}
        >
          {isSubmitting ? "送信中" : "送信"}
        </button>
      </div>
      {errorMessage && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{errorMessage}</p>
      )}
      {commentList.length > 0 ? (
        <ul className="space-y-3">{commentList}</ul>
      ) : (
        <p className="text-sm text-slate-500">コメントはまだありません。</p>
      )}
    </div>
  );
}
