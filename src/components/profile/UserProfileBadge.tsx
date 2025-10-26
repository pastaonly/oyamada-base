'use client';

import { useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { updateUserAvatar } from "@/services/profile";
import { Avatar } from "@/components/common/Avatar";

function getInitialFromName(name?: string | null) {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

export function UserProfileBadge() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user || !userProfile) {
    return null;
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("画像ファイルを選択してください");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("2MB 以下の画像を選択してください");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      await updateUserAvatar(file, userProfile);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "画像のアップロードに失敗しました";
      setErrorMessage(message);
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  const displayName = userProfile.displayName || userProfile.email;
  const fallback = getInitialFromName(displayName);

  return (
    <div className="flex items-center gap-3">
      <Avatar src={userProfile.photoURL} fallback={fallback} size={44} title={displayName} />
      <div className="hidden flex-col text-right leading-tight sm:flex">
        <span className="text-sm font-medium text-slate-700">{displayName}</span>
        <span className="text-xs text-slate-500">{user.email}</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isUploading}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "アップロード中..." : "画像変更"}
        </button>
        {errorMessage && (
          <span className="text-xs text-red-500">{errorMessage}</span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
