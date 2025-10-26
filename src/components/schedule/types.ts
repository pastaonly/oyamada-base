import type { ReactNode } from "react";
import type { TimeSlotKey } from "@/constants/schedule";

export type ScheduleDate = {
  iso: string;
  label: string;
};

export type RenderCell = (
  isoDate: string,
  slotKey: TimeSlotKey,
  options?: { compact?: boolean },
) => ReactNode;

export type ReadonlyScheduleDates = ReadonlyArray<ScheduleDate>;
