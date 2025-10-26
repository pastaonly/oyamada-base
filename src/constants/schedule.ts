export type SpaceKey = "front" | "back" | "living";

export const SPACES: Record<SpaceKey, { label: string }> = {
  front: { label: "手前の部屋" },
  back: { label: "奥の部屋" },
  living: { label: "リビング" },
};

export const TIME_SLOTS = [
  { key: "morning", label: "午前" },
  { key: "afternoon1", label: "午後1\n(13:00-16:00)" },
  { key: "afternoon2", label: "午後2\n(16:00-19:00)" },
  { key: "night", label: "夜" },
] as const;

export type TimeSlotKey = (typeof TIME_SLOTS)[number]["key"];
