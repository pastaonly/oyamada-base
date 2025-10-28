'use client';

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import type { AppUser } from "@/types/user";
import { updateUserAvatar, updateUserProfileDetails } from "@/services/profile";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { Avatar } from "@/components/common/Avatar";

type ProfileEditorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
};

const MARKDOWN_PLACEHOLDER = `# 自己紹介
- 好きなこと
- 得意なこと

[Webサイト](https://example.com)

![写真](https://placehold.co/400x200)`;

export function ProfileEditorDialog({ isOpen, onClose, user }: ProfileEditorDialogProps) {
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return () => undefined;
  }, [isOpen, isMounted]);

  useEffect(() => {
    if (isOpen) {
      setNickname(user.nickname ?? "");
      setBio(user.bio ?? "");
      setErrorMessage(null);
      setAvatarError(null);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen, user.nickname, user.bio]);

  const previewContent = useMemo(
    () => (bio.trim().length > 0 ? bio : MARKDOWN_PLACEHOLDER),
    [bio],
  );

  useEffect(() => {
    if (!selectedFile) {
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleAvatarButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAvatarError("画像ファイルを選択してください");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("2MB 以下の画像を選択してください");
      event.target.value = "";
      return;
    }
    setAvatarError(null);
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length === 0) {
      setErrorMessage("ニックネームを入力してください");
      return;
    }
    if (trimmedNickname.length > 40) {
      setErrorMessage("ニックネームは40文字以内で入力してください");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setAvatarError(null);

    try {
      if (selectedFile) {
        await updateUserAvatar(selectedFile, user);
      }
      await updateUserProfileDetails({
        user,
        nickname: trimmedNickname,
        bio,
      });
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "プロフィールの更新に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleClose = useCallback(() => {
    if (!isSaving) {
      onClose();
    }
  }, [isSaving, onClose]);

  if (!isMounted || !isOpen) {
    return null;
  }

  const displayName = nickname || user.displayName || user.email;
  const avatarSrc = previewUrl ?? user.photoURL ?? undefined;
  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 py-6 sm:py-8"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={handleDialogClick}
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">プロフィール編集</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              disabled={isSaving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="profile-editor-form"
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-semibold text-white shadow",
                isSaving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700",
              )}
              disabled={isSaving}
            >
              {isSaving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="profile-editor-form" onSubmit={handleSubmit} className="grid gap-6 pb-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Avatar src={avatarSrc} fallback={displayName} size={84} title={displayName} />
              <div className="flex flex-col gap-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">プロフィール画像（最大2MB）</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAvatarButtonClick}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
                    disabled={isSaving}
                  >
                    画像を選択
                  </button>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-red-300 hover:text-red-500"
                      disabled={isSaving}
                    >
                      クリア
                    </button>
                  )}
                </div>
                {avatarError && <span className="text-xs text-red-500">{avatarError}</span>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">ニックネーム</span>
              <input
                type="text"
                maxLength={80}
                value={nickname}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNickname(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none"
                placeholder="例：尾山太郎"
                disabled={isSaving}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                自己紹介（Markdown対応）
              </span>
              <textarea
                value={bio}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setBio(event.target.value)}
                rows={8}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none"
                placeholder={MARKDOWN_PLACEHOLDER}
                disabled={isSaving}
              />
              <span className="text-xs text-slate-400">
                見出し・リンク・画像（URL）などが利用できます。
              </span>
            </label>
            {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}
          </form>
          <div className="grid gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-5 text-sm text-slate-700">
            <h3 className="text-sm font-semibold text-slate-700">プレビュー</h3>
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-700">
              <MarkdownContent content={previewContent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
