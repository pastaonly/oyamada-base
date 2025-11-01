'use client';

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export type MemberSummary = {
  uid: string;
  displayName: string;
  nickname: string;
  photoURL: string;
};

export function useMemberDirectory() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("nickname", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: MemberSummary[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Partial<MemberSummary & { photoURL?: string }>;
        const nickname = typeof data.nickname === "string" && data.nickname.trim()
          ? data.nickname.trim()
          : typeof data.displayName === "string" && data.displayName.trim()
            ? data.displayName.trim()
            : "";
        const photoURL = typeof data.photoURL === "string" ? data.photoURL : "";
        const displayName =
          typeof data.displayName === "string" && data.displayName.trim()
            ? data.displayName.trim()
            : nickname;
        return {
          uid: docSnap.id,
          displayName,
          nickname: nickname || displayName || "",
          photoURL,
        };
      });
      setMembers(list);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { members, isLoading };
}
