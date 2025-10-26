'use client';

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Avatar } from "@/components/common/Avatar";
import {
  DailyHighlightsSection,
  type HighlightedUser,
} from "@/components/schedule/DailyHighlightsSection";
import { DesktopScheduleGrid } from "@/components/schedule/DesktopScheduleGrid";
import { MobileScheduleGrid } from "@/components/schedule/MobileScheduleGrid";
import { ReservationCommentModal } from "@/components/schedule/ReservationCommentModal";
import { SpaceTabs } from "@/components/schedule/SpaceTabs";
import type { ScheduleDate } from "@/components/schedule/types";
import { SPACES, TIME_SLOTS, type SpaceKey, type TimeSlotKey } from "@/constants/schedule";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  clearReservationComment,
  reservationCellKey,
  setReservationComment,
  subscribeReservationsByDateRange,
  toggleReservation,
  type ReservationMap,
  type ReservationRecord,
} from "@/services/reservations";
import { addDays, formatDisplayDate, formatISODate, startOfWeek } from "@/utils/date";

const heroIcon = {
  prev: <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />,
  next: <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />,
};

const SPACE_DISPLAY_ORDER: SpaceKey[] = ["front", "back", "living"];
type HighlightedUserWithDate = HighlightedUser & { date: string };

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
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState<SpaceKey | null>(null);

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

  const scheduleDates = useMemo<ReadonlyArray<ScheduleDate>>(
    () => dates.map(({ iso, label }) => ({ iso, label })),
    [dates],
  );

  const effectivePreferredRoom = pendingFavorite ?? userProfile?.preferredRoom ?? null;
  const spaceOrder = SPACE_DISPLAY_ORDER;

  useEffect(() => {
    if (effectivePreferredRoom) {
      setActiveSpace(effectivePreferredRoom);
    }
  }, [effectivePreferredRoom]);

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

  const aggregateUsers = useMemo<HighlightedUserWithDate[]>(() => {
    const aggregate = new Map<string, HighlightedUserWithDate>();

    Object.entries(reservations).forEach(([key, list]) => {
      if (!key.startsWith(`${todayIso}_`) && !key.startsWith(`${tomorrowIso}_`)) {
        return;
      }
      list.forEach((item) => {
        const aggregateKey = `${item.date}_${item.userId}`;
        const existing = aggregate.get(aggregateKey);
        if (existing) {
          existing.reservations.push(item);
          return;
        }

        aggregate.set(aggregateKey, {
          date: item.date,
          userId: item.userId,
          userName: item.userName,
          userAvatarUrl: item.userAvatarUrl ?? "",
          reservations: [item],
        });
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

  const todaysUsers = useMemo<HighlightedUser[]>(
    () =>
      aggregateUsers
        .filter((item) => item.date === todayIso)
        .map((item) => {
          const { date, ...rest } = item;
          void date;
          return rest;
        }),
    [aggregateUsers, todayIso],
  );
  const tomorrowsUsers = useMemo<HighlightedUser[]>(
    () =>
      aggregateUsers
        .filter((item) => item.date === tomorrowIso)
        .map((item) => {
          const { date, ...rest } = item;
          void date;
          return rest;
        }),
    [aggregateUsers, tomorrowIso],
  );

  useEffect(() => {
    if (selectedTodayUserId && !todaysUsers.some((user) => user.userId === selectedTodayUserId)) {
      setSelectedTodayUserId(null);
    }
  }, [selectedTodayUserId, todaysUsers]);

  useEffect(() => {
    if (
      selectedTomorrowUserId &&
      !tomorrowsUsers.some((user) => user.userId === selectedTomorrowUserId)
    ) {
      setSelectedTomorrowUserId(null);
    }
  }, [selectedTomorrowUserId, tomorrowsUsers]);

  const toggleSelectTodayUser = (userId: string) => {
    setSelectedTodayUserId((current) => (current === userId ? null : userId));
  };

  const toggleSelectTomorrowUser = (userId: string) => {
    setSelectedTomorrowUserId((current) => (current === userId ? null : userId));
  };

  useEffect(() => {
    setPendingFavorite(null);
  }, [userProfile?.preferredRoom]);

  const handleFavoriteClick = async (room: SpaceKey) => {
    if (!userProfile || isUpdatingFavorite || effectivePreferredRoom === room) {
      return;
    }

    try {
      setPendingFavorite(room);
      setIsUpdatingFavorite(true);
      await setDoc(
        doc(db, "users", userProfile.uid),
        { preferredRoom: room },
        { merge: true },
      );
    } catch (error) {
      setPendingFavorite(null);
      const message = error instanceof Error ? error.message : "お気に入りの更新に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsUpdatingFavorite(false);
    }
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
        <DailyHighlightsSection
          title="今日"
          emptyMessage="利用予定はありません。"
          highlightLabel="の利用予定"
          users={todaysUsers}
          selectedUserId={selectedTodayUserId}
          onToggleSelect={toggleSelectTodayUser}
          getInitial={getInitial}
          getTimeSlotShortLabel={getTimeSlotShortLabel}
        />
        <DailyHighlightsSection
          title="明日"
          emptyMessage="利用予定はありません。"
          highlightLabel="の明日の利用予定"
          users={tomorrowsUsers}
          selectedUserId={selectedTomorrowUserId}
          onToggleSelect={toggleSelectTomorrowUser}
          getInitial={getInitial}
          getTimeSlotShortLabel={getTimeSlotShortLabel}
          layout="center"
        />
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

      <SpaceTabs
        spaces={spaceOrder}
        activeSpace={activeSpace}
        preferredSpace={effectivePreferredRoom}
        onSelect={setActiveSpace}
        onFavoriteClick={handleFavoriteClick}
        isFavoriteUpdating={isUpdatingFavorite}
      />

      <DesktopScheduleGrid
        dates={scheduleDates}
        timeSlots={TIME_SLOTS}
        isUpdating={isUpdating}
        onBulkReserve={handleBulkReserve}
        renderCell={renderCell}
      />

      <MobileScheduleGrid
        dates={scheduleDates}
        timeSlots={TIME_SLOTS}
        isUpdating={isUpdating}
        onBulkReserve={handleBulkReserve}
        renderCell={renderCell}
      />
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <ReservationCommentModal
        target={commentTarget}
        commentDraft={commentDraft}
        onChangeDraft={setCommentDraft}
        onClose={closeCommentModal}
        onSave={handleCommentSave}
        onDelete={handleCommentDelete}
        isSaving={isCommentSaving}
      />
    </div>
  );
}
