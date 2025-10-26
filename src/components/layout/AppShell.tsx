'use client';

import type { ReactNode } from "react";
import { UserProfileBadge } from "@/components/profile/UserProfileBadge";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
              Oyamadai Base
            </p>
            <h1 className="text-lg font-semibold text-slate-900">会員アプリ</h1>
          </div>
          <UserProfileBadge />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
