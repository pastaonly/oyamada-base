'use client';

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    setIsMenuOpen(false);
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

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleEditMenuClick = () => {
    setIsMenuOpen(false);
    setIsEditorOpen(true);
  };

  return (
    <article className="mx-auto flex w-full max-w-[600px] flex-col gap-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <ActivityIconBadge iconId={logState.definitionIconId} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium text-slate-900 mt-[5px] mb-[-2px]">
                  {executedAtLabel}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {logState.definitionTitle}
                  </h3>
                  {optionLabels && (
                    <span className="text-sm text-slate-500">{optionLabels}</span>
                  )}
                </div>
              </div>
              {isMine && (
                <div className="relative">
                  <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-300 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="アクティビティメニューを開く"
                    aria-expanded={isMenuOpen}
                    aria-haspopup="menu"
                  >
                    <EllipsisHorizontalIcon className="h-5 w-5" />
                  </button>
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      role="menu"
                      className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 text-sm text-slate-700 shadow-lg ring-1 ring-black/5"
                    >
                      <button
                        type="button"
                        onClick={handleEditMenuClick}
                        role="menuitem"
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-slate-100"
                      >
                        編集
                        <PencilSquareIcon className="h-4 w-4 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        role="menuitem"
                        disabled={isDeleting}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        削除
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setIsPhotoOpen(true)}
              className="relative block h-52 w-full transition hover:shadow-lg"
            >
              <Image
                src={logState.photo.thumbnailUrl}
                alt={`${logState.definitionTitle} の写真`}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 480px, 100vw"
                unoptimized
              />
            </button>
          </div>
        )}
      </div>

      {errorMessage && <div className="px-2 text-xs text-rose-500">{errorMessage}</div>}

      <div className="flex flex-wrap items-center gap-2 px-2">
        <div className="flex items-center gap-1.5">
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
          <button
            type="button"
            onClick={handleThanks}
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-rose-600 transition",
              isThanksAnimating ? "scale-105" : "hover:text-rose-700",
              (isThanksCoolingDown || isMine) && "cursor-not-allowed opacity-50",
            )}
            disabled={isThanksCoolingDown || isMine}
          >
            <HeartIcon className="h-5 w-5" />
            <span>{logState.thanksCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCommentModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-blue-600"
          >
            <ChatBubbleLeftIcon className="h-4 w-4" />
            {logState.commentCount}
          </button>
        </div>
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
