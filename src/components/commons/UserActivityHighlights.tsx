'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ActivityIconBadge } from "@/components/commons/ActivityIconBadge";
import { fetchActivityLogs } from "@/services/commons";
import type { ActivityLog } from "@/types/commons";
import { formatJapaneseMonthDay } from "@/utils/date";

type UserActivityHighlightsProps = {
  userId: string;
  limit?: number;
  onNavigate?: () => void;
};

export function UserActivityHighlights({
  userId,
  limit = 3,
  onNavigate,
}: UserActivityHighlightsProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    startTransition(() => {
      setIsLoading(true);
      setError(null);
    });
    fetchActivityLogs({ limitCount: limit, userId })
      .then(({ logs }) => {
        if (!mounted) {
          return;
        }
        startTransition(() => {
          setActivities(logs);
        });
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        const message = err instanceof Error ? err.message : "アクティビティの取得に失敗しました";
        startTransition(() => {
          setError(message);
        });
      })
      .finally(() => {
        if (mounted) {
          startTransition(() => {
            setIsLoading(false);
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [userId, limit]);

  const handleNavigate = useCallback(() => {
    router.push(`/commons?user=${encodeURIComponent(userId)}`);
    onNavigate?.();
  }, [onNavigate, router, userId]);

  const body = useMemo(() => {
    if (isLoading) {
      return <p className="text-sm text-slate-500">読み込み中...</p>;
    }
    if (error) {
      return <p className="text-sm text-rose-600">{error}</p>;
    }
    if (activities.length === 0) {
      return <p className="text-sm text-slate-500">最近のアクティビティはまだありません。</p>;
    }
    return (
      <ul className="space-y-3">
        {activities.map((activity) => (
          <li key={activity.id}>
            <button
              type="button"
              onClick={handleNavigate}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <ActivityIconBadge iconId={activity.definitionIconId} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activity.definitionTitle}</p>
                  <p className="text-xs text-slate-500">
                    {activity.optionLabels.join(" / ") || "詳細なし"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {formatJapaneseMonthDay(activity.executedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }, [activities, error, handleNavigate, isLoading]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">最近のアクティビティ</h4>
        <button
          type="button"
          onClick={handleNavigate}
          className={clsx(
            "rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:border-blue-300",
            activities.length === 0 && "opacity-60",
          )}
        >
          一覧で見る
        </button>
      </div>
      <div className="mt-3">{body}</div>
    </section>
  );
}
