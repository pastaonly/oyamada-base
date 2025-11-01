'use client';

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityComposer } from "@/components/commons/ActivityComposer";
import { ActivityTimeline } from "@/components/commons/ActivityTimeline";
import { ActivityDefinitionManagerDialog } from "@/components/commons/ActivityDefinitionManagerDialog";
import { useActivityDefinitions } from "@/hooks/useActivityDefinitions";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function CommonsPage() {
  const searchParams = useSearchParams();
  const initialUserFilter = searchParams.get("user");
  const { userProfile } = useUserProfile();
  const { definitions, isLoading, error } = useActivityDefinitions();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          読み込み中...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-600 shadow-sm">
          アクティビティ定義を取得できませんでした。ログイン状態と権限を確認してください。
        </div>
      );
    }

    return (
      <ActivityComposer definitions={definitions} user={userProfile} onCreated={handleRefresh}>
        {({ onOpen, disabled, statusMessage }) => (
          <ActivityTimeline
            definitions={definitions}
            currentUser={userProfile}
            refreshKey={refreshKey}
            initialUserFilter={initialUserFilter}
            onRequireReload={handleRefresh}
            triggerButton={
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={disabled}
                >
                  新規登録
                </button>
                {statusMessage && (
                  <p className="text-xs text-slate-500">{statusMessage}</p>
                )}
              </div>
            }
          />
        )}
      </ActivityComposer>
    );
  }, [definitions, isLoading, error, userProfile, refreshKey, initialUserFilter, handleRefresh]);

  return (
    <div className="grid gap-10">
      {content}
      {userProfile?.isAdmin && (
        <ActivityDefinitionManagerDialog
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
          definitions={definitions}
        />
      )}
    </div>
  );
}
