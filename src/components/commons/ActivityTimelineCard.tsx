'use client';

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/common/Avatar";
import { ActivityIconBadge } from "@/components/commons/ActivityIconBadge";
import { ActivityCommentSection } from "@/components/commons/ActivityCommentSection";
import { ActivityEditorDialog } from "@/components/commons/ActivityEditorDialog";
import { deleteActivityLog, incrementActivityThanks } from "@/services/commons";
import type { ActivityDefinition, ActivityLog } from "@/types/commons";
import type { AppUser } from "@/types/user";
import { formatJapaneseMonthDay } from "@/utils/date";

type ActivityCardProps = {
  log: ActivityLog;
  currentUser: AppUser | null;
  onDeleted: (logId: string) => void;
  onRequestReload?: () => void;
  definitions: ActivityDefinition[];
};

function formatExecutedAt(date: Date) {
  return `${formatJapaneseMonthDay(date)} (${new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
  }).format(date)})`;
}

function ActivityPhotoModal({
  isOpen,
  onClose,
  imageUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}) {
  if (!isOpen) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative h-[80vh] w-full max-w-4xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={imageUrl}
          alt="アクティビティ写真"
          fill
          className="object-contain"
          sizes="100vw"
          unoptimized
        />
      </div>
    </div>
  );
}

export function ActivityCard({
  log,
  currentUser,
  onDeleted,
  onRequestReload,
  definitions,
}: ActivityCardProps) {
  const [logState, setLogState] = useState<ActivityLog>(log);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isThanksCoolingDown, setIsThanksCoolingDown] = useState(false);
  const [isThanksAnimating, setIsThanksAnimating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLogState(log);
  }, [log]);

  const isMine = currentUser?.uid === logState.user.userId;
  const executedAtLabel = useMemo(() => formatExecutedAt(logState.executedAt), [logState.executedAt]);
  const optionLabels = useMemo(() => {
    if (logState.optionLabels && logState.optionLabels.length > 0) {
      return logState.optionLabels.join("・");
    }
    return "オプションなし";
  }, [logState.optionLabels]);

  const handleThanks = async () => {
    if (isMine || isThanksCoolingDown) {
      return;
    }
    setIsThanksCoolingDown(true);
    setIsThanksAnimating(true);
    setLogState((prev) => ({
      ...prev,
      thanksCount: prev.thanksCount + 1,
    }));
    try {
      await incrementActivityThanks(logState.id);
    } catch (error) {
      setLogState((prev) => ({
        ...prev,
        thanksCount: Math.max(prev.thanksCount - 1, 0),
      }));
      const message =
        error instanceof Error ? error.message : "Thanks!の送信に失敗しました";
      setErrorMessage(message);
    } finally {
      setTimeout(() => {
        setIsThanksCoolingDown(false);
      }, 500);
      setTimeout(() => {
        setIsThanksAnimating(false);
      }, 400);
    }
  };

  const handleCommentCountChange = (count: number) => {
    setLogState((prev) => ({
      ...prev,
      commentCount: count,
    }));
  };

  const handleDelete = async () => {
    if (!currentUser) {
      return;
    }
    const confirmed = window.confirm("アクティビティを削除しますか？");
    if (!confirmed) {
      return;
    }
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteActivityLog(logState.id, currentUser);
      onDeleted(logState.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "アクティビティの削除に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    onRequestReload?.();
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <ActivityIconBadge iconId={logState.definitionIconId} size="lg" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">
              {logState.definitionTitle}
            </h3>
            <p className="text-sm text-slate-500">{optionLabels}</p>
            <p className="text-xs text-slate-400">{executedAtLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar
            src={logState.user.avatarUrl}
            name={logState.user.displayName}
            className="h-10 w-10"
          />
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">
              {logState.user.displayName || "名前未設定"}
            </p>
            <p className="text-xs text-slate-400">投稿者</p>
          </div>
        </div>
      </div>

      {logState.note && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {logState.note}
        </p>
      )}

      {logState.photo && (
        <button
          type="button"
          onClick={() => setIsPhotoOpen(true)}
          className="mt-4 block overflow-hidden rounded-2xl border border-slate-200 transition hover:shadow-lg"
        >
          <div className="relative h-52 w-full">
            <Image
              src={logState.photo.thumbnailUrl}
              alt={`${logState.definitionTitle} の写真`}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 480px, 100vw"
              unoptimized
            />
          </div>
        </button>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">{logState.thanksCount}</span>
          <span>Thanks!</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">{logState.commentCount}</span>
          <span>コメント</span>
        </div>
        {errorMessage && <span className="text-xs text-rose-500">{errorMessage}</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!isMine && (
          <button
            type="button"
            onClick={handleThanks}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold text-white shadow transition",
              isThanksAnimating ? "scale-105 bg-rose-500" : "bg-rose-600 hover:bg-rose-700",
            )}
            disabled={isThanksCoolingDown}
          >
            Thanks!
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsCommentOpen((prev) => !prev)}
          className={clsx(
            "rounded-full border px-4 py-2 text-sm font-semibold transition",
            isCommentOpen
              ? "border-blue-600 bg-blue-50 text-blue-600"
              : "border-slate-300 text-slate-600 hover:border-blue-300 hover:text-blue-600",
          )}
        >
          Comment
        </button>
        {isMine && (
          <>
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
            >
              編集
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 hover:border-rose-400 hover:text-rose-700"
              disabled={isDeleting}
            >
              {isDeleting ? "削除中..." : "削除"}
            </button>
          </>
        )}
      </div>

      {isCommentOpen && (
        <ActivityCommentSection
          logId={logState.id}
          currentUser={currentUser}
          onCountChange={handleCommentCountChange}
        />
      )}

      <ActivityPhotoModal
        isOpen={isPhotoOpen}
        onClose={() => setIsPhotoOpen(false)}
        imageUrl={logState.photo?.url ?? ""}
      />

      {currentUser && (
        <ActivityEditorDialog
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          log={logState}
          definitions={definitions}
          currentUser={currentUser}
          onUpdated={handleEditSuccess}
        />
      )}
    </article>
  );
}
