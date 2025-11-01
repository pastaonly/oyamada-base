'use client';

import { useMemo, useState } from "react";
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

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

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
      <>
        <ActivityComposer definitions={definitions} user={userProfile} onCreated={handleRefresh} />
        <ActivityTimeline
          definitions={definitions}
          currentUser={userProfile}
          refreshKey={refreshKey}
          initialUserFilter={initialUserFilter}
          onRequireReload={handleRefresh}
        />
      </>
    );
  }, [definitions, isLoading, error, userProfile, refreshKey, initialUserFilter]);

  return (
    <div className="grid gap-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Commons</p>
            <h1 className="text-2xl font-bold text-slate-900">助け合いアクティビティ</h1>
          </div>
          {userProfile?.isAdmin && (
            <button
              type="button"
              onClick={() => setIsManagerOpen(true)}
              className="rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:border-blue-300"
            >
              アクティビティ管理
            </button>
          )}
        </div>
        <p className="text-sm text-slate-600">
          掃除やごみ捨て、差し入れなどの活動を記録して、Thanks!とコメントで気持ちを伝えましょう。
        </p>
      </header>
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
