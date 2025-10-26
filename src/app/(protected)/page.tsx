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
  const [selectedTodayUserId, setSelectedTodayUserId] = useState<string | null>(null);
  const [selectedTomorrowUserId, setSelectedTomorrowUserId] = useState<string | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const todayIso = useMemo(() => formatISODate(today), [today]);
  const tomorrow = useMemo(() => {
    const next = addDays(today, 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }, [today]);
  const tomorrowIso = useMemo(() => formatISODate(tomorrow), [tomorrow]);

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
    if (dates.length === 0) {
      return;
    }

    const weekStartDateObj = dates[0]?.date ?? today;
    const weekEndDateObj = dates[dates.length - 1]?.date ?? today;

    const startDate = [weekStartDateObj, today, tomorrow].reduce((min, current) =>
      current < min ? current : min,
    );
    const endDate = [weekEndDateObj, today, tomorrow].reduce((max, current) =>
      current > max ? current : max,
    );

    const startIso = formatISODate(startDate);
    const endIso = formatISODate(endDate);

    const unsubscribe = subscribeReservationsByDateRange(startIso, endIso, setReservations);

    return () => unsubscribe();
  }, [dates, today, tomorrow]);

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

  const timeSlotOrder = useMemo(() => {
    const entries = TIME_SLOTS.map((slot, index) => [slot.key, index] as const);
    return Object.fromEntries(entries) as Record<TimeSlotKey, number>;
  }, []);

  const getTimeSlotShortLabel = useMemo(() => {
    const map = new Map<TimeSlotKey, string>();
    TIME_SLOTS.forEach((slot) => {
      const [firstLine] = slot.label.split("\n");
      map.set(slot.key, firstLine);
    });
    return (slotKey: TimeSlotKey) => map.get(slotKey) ?? slotKey;
  }, []);

  const aggregateUsers = useMemo(() => {
    const aggregate = new Map<
      string,
      {
        userId: string;
        userName: string;
        userAvatarUrl: string;
        reservations: ReservationRecord[];
        date: string;
      }
    >();

    Object.entries(reservations).forEach(([key, list]) => {
      if (!key.startsWith(`${todayIso}_`) && !key.startsWith(`${tomorrowIso}_`)) {
        return;
      }
      list.forEach((item) => {
        const aggregateKey = `${item.date}_${item.userId}`;
        const existing = aggregate.get(aggregateKey) ?? {
          userId: item.userId,
          userName: item.userName,
          userAvatarUrl: item.userAvatarUrl ?? "",
          reservations: [],
          date: item.date,
        };
        existing.reservations.push(item);
        aggregate.set(aggregateKey, existing);
      });
    });

    return Array.from(aggregate.values())
      .map((entry) => ({
        ...entry,
        reservations: entry.reservations.sort((a, b) => {
          if (a.space !== b.space) {
            return SPACES[a.space].label.localeCompare(SPACES[b.space].label, "ja");
          }
          return timeSlotOrder[a.timeSlot] - timeSlotOrder[b.timeSlot];
        }),
      }))
      .sort((a, b) => a.userName.localeCompare(b.userName, "ja"));
  }, [reservations, todayIso, tomorrowIso, timeSlotOrder]);

  const todaysUsers = useMemo(
    () => aggregateUsers.filter((item) => item.date === todayIso),
    [aggregateUsers, todayIso],
  );
  const tomorrowsUsers = useMemo(
    () => aggregateUsers.filter((item) => item.date === tomorrowIso),
    [aggregateUsers, tomorrowIso],
  );

  const selectedTodayUser = selectedTodayUserId
    ? todaysUsers.find((user) => user.userId === selectedTodayUserId) ?? null
    : null;

  const selectedTomorrowUser = selectedTomorrowUserId
    ? tomorrowsUsers.find((user) => user.userId === selectedTomorrowUserId) ?? null
    : null;

  useEffect(() => {
    if (selectedTodayUserId && !selectedTodayUser) {
      setSelectedTodayUserId(null);
    }
  }, [selectedTodayUserId, selectedTodayUser]);

  useEffect(() => {
    if (selectedTomorrowUserId && !selectedTomorrowUser) {
      setSelectedTomorrowUserId(null);
    }
  }, [selectedTomorrowUserId, selectedTomorrowUser]);

  const toggleSelectTodayUser = (userId: string) => {
    setSelectedTodayUserId((current) => (current === userId ? null : userId));
  };

  const toggleSelectTomorrowUser = (userId: string) => {
    setSelectedTomorrowUserId((current) => (current === userId ? null : userId));
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

  const renderCell = (
    isoDate: string,
    slotKey: TimeSlotKey,
    options?: { compact?: boolean },
  ) => {
    const compact = options?.compact ?? false;
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
      "flex items-center justify-center rounded-md border transition",
      compact ? "h-12 w-12 text-base" : "h-14 w-full",
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
      <div className={`flex flex-col items-center ${compact ? "gap-1" : ""}`}>
        <button
          type="button"
          disabled={(isReservedByOther && !isMine) || isUpdating}
          onClick={() => handleToggle(isoDate, slotKey)}
          className={buttonClass}
        >
          <span className="text-lg font-semibold">{label}</span>
        </button>
        {sortedReservations.length > 0 && (
          <div className={`flex flex-wrap justify-center gap-2 ${compact ? "" : "mt-2"}`}>
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
                  size={compact ? 24 : 32}
                  title={item.userName}
                />
                {item.comment && (
                  <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                    <ChatBubbleLeftEllipsisIcon className="h-2.5 w-2.5" aria-hidden="true" />
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
    <div className="space-y-6 sm:space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 sm:flex-row sm:items-stretch">
        <div className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm sm:flex sm:flex-col sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-700">今日</h2>
            {todaysUsers.length === 0 ? (
              <p className="text-sm text-slate-500">利用予定はありません。</p>
            ) : (
              todaysUsers.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => toggleSelectTodayUser(user.userId)}
                  className={`relative rounded-full transition ${
                    selectedTodayUserId === user.userId
                      ? "ring-2 ring-blue-400"
                      : "ring-1 ring-transparent hover:ring-blue-200"
                  }`}
                >
                  <Avatar
                    src={user.userAvatarUrl}
                    fallback={getInitial(user.userName)}
                    size={24}
                    title={user.userName}
                  />
                </button>
              ))
            )}
          </div>

          {selectedTodayUser && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
              <p className="text-sm font-medium text-blue-900">
                {selectedTodayUser.userName} の利用予定
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTodayUser.reservations.map((item) => (
                  <span
                    key={`${item.date}_${item.space}_${item.timeSlot}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-800 shadow"
                  >
                    <span>{SPACES[item.space].label}</span>
                    <span className="text-blue-500">/</span>
                    <span>{getTimeSlotShortLabel(item.timeSlot)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm sm:flex sm:flex-col sm:justify-center">
          <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2">
            <h2 className="text-sm font-semibold text-slate-700">明日</h2>
            {tomorrowsUsers.length === 0 ? (
              <p className="text-sm text-slate-500">利用予定はありません。</p>
            ) : (
              tomorrowsUsers.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => toggleSelectTomorrowUser(user.userId)}
                  className={`relative rounded-full transition ${
                    selectedTomorrowUserId === user.userId
                      ? "ring-2 ring-blue-400"
                      : "ring-1 ring-transparent hover:ring-blue-200"
                  }`}
                >
                  <Avatar
                    src={user.userAvatarUrl}
                    fallback={getInitial(user.userName)}
                    size={24}
                    title={user.userName}
                  />
                </button>
              ))
            )}
          </div>

          {selectedTomorrowUser && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
              <p className="text-sm font-medium text-blue-900">
                {selectedTomorrowUser.userName} の明日の利用予定
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTomorrowUser.reservations.map((item) => (
                  <span
                    key={`${item.date}_${item.space}_${item.timeSlot}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-800 shadow"
                  >
                    <span>{SPACES[item.space].label}</span>
                    <span className="text-blue-500">/</span>
                    <span>{getTimeSlotShortLabel(item.timeSlot)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

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

      <div className="hidden overflow-x-auto sm:block">
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

      <div className="sm:hidden">
        <div className="min-w-[360px] rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[64px_repeat(4,_minmax(0,_1fr))] border-b border-slate-100 bg-slate-100/60 text-xs font-medium text-slate-600">
            <div className="flex items-center justify-center border-r border-slate-100 py-1.5 text-slate-700">
              日付
            </div>
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.key}
                className="flex flex-col items-center justify-center gap-1 border-r border-slate-100 px-0.5 py-1 text-center last-border-r-0"
              >
                <span className="text-sm">
                  {slot.label.split("\n")[0].replace(/午後1/g, "午後１").replace(/午後2/g, "午後２")}
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkReserve(slot.key)}
                  disabled={isUpdating}
                  className="rounded-full border border-slate-200 px-1 py-0.5 text-[10px] font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  月金
                </button>
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-100 text-sm text-slate-700">
            {dates.map((item) => (
              <div key={item.iso} className="grid grid-cols-[64px_repeat(4,_minmax(0,_1fr))]">
                <div className="flex items-center justify-center border-r border-slate-100 px-0.5 py-1 text-xs font-medium text-slate-700">
                  <span className="text-left">{item.label.replace(/\s/g, "")}</span>
                </div>
                {TIME_SLOTS.map((slot) => (
                  <div key={slot.key} className="border-r border-slate-100 px-0.5 py-1.5 last:border-r-0">
                    {renderCell(item.iso, slot.key, { compact: true })}
                  </div>
                ))}
              </div>
            ))}
          </div>
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
