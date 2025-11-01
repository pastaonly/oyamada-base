'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import clsx from "clsx";
import { ActivityIconBadge } from "@/components/commons/ActivityIconBadge";
import { COMMONS_ICON_OPTIONS, type ActivityIconId } from "@/constants/commons";
import { generateActivityOptionId } from "@/services/commons";
import type { ActivityDefinition, ActivityOption } from "@/types/commons";

type ActivityDefinitionEditorFormProps = {
  initialValue?: ActivityDefinition | null;
  onSubmit: (input: {
    title: string;
    iconId: ActivityIconId | string;
    options: ActivityOption[];
    isActive: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  submitting?: boolean;
  errorMessage?: string | null;
};

function normalizeIconId(value: ActivityIconId | string | null | undefined): ActivityIconId | "" {
  if (!value) {
    return "";
  }
  const exists = COMMONS_ICON_OPTIONS.some((option) => option.id === value);
  return exists ? (value as ActivityIconId) : "";
}

export function ActivityDefinitionEditorForm({
  initialValue,
  onSubmit,
  onCancel,
  submitLabel,
  submitting = false,
  errorMessage,
}: ActivityDefinitionEditorFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [iconId, setIconId] = useState<ActivityIconId | "">(
    normalizeIconId(initialValue?.iconId),
  );
  const [options, setOptions] = useState<ActivityOption[]>(initialValue?.options ?? []);
  const [isActive, setIsActive] = useState(initialValue?.isActive ?? true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
    setLocalError(null);
  };

  const handleIconChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setIconId(event.target.value as ActivityIconId | "");
    setLocalError(null);
  };

  const handleOptionLabelChange = (optionId: string, label: string) => {
    setOptions((prev) =>
      prev.map((option) => (option.id === optionId ? { ...option, label } : option)),
    );
    setLocalError(null);
  };

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        id: generateActivityOptionId(),
        label: "",
      },
    ]);
  };

  const handleRemoveOption = (optionId: string) => {
    setOptions((prev) => prev.filter((option) => option.id !== optionId));
  };

  const handleMoveOption = (optionId: string, direction: -1 | 1) => {
    setOptions((prev) => {
      const index = prev.findIndex((option) => option.id === optionId);
      if (index < 0) {
        return prev;
      }
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, removed);
      return copy;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setLocalError("タイトルを入力してください");
      return;
    }
    if (!iconId) {
      setLocalError("アイコンを選択してください");
      return;
    }
    const normalizedOptions = options
      .map((option) => ({
        id: option.id,
        label: option.label.trim(),
      }))
      .filter((option) => option.label.length > 0);
    await onSubmit({
      title: trimmedTitle,
      iconId,
      options: normalizedOptions,
      isActive,
    });
  };

  const iconPreview = useMemo(
    () => (iconId ? <ActivityIconBadge iconId={iconId} /> : null),
    [iconId],
  );

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="例: 掃除"
          disabled={submitting}
        />
      </div>

      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          アイコン
          {iconPreview}
        </label>
        <select
          value={iconId}
          onChange={handleIconChange}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          disabled={submitting}
        >
          <option value="">選択してください</option>
          {COMMONS_ICON_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            オプション <span className="text-xs font-normal text-slate-400">(任意)</span>
          </span>
          <button
            type="button"
            onClick={handleAddOption}
            className="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:border-blue-300"
            disabled={submitting}
          >
            追加
          </button>
        </div>
        {options.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            オプションを使わない場合はこのままで保存できます。必要なら「追加」から項目を作成してください。
          </p>
        ) : (
          <div className="grid gap-2">
            {options.map((option, index) => (
              <div
                key={option.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <input
                  type="text"
                  value={option.label}
                  onChange={(event) => handleOptionLabelChange(option.id, event.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="例: リビング"
                  disabled={submitting}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveOption(option.id, -1)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40"
                    disabled={submitting || index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOption(option.id, 1)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40"
                    disabled={submitting || index === options.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(option.id)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600 hover:border-rose-300 disabled:opacity-40"
                    disabled={submitting}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={submitting}
        />
        利用可能 (アクティビティ作成で選択できる)
      </label>

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
            "rounded-full px-5 py-2 text-sm font-semibold text-white",
            submitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700",
          )}
          disabled={submitting}
        >
          {submitting ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
