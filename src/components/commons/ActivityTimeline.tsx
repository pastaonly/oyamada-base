'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMemberDirectory } from "@/hooks/useMemberDirectory";
import { fetchActivityLogs, type ActivityLogCursor } from "@/services/commons";
import type { ActivityDefinition, ActivityLog } from "@/types/commons";
import type { AppUser } from "@/types/user";
import { ActivityCard } from "@/components/commons/ActivityTimelineCard";

const PAGE_SIZE = 10;

type ActivityTimelineProps = {
  currentUser: AppUser | null;
  refreshKey: number;
  initialUserFilter?: string | null;
  onRequireReload?: () => void;
  definitions: ActivityDefinition[];
};

export function ActivityTimeline({
  currentUser,
  refreshKey,
  initialUserFilter = null,
  onRequireReload,
  definitions,
}: ActivityTimelineProps) {
  const { members } = useMemberDirectory();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserFilter);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [cursor, setCursor] = useState<ActivityLogCursor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const memberOptions = useMemo(
    () =>
      [{ uid: "", nickname: "すべて", displayName: "", photoURL: "" }, ...members].map((member) => ({
        value: member.uid,
        label: member.nickname || member.displayName || "",
        photoURL: member.photoURL,
      })),
    [members],
  );

  const loadInitial = useCallback(
    async (userId: string | null) => {
      startTransition(() => {
        setIsLoading(true);
      });
      const { logs: fetchedLogs, nextCursor } = await fetchActivityLogs({
        limitCount: PAGE_SIZE,
        userId,
      });
      startTransition(() => {
        setLogs(fetchedLogs);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
        setIsLoading(false);
      });
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMore || !cursor) {
      return;
    }
    startTransition(() => {
      setIsFetchingMore(true);
    });
    const { logs: fetchedLogs, nextCursor } = await fetchActivityLogs({
      limitCount: PAGE_SIZE,
      cursor,
      userId: selectedUserId,
    });
    startTransition(() => {
      setLogs((prev) => [...prev, ...fetchedLogs]);
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
      setIsFetchingMore(false);
    });
  }, [cursor, hasMore, isFetchingMore, selectedUserId]);

  const handleRefresh = useCallback(() => {
    loadInitial(selectedUserId);
  }, [loadInitial, selectedUserId]);

  useEffect(() => {
    loadInitial(selectedUserId);
  }, [loadInitial, selectedUserId, refreshKey]);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        loadMore().catch(() => {
          /* noop */
        });
      }
    });
    observerRef.current.observe(sentinelRef.current);
    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadMore, logs]);

  const handleUserFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedUserId(value === "" ? null : value);
  };

  const handleLogDeleted = (logId: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== logId));
  };

  const handleRequestReload = () => {
    if (onRequireReload) {
      onRequireReload();
    } else {
      handleRefresh();
    }
  };

  return (
    <section className="mt-10 grid gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">アクティビティタイムライン</h2>
          <p className="text-sm text-slate-500">メンバーの投稿をタイムラインで確認できます</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="timeline-user-filter" className="text-sm text-slate-500">
            メンバーで絞り込み
          </label>
          <select
            id="timeline-user-filter"
            value={selectedUserId ?? ""}
            onChange={handleUserFilterChange}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {memberOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label || "名前未設定"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          読み込み中...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          まだアクティビティが投稿されていません。
        </div>
      ) : (
        <div className="grid gap-5">
          {logs.map((log) => (
            <ActivityCard
              key={log.id}
              log={log}
              currentUser={currentUser}
              onDeleted={handleLogDeleted}
              onRequestReload={handleRequestReload}
              definitions={definitions}
            />
          ))}
          <div ref={sentinelRef} />
          {isFetchingMore && (
            <div className="text-center text-sm text-slate-500">読み込み中...</div>
          )}
          {!hasMore && (
            <div className="text-center text-xs text-slate-400">過去の投稿は以上です</div>
          )}
        </div>
      )}
    </section>
  );
}
