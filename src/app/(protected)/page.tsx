'use client';

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { SPACES, TIME_SLOTS, type SpaceKey, type TimeSlotKey } from "@/constants/schedule";
import { addDays, formatDisplayDate, formatISODate, startOfWeek } from "@/utils/date";
import {
  reservationCellKey,
  subscribeReservationsByDateRange,
  toggleReservation,
  setReservationComment,
  clearReservationComment,
  type ReservationMap,
  type ReservationRecord,
} from "@/services/reservations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Avatar } from "@/components/common/Avatar";

const heroIcon = {
  prev: <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />,
  next: <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />,
};

function buildSpaceOrder(preferredRoom: SpaceKey | null): SpaceKey[] {
  const defaultOrder: SpaceKey[] = ["front", "back", "living"];

  if (!preferredRoom) {
    return defaultOrder;
  }

  if (preferredRoom === "living") {
    return ["living", "front", "back"];
  }

  const others = defaultOrder.filter((space) => space !== preferredRoom && space !== "living");
  return [preferredRoom, "living", ...others];
}

function getInitial(name: string) {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

export default function Home() {
  const { userProfile, isLoading } = useUserProfile();
  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeek(new Date()));
  const [reservations, setReservations] = useState<ReservationMap>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSpace, setActiveSpace] = useState<SpaceKey>("front");
  const [isUpdating, setIsUpdating] = useState(false);
  const [commentTarget, setCommentTarget] = useState<
    | {
        reservation: ReservationRecord;
        isOwner: boolean;
      }
    | null
  >(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommentSaving, setIsCommentSaving] = useState(false);

  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStartDate, index);
      return {
        date,
        iso: formatISODate(date),
        label: formatDisplayDate(date),
      };
    });
  }, [weekStartDate]);

  const spaceOrder = useMemo(() => buildSpaceOrder(userProfile?.preferredRoom ?? null), [
    userProfile?.preferredRoom,
  ]);

  useEffect(() => {
    setActiveSpace(spaceOrder[0] ?? "front");
  }, [spaceOrder]);

  useEffect(() => {
    const startIso = dates[0]?.iso;
    const endIso = dates[dates.length - 1]?.iso;

    if (!startIso || !endIso) {
      return;
    }

    const unsubscribe = subscribeReservationsByDateRange(startIso, endIso, setReservations);

    return () => unsubscribe();
  }, [dates]);

  const handleBulkReserve = async (slotKey: TimeSlotKey) => {
    if (!userProfile) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const weekdays = dates.slice(0, 5); // Monday - Friday

      let blockedCount = 0;

      const tasks = weekdays.map(async (day) => {
        const cellKey = reservationCellKey(day.iso, activeSpace, slotKey);
        const slotReservations = reservations[cellKey] ?? [];
        const isMine = slotReservations.some((item) => item.userId === userProfile.uid);
        const hasOther = slotReservations.some((item) => item.userId !== userProfile.uid);
        const isSharedSpace = activeSpace === "front" || activeSpace === "back";

        // If already reserved by user -> remove reservation
        if (isMine) {
          const result = await toggleReservation({
            date: day.iso,
            space: activeSpace,
            timeSlot: slotKey,
            user: userProfile,
          });

          if (result === "blocked") {
            blockedCount += 1;
          }

          return;
        }

        // If space is exclusive and another user has booked, skip
        if (!isSharedSpace && hasOther) {
          blockedCount += 1;
          return;
        }

        const result = await toggleReservation({
          date: day.iso,
          space: activeSpace,
          timeSlot: slotKey,
          user: userProfile,
        });

        if (result === "blocked") {
          blockedCount += 1;
        }
      });

      await Promise.all(tasks);

      if (blockedCount > 0) {
        setErrorMessage("一部の枠は他会員が予約済みのためスキップしました");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "月〜金の予約に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggle = async (isoDate: string, timeSlot: TimeSlotKey) => {
    if (!userProfile) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const result = await toggleReservation({
        date: isoDate,
        space: activeSpace,
        timeSlot,
        user: userProfile,
      });

      if (result === "blocked") {
        setErrorMessage("他の会員がすでに予約しています");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "予約操作に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const changeWeek = (offset: number) => {
    const newDate = addDays(weekStartDate, offset * 7);
    setWeekStartDate(startOfWeek(newDate));
  };

  const openCommentModal = (reservation: ReservationRecord) => {
    const isOwner = reservation.userId === userProfile?.uid;
    setCommentTarget({ reservation, isOwner });
    setCommentDraft(reservation.comment ?? "");
  };

  const closeCommentModal = () => {
    setCommentTarget(null);
    setCommentDraft("");
    setIsCommentSaving(false);
  };

  const handleCommentSave = async () => {
    if (!commentTarget || !commentTarget.isOwner) {
      return;
    }

    setIsCommentSaving(true);
    try {
      const trimmed = commentDraft.trim();
      if (trimmed.length === 0) {
        await clearReservationComment(commentTarget.reservation.id);
      } else {
        await setReservationComment({
          reservationId: commentTarget.reservation.id,
          comment: trimmed,
        });
      }
      closeCommentModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "コメントの保存に失敗しました";
      setErrorMessage(message);
      setIsCommentSaving(false);
    }
  };

  const handleCommentDelete = async () => {
    if (!commentTarget || !commentTarget.isOwner) {
      return;
    }

    setIsCommentSaving(true);
    try {
      await clearReservationComment(commentTarget.reservation.id);
      closeCommentModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "コメントの削除に失敗しました";
      setErrorMessage(message);
      setIsCommentSaving(false);
    }
  };

  const renderCell = (isoDate: string, slotKey: TimeSlotKey) => {
    const cellKey = reservationCellKey(isoDate, activeSpace, slotKey);
    const slotReservations = reservations[cellKey] ?? [];
    const sortedReservations = [...slotReservations].sort((a, b) => {
      const aIsMine = a.userId === userProfile?.uid ? 1 : 0;
      const bIsMine = b.userId === userProfile?.uid ? 1 : 0;
      return bIsMine - aIsMine;
    });
    const isMine = slotReservations.some((item) => item.userId === userProfile?.uid);
    const otherReservations = slotReservations.filter((item) => item.userId !== userProfile?.uid);
    const isSharedSpace = activeSpace === "front" || activeSpace === "back";
    const isReservedByOther = !isSharedSpace && otherReservations.length > 0;

    const buttonClass = [
      "flex h-14 w-full items-center justify-center rounded-md border transition",
      isMine
        ? "border-blue-500 bg-blue-100 text-blue-700"
        : isReservedByOther
          ? "border-slate-200 bg-slate-100 text-slate-400"
          : otherReservations.length > 0
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:bg-blue-50",
    ].join(" ");

    const label = (() => {
      if (isMine) {
        return "○";
      }
      if (isReservedByOther) {
        return "×";
      }
      if (slotReservations.length > 0) {
        return `${slotReservations.length}`;
      }
      return "―";
    })();

    return (
      <div className="flex flex-col items-center">
        <button
          type="button"
          disabled={(isReservedByOther && !isMine) || isUpdating}
          onClick={() => handleToggle(isoDate, slotKey)}
          className={buttonClass}
        >
          <span className="text-lg font-semibold">{label}</span>
        </button>
        {sortedReservations.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {sortedReservations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openCommentModal(item)}
                className="relative"
              >
                <Avatar
                  src={item.userAvatarUrl ?? ""}
                  fallback={getInitial(item.userName)}
                  size={32}
                  title={item.userName}
                />
                {item.comment && (
                  <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                    <ChatBubbleLeftEllipsisIcon className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading || !userProfile) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-slate-600">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">利用予定</h2>
          <p className="text-sm text-slate-500">時間帯をタップして予約を切り替えます。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeWeek(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
          >
            {heroIcon.prev}
          </button>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            {`${dates[0]?.label ?? ""} 〜 ${dates[dates.length - 1]?.label ?? ""}`}
          </div>
          <button
            type="button"
            onClick={() => changeWeek(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
          >
            {heroIcon.next}
          </button>
        </div>
      </header>

      <div className="flex gap-3">
        {spaceOrder.map((spaceKey) => (
          <button
            key={spaceKey}
            type="button"
            onClick={() => setActiveSpace(spaceKey)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeSpace === spaceKey
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            {SPACES[spaceKey].label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px] rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[150px_repeat(7,_1fr)] border-b border-slate-100 bg-slate-100/40 text-sm font-medium text-slate-600">
            <div className="flex items-center justify-center border-r border-slate-100 py-3">時間帯</div>
            {dates.map((item) => (
              <div key={item.iso} className="flex items-center justify-center border-r border-slate-100 py-3 last:border-r-0">
                {item.label}
              </div>
            ))}
          </div>
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot.key}
              className="grid grid-cols-[150px_repeat(7,_1fr)] border-b border-slate-100 last:border-b-0"
            >
              <div className="flex flex-col items-center justify-center gap-3 border-r border-slate-100 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600">
                <span className="block leading-tight whitespace-pre-line text-center">
                  {slot.label.replace(/午後1/g, "午後１").replace(/午後2/g, "午後２")}
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkReserve(slot.key)}
                  disabled={isUpdating}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  月金利用
                </button>
              </div>
              {dates.map((item) => (
                <div
                  key={`${item.iso}-${slot.key}`}
                  className="border-r border-slate-100 px-2 py-2 last:border-r-0"
                >
                  {renderCell(item.iso, slot.key)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {commentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{commentTarget.reservation.userName}</p>
                <p className="text-xs text-slate-400">
                  {commentTarget.reservation.date} / {SPACES[commentTarget.reservation.space].label}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCommentModal}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600"
              >
                閉じる
              </button>
            </div>
            {commentTarget.isOwner ? (
              <div className="space-y-4">
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
                  placeholder="コメントを入力してください"
                  disabled={isCommentSaving}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleCommentDelete}
                    disabled={isCommentSaving || !commentTarget.reservation.comment}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    コメント削除
                  </button>
                  <button
                    type="button"
                    onClick={handleCommentSave}
                    disabled={isCommentSaving}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isCommentSaving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {commentTarget.reservation.comment ?? "コメントはありません"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
