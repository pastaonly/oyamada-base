'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import type { AppUser } from "@/types/user";
import type { ActivityDefinition, ActivityLog } from "@/types/commons";
import { ActivityForm } from "@/components/commons/ActivityForm";
import { updateActivityLog } from "@/services/commons";
import { formatISODate } from "@/utils/date";

type ActivityEditorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  log: ActivityLog;
  definitions: ActivityDefinition[];
  currentUser: AppUser;
  onUpdated?: () => void;
};

export function ActivityEditorDialog({
  isOpen,
  onClose,
  log,
  definitions,
  currentUser,
  onUpdated,
}: ActivityEditorDialogProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isMounted || !isOpen) {
    return null;
  }

  const handleSubmit = async (values: {
    definitionId: string;
    optionIds: string[];
    note: string;
    executedAt: string;
    photoFile: File | null;
    removePhoto: boolean;
  }) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateActivityLog({
        logId: log.id,
        input: {
          optionIds: values.optionIds,
          note: values.note,
          executedAt: new Date(values.executedAt),
          photoFile: values.photoFile,
          removePhoto: values.removePhoto,
        },
        user: currentUser,
      });
      onUpdated?.();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "アクティビティの更新に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">アクティビティを編集</h2>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              "rounded-full border px-3 py-1 text-sm font-medium transition",
              isSaving
                ? "border-slate-200 text-slate-300"
                : "border-slate-300 text-slate-600 hover:border-slate-400",
            )}
            disabled={isSaving}
          >
            閉じる
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ActivityForm
            key={log.id}
            definitions={definitions}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel="更新する"
            submitting={isSaving}
            errorMessage={errorMessage}
            initialValues={{
              definitionId: log.definitionId,
              optionIds: log.optionIds,
              note: log.note,
              executedAt: formatISODate(log.executedAt),
              existingPhoto: log.photo,
            }}
            lockDefinition
          />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
