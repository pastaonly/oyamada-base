'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ActivityDefinitionEditorForm } from "@/components/commons/ActivityDefinitionEditorForm";
import { ActivityIconBadge } from "@/components/commons/ActivityIconBadge";
import {
  createActivityDefinition,
  deleteActivityDefinition,
  updateActivityDefinition,
} from "@/services/commons";
import type { ActivityDefinition } from "@/types/commons";

type ActivityDefinitionManagerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  definitions: ActivityDefinition[];
};

type Mode = "list" | "create" | "edit";

export function ActivityDefinitionManagerDialog({
  isOpen,
  onClose,
  definitions,
}: ActivityDefinitionManagerDialogProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [editingDefinition, setEditingDefinition] = useState<ActivityDefinition | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMode("list");
      setEditingDefinition(null);
      setMessage(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isMounted || !isOpen) {
    return null;
  }

  const handleCreate = async (input: Parameters<typeof createActivityDefinition>[0]) => {
    setIsProcessing(true);
    setMessage(null);
    try {
      await createActivityDefinition(input);
      setMode("list");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "アクティビティの作成に失敗しました";
      setMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async (input: Parameters<typeof updateActivityDefinition>[1]) => {
    if (!editingDefinition) {
      return;
    }
    setIsProcessing(true);
    setMessage(null);
    try {
      await updateActivityDefinition(editingDefinition.id, input);
      setMode("list");
      setEditingDefinition(null);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "アクティビティの更新に失敗しました";
      setMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (definition: ActivityDefinition) => {
    setIsProcessing(true);
    setMessage(null);
    try {
      await updateActivityDefinition(definition.id, { isActive: !definition.isActive });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "ステータスの更新に失敗しました";
      setMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (definition: ActivityDefinition) => {
    const confirmed = window.confirm(
      `「${definition.title}」と関連するアクティビティ記録をすべて削除しますか？この操作は取り消せません。`,
    );
    if (!confirmed) {
      return;
    }
    setIsProcessing(true);
    setMessage(null);
    try {
      await deleteActivityDefinition(definition.id);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "アクティビティの削除に失敗しました";
      setMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) {
      return;
    }
    onClose();
  };

  const title =
    mode === "create"
      ? "アクティビティを追加"
      : mode === "edit"
        ? `アクティビティを編集`
        : "アクティビティ管理";

  const content = (
    <div
      className="fixed inset-0 z-[270] flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className={clsx(
              "rounded-full border px-3 py-1 text-sm font-medium transition",
              isProcessing
                ? "border-slate-200 text-slate-300"
                : "border-slate-300 text-slate-600 hover:border-slate-400",
            )}
            disabled={isProcessing}
          >
            閉じる
          </button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-2">
          <section className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                登録済みアクティビティ
              </h3>
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setEditingDefinition(null);
                  setMessage(null);
                }}
                className="rounded-full border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-600 hover:border-blue-300"
                disabled={isProcessing}
              >
                新規追加
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {definitions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  まだアクティビティが登録されていません。
                </div>
              ) : (
                definitions.map((definition) => (
                  <div
                    key={definition.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <ActivityIconBadge iconId={definition.iconId} />
                        <div>
                          <h4 className="text-base font-semibold text-slate-900">
                            {definition.title}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {definition.options.length > 0
                              ? definition.options.map((option) => option.label).join(" / ")
                              : "オプションなし"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={clsx(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          definition.isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {definition.isActive ? "公開中" : "非公開"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDefinition(definition);
                          setMode("edit");
                          setMessage(null);
                        }}
                        className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
                        disabled={isProcessing}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(definition)}
                        className="rounded-full border border-blue-200 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:border-blue-300 disabled:opacity-50"
                        disabled={isProcessing}
                      >
                        {definition.isActive ? "非公開にする" : "公開する"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(definition)}
                        className="rounded-full border border-rose-200 px-4 py-1.5 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-50"
                        disabled={isProcessing}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {message && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{message}</p>
            )}
          </section>

          <section className="min-h-[320px] rounded-2xl border border-slate-200 bg-slate-50 p-5">
            {mode === "list" ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                左の一覧から編集したいアクティビティを選ぶか、「新規追加」を押してください。
              </div>
            ) : mode === "create" ? (
              <ActivityDefinitionEditorForm
                submitLabel="作成する"
                onSubmit={handleCreate}
                onCancel={() => {
                  setMode("list");
                  setEditingDefinition(null);
                  setMessage(null);
                }}
                submitting={isProcessing}
                errorMessage={message}
              />
            ) : editingDefinition ? (
              <ActivityDefinitionEditorForm
                initialValue={editingDefinition}
                submitLabel="更新する"
                onSubmit={handleUpdate}
                onCancel={() => {
                  setMode("list");
                  setEditingDefinition(null);
                  setMessage(null);
                }}
                submitting={isProcessing}
                errorMessage={message}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                編集するアクティビティを選択してください。
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
