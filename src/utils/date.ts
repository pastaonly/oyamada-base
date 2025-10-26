export type ISODateString = `${number}-${number}-${number}`;

export function startOfWeek(date: Date): Date {
  const cloned = new Date(date);
  const day = cloned.getDay(); // 0 (Sunday) - 6
  const diff = cloned.getDate() - day;
  cloned.setDate(diff);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}

export function addDays(base: Date, amount: number): Date {
  const result = new Date(base);
  result.setDate(base.getDate() + amount);
  return result;
}

export function formatISODate(date: Date): ISODateString {
  return date.toISOString().split("T")[0] as ISODateString;
}

export function formatDisplayDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  return formatter.format(date);
}

