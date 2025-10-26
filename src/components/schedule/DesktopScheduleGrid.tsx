'use client';

import type { TimeSlotKey } from "@/constants/schedule";
import type { ReadonlyScheduleDates, RenderCell } from "./types";

type TimeSlot = {
  key: TimeSlotKey;
  label: string;
};

type DesktopScheduleGridProps = {
  dates: ReadonlyScheduleDates;
  timeSlots: ReadonlyArray<TimeSlot>;
  isUpdating: boolean;
  onBulkReserve: (slot: TimeSlotKey) => void;
  renderCell: RenderCell;
};

export function DesktopScheduleGrid({
  dates,
  timeSlots,
  isUpdating,
  onBulkReserve,
  renderCell,
}: DesktopScheduleGridProps) {
  return (
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
        {timeSlots.map((slot) => (
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
                onClick={() => onBulkReserve(slot.key)}
                disabled={isUpdating}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                月金利用
              </button>
            </div>
            {dates.map((item) => (
              <div key={`${item.iso}-${slot.key}`} className="border-r border-slate-100 px-2 py-2 last:border-r-0">
                {renderCell(item.iso, slot.key)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
