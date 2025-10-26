'use client';

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { SPACES, TIME_SLOTS, type SpaceKey, type TimeSlotKey } from "@/constants/schedule";
import { addDays, formatDisplayDate, formatISODate, startOfWeek } from "@/utils/date";
import {
  reservationCellKey,
  subscribeReservationsByDateRange,
  toggleReservation,
  type ReservationMap,
} from "@/services/reservations";
import { useUserProfile } from "@/hooks/useUserProfile";

const heroIcon = {
  prev: (
    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
  ),
  next: (
    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
  ),
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

export default function Home() {
  const { userProfile, isLoading } = useUserProfile();
  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeek(new Date()));
  const [reservations, setReservations] = useState<ReservationMap>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSpace, setActiveSpace] = useState<SpaceKey>("front");
  const [isUpdating, setIsUpdating] = useState(false);

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

  const renderCell = (isoDate: string, slotKey: TimeSlotKey) => {
    const cellKey = reservationCellKey(isoDate, activeSpace, slotKey);
    const slotReservations = reservations[cellKey] ?? [];
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
        {slotReservations.length > 0 && (
          <p className="mt-2 max-w-[110px] truncate text-center text-xs text-slate-400">
            {slotReservations
              .map((item) => (item.userId === userProfile?.uid ? "あなた" : item.userName))
              .join(", ")}
          </p>
        )}
      </div>
    );
  };

  if (isLoading || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">利用予定</h1>
            <p className="text-sm text-slate-500">時間帯をタップして予約を切り替えます。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeWeek(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
            >
              {heroIcon.prev}
            </button>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              {`${dates[0]?.label ?? ""} 〜 ${dates[dates.length - 1]?.label ?? ""}`}
            </div>
            <button
              type="button"
              onClick={() => changeWeek(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
            >
              {heroIcon.next}
            </button>
          </div>
        </header>

        <div className="mb-6 flex gap-3">
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
                <div className="flex items-center justify-center border-r border-slate-100 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600">
                  {slot.label.split("\n").map((line) => (
                    <span key={line} className="block leading-tight">
                      {line}
                    </span>
                  ))}
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
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
