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
    { href: "/commons", label: "コモンズ" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="group inline-flex items-center justify-center"
              aria-label="おやまだいベース ホーム"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-purple-500 via-fuchsia-500 to-rose-500 text-center text-[10px] font-semibold leading-[1.1] text-white shadow-sm ring-1 ring-white/40 transition group-hover:translate-y-[1px] group-hover:shadow-none sm:h-14 sm:w-14">
                {"おやま"}
                <br/>
                {"だい"}
                <br/>
                {"ベース"}
              </span>
            </Link>
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
