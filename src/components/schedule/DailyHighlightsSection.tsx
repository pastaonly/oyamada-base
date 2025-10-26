'use client';

import { Avatar } from "@/components/common/Avatar";
import { SPACES, type TimeSlotKey } from "@/constants/schedule";
import type { ReservationRecord } from "@/services/reservations";

export type HighlightedUser = {
  userId: string;
  userName: string;
  userAvatarUrl: string;
  reservations: ReservationRecord[];
};

type DailyHighlightsSectionProps = {
  title: string;
  emptyMessage: string;
  highlightLabel: string;
  users: HighlightedUser[];
  selectedUserId: string | null;
  onToggleSelect: (userId: string) => void;
  getInitial: (name: string) => string;
  getTimeSlotShortLabel: (slotKey: TimeSlotKey) => string;
  layout?: "between" | "center";
};

export function DailyHighlightsSection({
  title,
  emptyMessage,
  highlightLabel,
  users,
  selectedUserId,
  onToggleSelect,
  getInitial,
  getTimeSlotShortLabel,
  layout = "between",
}: DailyHighlightsSectionProps) {
  const justifyClass = layout === "center" ? "sm:justify-center" : "sm:justify-between";
  const selectedUser = selectedUserId
    ? users.find((user) => user.userId === selectedUserId) ?? null
    : null;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm sm:flex sm:flex-col ${justifyClass}`}
    >
      <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {users.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          users.map((user) => (
            <button
              key={user.userId}
              type="button"
              onClick={() => onToggleSelect(user.userId)}
              className={`relative rounded-full transition ${
                selectedUserId === user.userId
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

      {selectedUser && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
          <p className="text-sm font-medium text-blue-900">
            {selectedUser.userName} {highlightLabel}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedUser.reservations.map((item) => (
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
  );
}
