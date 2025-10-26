'use client';

import type { TimeSlotKey } from "@/constants/schedule";
import type { RenderCell, ScheduleDate } from "./types";

type TimeSlot = {
  key: TimeSlotKey;
  label: string;
};

type MobileScheduleGridProps = {
  dates: ScheduleDate[];
  timeSlots: TimeSlot[];
  isUpdating: boolean;
  onBulkReserve: (slot: TimeSlotKey) => void;
  renderCell: RenderCell;
};

export function MobileScheduleGrid({
  dates,
  timeSlots,
  isUpdating,
  onBulkReserve,
  renderCell,
}: MobileScheduleGridProps) {
  return (
    <div className="sm:hidden">
      <div className="min-w-[360px] rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[64px_repeat(4,_minmax(0,_1fr))] border-b border-slate-100 bg-slate-100/60 text-xs font-medium text-slate-600">
          <div className="flex items-center justify-center border-r border-slate-100 py-1.5 text-slate-700">
            日付
          </div>
          {timeSlots.map((slot) => (
            <div
              key={slot.key}
              className="flex flex-col items-center justify-center gap-1 border-r border-slate-100 px-0.5 py-1 text-center last-border-r-0"
            >
              <span className="text-sm">
                {slot.label.split("\n")[0].replace(/午後1/g, "午後１").replace(/午後2/g, "午後２")}
              </span>
              <button
                type="button"
                onClick={() => onBulkReserve(slot.key)}
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
              {timeSlots.map((slot) => (
                <div key={slot.key} className="border-r border-slate-100 px-0.5 py-1.5 last:border-r-0">
                  {renderCell(item.iso, slot.key, { compact: true })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
