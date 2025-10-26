'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Avatar } from "@/components/common/Avatar";
import { auth } from "@/lib/firebaseConfig";
import { ProfileEditorDialog } from "./ProfileEditorDialog";

function getInitialFromName(name?: string | null) {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

export function UserProfileBadge() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  if (!user || !userProfile) {
    return null;
  }

  const displayName = userProfile.nickname || userProfile.displayName || userProfile.email;
  const fallback = getInitialFromName(displayName);

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar src={userProfile.photoURL} fallback={fallback} size={44} title={displayName} />
        <div className="hidden flex-col text-right leading-tight sm:flex">
          <span className="text-sm font-medium text-slate-700">{displayName}</span>
          <span className="text-xs text-slate-500">{user.email}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            プロフィール編集
          </button>
          <button
            type="button"
            onClick={async () => {
              if (isSigningOut) return;
              setIsSigningOut(true);
              try {
                await signOut(auth);
                router.push("/login");
              } finally {
                setIsSigningOut(false);
              }
            }}
            disabled={isSigningOut}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>
      </div>
      <ProfileEditorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        user={userProfile}
      />
    </>
  );
}
