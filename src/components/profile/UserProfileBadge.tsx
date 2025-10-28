'use client';

import { useEffect, useRef, useState } from "react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleProfileEdit = () => {
    setIsMenuOpen(false);
    setIsDialogOpen(true);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.push("/login");
    } finally {
      setIsSigningOut(false);
      setIsMenuOpen(false);
    }
  };

  if (!user || !userProfile) {
    return null;
  }

  const displayName = userProfile.nickname || userProfile.displayName || userProfile.email;
  const fallback = getInitialFromName(displayName);

  return (
    <>
      <div className="relative flex items-center gap-3">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex flex-col items-center gap-1 rounded-full text-slate-600 transition hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:hidden"
        >
          <Avatar
            src={userProfile.photoURL}
            fallback={fallback}
            size={36}
            title={displayName}
          />
          <span className="text-[11px] font-medium leading-tight">メニュー</span>
        </button>
        <div className="hidden items-center gap-3 sm:flex">
          <Avatar src={userProfile.photoURL} fallback={fallback} size={44} title={displayName} />
          <div className="flex flex-col text-right leading-tight">
            <span className="text-sm font-medium text-slate-700">{displayName}</span>
            <span className="text-xs text-slate-500">{user.email}</span>
          </div>
        </div>
        <div className="hidden flex-col items-end gap-1 sm:flex">
          <button
            type="button"
            onClick={handleProfileEdit}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            プロフィール編集
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 text-sm text-slate-700 shadow-lg ring-1 ring-black/5 sm:hidden"
          >
            <button
              type="button"
              onClick={handleProfileEdit}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-slate-100"
            >
              プロフィール編集
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "ログアウト中..." : "ログアウト"}
            </button>
          </div>
        )}
      </div>
      <ProfileEditorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        user={userProfile}
      />
    </>
  );
}
