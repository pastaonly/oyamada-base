'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AppUser } from "@/types/user";
import {
  ActivityForm,
  type ActivityFormInitialValues,
  type ActivityFormValues,
} from "@/components/commons/ActivityForm";
import type { ActivityDefinition } from "@/types/commons";
import { createActivityLog } from "@/services/commons";
import { formatISODate } from "@/utils/date";

function buildInitialValues(): ActivityFormInitialValues {
  return {
    definitionId: "",
    optionIds: [] as string[],
    note: "",
    executedAt: formatISODate(new Date()),
  };
}

type ActivityComposerProps = {
  definitions: ActivityDefinition[];
  user: AppUser | null;
  onCreated?: () => void;
  children: (props: {
    onOpen: () => void;
    disabled: boolean;
    status: "ready" | "no-user" | "no-definition";
    statusMessage: string | null;
  }) => ReactNode;
};

export function ActivityComposer({ definitions, user, onCreated, children }: ActivityComposerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [initialValues, setInitialValues] = useState<ActivityFormInitialValues>(() =>
    buildInitialValues(),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const activeDefinitions = useMemo(
    () => definitions.filter((definition) => definition.isActive),
    [definitions],
  );

  const composerState = useMemo(() => {
    if (!user) {
      return {
        status: "no-user" as const,
        message: "アクティビティを記録するにはログインが必要です。",
      };
    }
    if (activeDefinitions.length === 0) {
      return {
        status: "no-definition" as const,
        message: "利用可能なアクティビティがまだ登録されていません。管理者に登録を依頼してください。",
      };
    }
    return {
      status: "ready" as const,
      message: null,
    };
  }, [user, activeDefinitions.length]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  const handleOpen = () => {
    setErrorMessage(null);
    setInitialValues(buildInitialValues());
    setFormSeed((prev) => prev + 1);
    setIsModalOpen(true);
  };

  const handleTriggerOpen = () => {
    if (composerState.status !== "ready" || isSaving) {
      return;
    }
    handleOpen();
  };

  const handleClose = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (values: ActivityFormValues) => {
    if (!user) {
      throw new Error("ログイン情報を取得できませんでした");
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await createActivityLog({
        input: {
          definitionId: values.definitionId,
          optionIds: values.optionIds,
          note: values.note,
          executedAt: new Date(values.executedAt),
          photoFile: values.photoFile,
        },
        user,
      });

      setIsModalOpen(false);
      setInitialValues(buildInitialValues());
      setFormSeed((prev) => prev + 1);
      onCreated?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "アクティビティの記録に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {children({
        onOpen: handleTriggerOpen,
        disabled: composerState.status !== "ready" || isSaving,
        status: composerState.status,
        statusMessage: composerState.message,
      })}

      {isMounted && isModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 px-4 py-6"
              role="dialog"
              aria-modal="true"
              onClick={handleClose}
            >
              <div
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">アクティビティを記録</h2>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSaving}
                  >
                    閉じる
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <ActivityForm
                    key={formSeed}
                    definitions={activeDefinitions}
                    onSubmit={handleSubmit}
                    onCancel={handleClose}
                    submitLabel="記録する"
                    submitting={isSaving}
                    errorMessage={errorMessage}
                    initialValues={initialValues}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
