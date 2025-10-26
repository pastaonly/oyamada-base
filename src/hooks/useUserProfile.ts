'use client';

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AppUser } from "@/types/user";

type UseUserProfileResult = {
  userProfile: AppUser | null;
  isLoading: boolean;
};

export function useUserProfile(): UseUserProfileResult {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Firebase ログアウト時に即座に状態をリセットする必要があるため同期的に更新
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AppUser>;
        setUserProfile({
          uid: user.uid,
          email: data.email ?? user.email ?? "",
          displayName: data.displayName ?? user.displayName ?? "",
          photoURL: data.photoURL ?? user.photoURL ?? "",
          isAdmin: data.isAdmin ?? false,
          preferredRoom: data.preferredRoom ?? null,
          memberType: data.memberType ?? null,
          contributionSummary: {
            cleaningCount: data.contributionSummary?.cleaningCount ?? 0,
            lastCleaningAt: data.contributionSummary?.lastCleaningAt ?? null,
            weeklyUsageCount: data.contributionSummary?.weeklyUsageCount ?? 0,
          },
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { userProfile, isLoading };
}
