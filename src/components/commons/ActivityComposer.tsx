'use client';

import { useMemo, useState } from "react";
import type { AppUser } from "@/types/user";
import { ActivityForm, type ActivityFormValues } from "@/components/commons/ActivityForm";
import type { ActivityDefinition } from "@/types/commons";
import { createActivityLog } from "@/services/commons";
import { formatISODate } from "@/utils/date";

type ActivityComposerProps = {
  definitions: ActivityDefinition[];
  user: AppUser | null;
  onCreated?: () => void;
};

export function ActivityComposer({ definitions, user, onCreated }: ActivityComposerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const activeDefinitions = useMemo(
    () => definitions.filter((definition) => definition.isActive),
    [definitions],
  );

  const initialValues = {
    definitionId: "",
    optionIds: [] as string[],
    note: "",
    executedAt: formatISODate(new Date()),
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

      setFormKey((prev) => prev + 1);
      onCreated?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "アクティビティの記録に失敗しました";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        アクティビティを記録するにはログインが必要です。
      </div>
    );
  }

  if (activeDefinitions.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700 shadow-sm">
        利用可能なアクティビティがまだ登録されていません。管理者に登録を依頼してください。
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold text-slate-900">アクティビティを記録</h2>
      <ActivityForm
        key={formKey}
        definitions={activeDefinitions}
        onSubmit={handleSubmit}
        submitLabel="記録する"
        submitting={isSaving}
        errorMessage={errorMessage}
        initialValues={initialValues}
      />
    </div>
  );
}
