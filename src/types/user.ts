import type { SpaceKey } from "@/constants/schedule";

export type MemberType = "adult" | "child" | "guest" | "other" | null;

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  nickname: string;
  bio: string;
  photoURL: string;
  isAdmin: boolean;
  preferredRoom: SpaceKey | null;
  memberType: MemberType;
  contributionSummary: {
    cleaningCount: number;
    lastCleaningAt: string | null;
    weeklyUsageCount: number;
  };
}
