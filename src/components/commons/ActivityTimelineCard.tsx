'use client';

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChatBubbleLeftIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
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
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
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
    return null;
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
      }, 300);
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
    <article className="mx-auto flex w-full max-w-[600px] flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <Avatar
          src={logState.user.avatarUrl}
          name={logState.user.displayName}
          size={30}
          className="h-[30px] w-[30px]"
          disableInlineSize
        />
        <span className="text-sm font-semibold text-slate-900">
          {logState.user.displayName || "名前未設定"}
        </span>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <ActivityIconBadge iconId={logState.definitionIconId} size="lg" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                {logState.definitionTitle}
              </h3>
              {optionLabels && (
                <span className="text-sm text-slate-500">{optionLabels}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>{executedAtLabel}</span>
              {isMine && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="rounded-md border border-transparent p-1 text-slate-400 transition hover:border-slate-300 hover:text-blue-600"
                    aria-label="アクティビティを編集"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-md border border-transparent p-1 text-slate-400 transition hover:border-slate-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="アクティビティを削除"
                    disabled={isDeleting}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
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
      </div>

      {errorMessage && <div className="px-2 text-xs text-rose-500">{errorMessage}</div>}

      <div className="flex items-center gap-4 px-2">
        <button
          type="button"
          onClick={handleThanks}
          className={clsx(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow transition",
            isThanksAnimating ? "scale-105 bg-rose-500" : "bg-rose-600 hover:bg-rose-700",
            (isThanksCoolingDown || isMine) && "cursor-not-allowed opacity-60 hover:bg-rose-600",
          )}
          disabled={isThanksCoolingDown || isMine}
        >
          Thanks! {logState.thanksCount}
        </button>
        <button
          type="button"
          onClick={() => setIsCommentModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
        >
          <ChatBubbleLeftIcon className="h-4 w-4" />
          {logState.commentCount}
        </button>
      </div>

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

      {isCommentModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[280] flex items-center justify-center bg-black/60 px-4 py-6"
              role="dialog"
              aria-modal="true"
              onClick={() => setIsCommentModalOpen(false)}
            >
              <div
                className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">コメント</h2>
                  <button
                    type="button"
                    onClick={() => setIsCommentModalOpen(false)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    閉じる
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <ActivityCommentSection
                    logId={logState.id}
                    currentUser={currentUser}
                    onCountChange={handleCommentCountChange}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
