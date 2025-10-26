export type ISODateString = `${number}-${number}-${number}`;

export function startOfWeek(date: Date): Date {
  const cloned = new Date(date);
  const day = cloned.getDay(); // 0 (Sunday) - 6 (Saturday)
  const offset = (day + 6) % 7; // Monday becomes 0
  cloned.setDate(cloned.getDate() - offset);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}

export function addDays(base: Date, amount: number): Date {
  const result = new Date(base);
  result.setDate(base.getDate() + amount);
  return result;
}

export function formatISODate(date: Date): ISODateString {
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = tzDate.getFullYear();
  const month = String(tzDate.getMonth() + 1).padStart(2, "0");
  const day = String(tzDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as ISODateString;
}

export function formatDisplayDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  return formatter.format(date);
}

export function formatJapaneseMonthDay(date: Date): string {
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const month = tzDate.getMonth() + 1;
  const day = tzDate.getDate();
  return `${month}月${day}日`;
}
