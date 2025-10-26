'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserProfileBadge } from "@/components/profile/UserProfileBadge";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "ホーム" },
    { href: "/members", label: "メンバー" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Oyamadai Base
              </p>
              <h1 className="text-lg font-semibold text-slate-900">会員アプリ</h1>
            </div>
            <nav className="flex items-center gap-2 text-sm text-slate-600">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1 transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <UserProfileBadge />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-5 sm:py-10">{children}</main>
    </div>
  );
}
