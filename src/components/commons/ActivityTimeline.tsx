'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  triggerButton?: ReactNode;
};

export function ActivityTimeline({
  currentUser,
  refreshKey,
  initialUserFilter = null,
  onRequireReload,
  definitions,
  triggerButton,
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
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-center">
        {triggerButton}
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
