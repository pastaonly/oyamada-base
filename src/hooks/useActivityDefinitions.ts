'use client';

import { useEffect, useState } from "react";
import type { ActivityDefinition } from "@/types/commons";
import { subscribeActivityDefinitions } from "@/services/commons";

export function useActivityDefinitions() {
  const [definitions, setDefinitions] = useState<ActivityDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeActivityDefinitions(
      (list) => {
        setDefinitions(list);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        const message = err instanceof Error ? err : new Error("アクティビティの取得に失敗しました");
        setError(message instanceof Error ? message : new Error(String(message)));
        setDefinitions([]);
        setIsLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  return { definitions, isLoading, error };
}
