'use client';

import Image from "next/image";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import clsx from "clsx";
import { ActivityIconBadge } from "@/components/commons/ActivityIconBadge";
import type { ActivityDefinition, ActivityOption, ActivityPhotoInfo } from "@/types/commons";
import { formatISODate } from "@/utils/date";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic"];
const MAX_FILE_SIZE_MB = 8;

export type ActivityFormValues = {
  definitionId: string;
  optionIds: string[];
  note: string;
  executedAt: string;
  photoFile: File | null;
  removePhoto: boolean;
};

export type ActivityFormInitialValues = Partial<ActivityFormValues> & {
  executedAt?: string;
  existingPhoto?: ActivityPhotoInfo | null;
};

type ActivityFormProps = {
  definitions: ActivityDefinition[];
  onSubmit: (values: ActivityFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  submitting?: boolean;
  errorMessage?: string | null;
  initialValues?: ActivityFormInitialValues;
  lockDefinition?: boolean;
};

function getDefaultExecutedAt() {
  return formatISODate(new Date());
}

function normalizeFileType(file: File): string {
  if (file.type) {
    return file.type;
  }
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".heic")) {
    return "image/heic";
  }
  if (lowerName.endsWith(".png")) {
    return "image/png";
  }
  return "image/jpeg";
}

export function ActivityForm({
  definitions,
  onSubmit,
  onCancel,
  submitLabel,
  submitting = false,
  errorMessage,
  initialValues,
  lockDefinition = false,
}: ActivityFormProps) {
  const [definitionId, setDefinitionId] = useState(initialValues?.definitionId ?? "");
  const [optionIds, setOptionIds] = useState<string[]>(initialValues?.optionIds ?? []);
  const [note, setNote] = useState(initialValues?.note ?? "");
  const [executedAt, setExecutedAt] = useState(
    initialValues?.executedAt ?? getDefaultExecutedAt(),
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(initialValues?.removePhoto ?? false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedDefinition = useMemo(
    () => definitions.find((definition) => definition.id === definitionId) ?? null,
    [definitions, definitionId],
  );

  const availableOptions: ActivityOption[] = selectedDefinition?.options ?? [];
  const hasOptions = availableOptions.length > 0;

  const existingPhoto = initialValues?.existingPhoto ?? null;

  const photoPreviewUrl = useMemo(() => {
    if (!photoFile) {
      return null;
    }
    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    if (!photoPreviewUrl) {
      return undefined;
    }
    return () => {
      URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const handleDefinitionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDefinitionId = event.target.value;
    setDefinitionId(nextDefinitionId);
    setOptionIds([]);
    setLocalError(null);
  };

  const handleOptionToggle = (optionId: string) => {
    setOptionIds((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      return [...prev, optionId];
    });
    setLocalError(null);
  };

  const handleExecutedAtChange = (event: ChangeEvent<HTMLInputElement>) => {
    setExecutedAt(event.target.value);
    setLocalError(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const normalizedType = normalizeFileType(file);
    if (!ACCEPTED_TYPES.includes(normalizedType)) {
      setLocalError("JPEG / PNG / HEIC の画像を選択してください");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setLocalError(`${MAX_FILE_SIZE_MB}MB 以下の画像を選択してください`);
      event.target.value = "";
      return;
    }
    setPhotoFile(file);
    setRemovePhoto(false);
    setLocalError(null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setRemovePhoto(true);
    setLocalError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!definitionId) {
      setLocalError("アクティビティを選択してください");
      return;
    }
    if (hasOptions && optionIds.length === 0) {
      setLocalError("オプションを1つ以上選択してください");
      return;
    }
    if (!executedAt) {
      setLocalError("実施日を選択してください");
      return;
    }

    const executedDate = new Date(executedAt);
    if (Number.isNaN(executedDate.getTime())) {
      setLocalError("実施日の形式が正しくありません");
      return;
    }

    const shouldRemovePhoto =
      existingPhoto !== null ? removePhoto && !photoFile : false;

    await onSubmit({
      definitionId,
      optionIds,
      note,
      executedAt,
      photoFile,
      removePhoto: shouldRemovePhoto,
    });
  };

  const showExistingPhoto = existingPhoto && !photoFile && !removePhoto;

  return (
    <form className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="activity-definition" className="flex items-center gap-2 text-sm font-medium text-slate-700">
          アクティビティ
          {definitionId && <ActivityIconBadge iconId={selectedDefinition?.iconId ?? null} size="sm" />}
        </label>
        <select
          id="activity-definition"
          value={definitionId}
          onChange={handleDefinitionChange}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          disabled={submitting || lockDefinition}
        >
          <option value="">選択してください</option>
          {definitions.map((definition) => (
            <option key={definition.id} value={definition.id}>
              {definition.title}
            </option>
          ))}
        </select>
      </div>

      {hasOptions ? (
        <div>
          <div className="text-sm font-medium text-slate-700">オプション</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableOptions.map((option) => {
              const checked = optionIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionToggle(option.id)}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-sm transition",
                    checked
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-slate-300 bg-white text-slate-600 hover:border-blue-300",
                  )}
                  disabled={submitting}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm font-medium text-slate-700">オプション</div>
          <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            このアクティビティにはオプションはありません。
          </p>
        </div>
      )}

  <div className="grid gap-2">
        <label htmlFor="activity-executedAt" className="text-sm font-medium text-slate-700">
          実施日
        </label>
        <input
          id="activity-executedAt"
          type="date"
          value={executedAt}
          onChange={handleExecutedAtChange}
          max={getDefaultExecutedAt()}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          disabled={submitting}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="activity-note" className="text-sm font-medium text-slate-700">
          備考
        </label>
        <textarea
          id="activity-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="どんなことをしたかメモしましょう"
          disabled={submitting}
        />
      </div>

      <div className="grid gap-3">
        <label className="text-sm font-medium text-slate-700">写真 (1枚まで)</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-blue-400 hover:text-blue-600">
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
              disabled={submitting}
            />
            画像を選択
          </label>
          {photoPreviewUrl && (
            <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200">
              <Image
                src={photoPreviewUrl}
                alt="選択した写真"
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            </div>
          )}
          {showExistingPhoto && (
            <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200">
              <Image
                src={existingPhoto.thumbnailUrl}
                alt="登録済みの写真"
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            </div>
          )}
          {(photoPreviewUrl || showExistingPhoto) && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
              disabled={submitting}
            >
              写真を削除
            </button>
          )}
          {!photoPreviewUrl && !showExistingPhoto && (
            <p className="text-xs text-slate-500">JPEG / PNG / HEIC (最大 {MAX_FILE_SIZE_MB}MB)</p>
          )}
        </div>
      </div>

      {(localError || errorMessage) && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {localError || errorMessage}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400"
            disabled={submitting}
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          className={clsx(
            "rounded-full px-5 py-2 text-sm font-semibold text-white shadow",
            submitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700",
          )}
          disabled={submitting}
        >
          {submitting ? "送信中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
